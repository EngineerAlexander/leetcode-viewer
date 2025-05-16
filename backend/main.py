from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sqlite3
import os

app = FastAPI()

# Allow your React app to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "ratings.db"
# Updated SOLUTIONS_DIR to point to the new path
# Resolve to an absolute path to make comparisons more reliable
SOLUTIONS_DIR = Path(__file__).resolve().parent / "../../leetcode/python"

# Create ratings table on startup
@app.on_event("startup")
def init_db():
    # Ensure the target directory for solutions is handled robustly
    # For a linked repository, it\'s better to assume it exists.
    # However, creating the DB file if it\'s not there is fine.
    db_parent_dir = Path(DB_PATH).parent
    if db_parent_dir != Path("."): # If DB_PATH includes a directory
        os.makedirs(db_parent_dir, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS ratings (filename TEXT PRIMARY KEY, rating INTEGER)"
    )
    conn.commit()
    conn.close()
    print(f"Database initialized at {Path(DB_PATH).resolve()}")
    print(f"Solutions will be read from: {SOLUTIONS_DIR.resolve()}")
    if not SOLUTIONS_DIR.exists() or not SOLUTIONS_DIR.is_dir():
        print(f"WARNING: SOLUTIONS_DIR ({SOLUTIONS_DIR.resolve()}) does not exist or is not a directory.")


@app.get("/solutions")
def list_solutions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    files = []
    if not SOLUTIONS_DIR.is_dir():
        print(f"Error: SOLUTIONS_DIR ({SOLUTIONS_DIR.resolve()}) is not a directory or does not exist.")
        conn.close()
        return [] # Return empty list if solutions directory is not valid

    # Use rglob for recursive search
    for file_path in SOLUTIONS_DIR.rglob("*.py"):
        # Store filename as path relative to SOLUTIONS_DIR
        relative_filename = str(file_path.relative_to(SOLUTIONS_DIR))
        cursor.execute("SELECT rating FROM ratings WHERE filename = ?", (relative_filename,))
        row = cursor.fetchone()
        files.append({
            "filename": relative_filename, # Use relative path
            "rating": row[0] if row else None
        })

    conn.close()
    return files

# Use :path to allow slashes in the filename, as it\'s now a relative path
@app.get("/solutions/{filename:path}")
def get_solution(filename: str):
    try:
        full_path = (SOLUTIONS_DIR / filename).resolve(strict=True)
        if not full_path.is_relative_to(SOLUTIONS_DIR.resolve(strict=True)):
             raise ValueError("Attempted path traversal")
    except (ValueError, FileNotFoundError):
        return {"error": "Invalid or non-existent file path."}

    if not full_path.is_file():
        return {"error": "File not found or is not a file"}

    all_lines = full_path.read_text().splitlines()
    
    description_lines = []
    code_block_lines = []
    complexity_lines = []
    
    first_code_line_index = -1
    last_code_line_index = -1

    # Pass 1: Identify description and first code line
    for i, line in enumerate(all_lines):
        stripped_line = line.lstrip()
        if stripped_line.startswith("#"):
            if first_code_line_index == -1: # Still in description phase
                description_lines.append(stripped_line.lstrip("#").lstrip(" "))
            else: # Comment after first code line, potential part of code or later complexity
                pass # Handled in next passes
        elif stripped_line: # Not a comment and not empty
            if first_code_line_index == -1:
                first_code_line_index = i
            # This line is part of the broader code/complexity block
        # Empty lines are ignored for determining first/last code line but preserved based on context

    # If no code lines found, all comments are description, no code, no complexity
    if first_code_line_index == -1:
        code_lines_final = []
        # All non-empty lines were comments, so they are in description_lines
    else:
        # Pass 2: Identify last code line from the block starting at first_code_line_index
        potential_code_and_complexity_lines = all_lines[first_code_line_index:]
        current_last_code_line_block_index = -1
        for i, line in enumerate(potential_code_and_complexity_lines):
            if line.lstrip() and not line.lstrip().startswith("#"):
                current_last_code_line_block_index = i
        
        if current_last_code_line_block_index == -1: # All remaining lines are comments
            code_lines_final = []
            for line in potential_code_and_complexity_lines:
                 # These are comments after where code was expected, treat as complexity if not empty
                 stripped_line = line.lstrip()
                 if stripped_line.startswith("#"):
                    complexity_lines.append(stripped_line.lstrip("#").lstrip(" "))
        else:
            last_code_line_index = first_code_line_index + current_last_code_line_block_index
            code_lines_final = all_lines[first_code_line_index : last_code_line_index + 1]
            
            # Pass 3: Collect complexity lines (comments after the last code line)
            if last_code_line_index + 1 < len(all_lines):
                for line in all_lines[last_code_line_index + 1 :]:
                    stripped_line = line.lstrip()
                    if stripped_line.startswith("#"):
                        complexity_lines.append(stripped_line.lstrip("#").lstrip(" "))
                    # We ignore non-comment lines after the identified code block for complexity

    description = "\n".join(description_lines)
    code = "\n".join(code_lines_final)
    complexity = "\n".join(complexity_lines)

    return {"filename": filename, "description": description, "code": code, "complexity": complexity}

@app.post("/ratings")
def save_rating(data: dict):
    filename = data.get("filename") # filename should be the relative path
    rating = data.get("rating")
    
    if not filename or not isinstance(filename, str) or not isinstance(rating, int) or not (1 <= rating <= 5) :
        return {"error": "Invalid input: filename must be a string, rating an integer between 1-5."}

    # Validate that the filename received corresponds to an actual file within SOLUTIONS_DIR
    try:
        full_path = (SOLUTIONS_DIR / filename).resolve(strict=True)
        if not full_path.is_relative_to(SOLUTIONS_DIR.resolve(strict=True)):
            raise ValueError("Attempted path traversal")
    except (ValueError, FileNotFoundError):
        return {"error": "File to rate does not exist or path is invalid."}

    if not full_path.is_file():
         return {"error": "Target is not a file."}

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT OR REPLACE INTO ratings (filename, rating) VALUES (?, ?)",
        (filename, rating) # filename is already the relative path
    )
    conn.commit()
    conn.close()
    return {"filename": filename, "rating": rating, "message": "Rating saved successfully"}

if __name__ == "__main__":
    import uvicorn
    # This is for running the backend directly for development/testing if needed
    # Ensure SOLUTIONS_DIR is correctly set relative to this script\'s location if run this way.
    # For Docker, the paths are relative to the container\'s /app directory.
    print(f"Starting Uvicorn server. Solutions directory: {SOLUTIONS_DIR.resolve()}")
    uvicorn.run(app, host="0.0.0.0", port=8000)