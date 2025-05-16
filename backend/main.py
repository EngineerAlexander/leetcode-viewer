from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import sqlite3
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "ratings.db"

# Note: This is the path to the solutions directory on my machine.
SOLUTIONS_DIR = Path(__file__).resolve().parent / "../../leetcode/python"

# Startup functions
@app.on_event("startup")
def init_db():
    db_parent_dir = Path(DB_PATH).parent
    if db_parent_dir != Path("."):
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


# Get all solutions
@app.get("/solutions")
def list_solutions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    files = []
    if not SOLUTIONS_DIR.is_dir():
        print(f"Error: SOLUTIONS_DIR ({SOLUTIONS_DIR.resolve()}) is not a directory or does not exist.")
        conn.close()
        return files

    # Search
    for file_path in SOLUTIONS_DIR.rglob("*.py"):
        relative_filename = str(file_path.relative_to(SOLUTIONS_DIR))
        cursor.execute("SELECT rating FROM ratings WHERE filename = ?", (relative_filename,))
        row = cursor.fetchone()
        files.append({
            "filename": relative_filename, # Use relative path
            "rating": row[0] if row else None
        })

    conn.close()
    return files

# Get a solution
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
    code_lines = []
    complexity_lines = []
    
    first_code_line_index = -1
    last_code_line_index = -1

    # Identify description and first code line
    for i, line in enumerate(all_lines):
        stripped_line = line.lstrip()
        if stripped_line.startswith("#"):
            if first_code_line_index == -1:
                description_lines.append(stripped_line.lstrip("#").lstrip(" "))
            else:
                pass
        elif stripped_line:
            if first_code_line_index == -1:
                first_code_line_index = i

    # If no code lines found
    if first_code_line_index == -1:
        code_lines = []
    else:
        # Identify last code line from the block starting at first_code_line_index
        potential_code_and_complexity_lines = all_lines[first_code_line_index:]
        current_last_code_line_block_index = -1
        for i, line in enumerate(potential_code_and_complexity_lines):
            if line.lstrip() and not line.lstrip().startswith("#"):
                current_last_code_line_block_index = i
        
        if current_last_code_line_block_index == -1: # All remaining lines are comments
            code_lines = []
            for line in potential_code_and_complexity_lines:
                 stripped_line = line.lstrip()
                 if stripped_line.startswith("#"):
                    complexity_lines.append(stripped_line.lstrip("#").lstrip(" "))
        else:
            last_code_line_index = first_code_line_index + current_last_code_line_block_index
            code_lines = all_lines[first_code_line_index : last_code_line_index + 1]
            
            # Collect complexity lines (comments after the last code line)
            if last_code_line_index + 1 < len(all_lines):
                for line in all_lines[last_code_line_index + 1 :]:
                    stripped_line = line.lstrip()
                    if stripped_line.startswith("#"):
                        complexity_lines.append(stripped_line.lstrip("#").lstrip(" "))
                    # We ignore non-comment lines after the identified code block for complexity

    description = "\n".join(description_lines)
    code = "\n".join(code_lines)
    complexity = "\n".join(complexity_lines)

    return {"filename": filename, "description": description, "code": code, "complexity": complexity}

# post a rating
@app.post("/ratings")
def save_rating(data: dict):
    filename = data.get("filename") # filename should be the relative path
    rating = data.get("rating")
    
    if not filename or not isinstance(filename, str) or not isinstance(rating, int) or not (1 <= rating <= 5) :
        return {"error": "Invalid input: filename must be a string, rating an integer between 1-5."}

    # Validate filename received
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
    print(f"Starting Uvicorn server. Solutions directory: {SOLUTIONS_DIR.resolve()}")
    uvicorn.run(app, host="0.0.0.0", port=8000)