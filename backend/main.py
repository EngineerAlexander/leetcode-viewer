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

# Note: This is the path to the leetcode directory on my machine.
LEETCODE_DIR = Path(__file__).resolve().parent / "../../leetcode"

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
    print(f"LeetCode directory: {LEETCODE_DIR.resolve()}")
    if not LEETCODE_DIR.exists() or not LEETCODE_DIR.is_dir():
        print(f"WARNING: LEETCODE_DIR ({LEETCODE_DIR.resolve()}) does not exist or is not a directory.")

# Get available languages (top-level folders)
@app.get("/languages")
def get_languages():
    if not LEETCODE_DIR.exists() or not LEETCODE_DIR.is_dir():
        return []
    
    languages = []
    for item in LEETCODE_DIR.iterdir():
        if item.is_dir() and item.name not in ['.git', 'media', '.vscode']:
            languages.append({
                "name": item.name.title(),
                "value": item.name,
                "icon": get_language_icon(item.name)
            })
    
    return languages

def get_language_icon(language: str) -> str:
    """Return appropriate icon for each language"""
    icons = {
        "python": "🐍",
        "typescript": "🔷", 
        "c++": "⚡",
        "rust": "🦀"
    }
    return icons.get(language.lower(), "📁")

# Get all solutions for a specific language
@app.get("/solutions/{language}")
def list_solutions(language: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Validate language directory exists
    language_dir = LEETCODE_DIR / language
    if not language_dir.exists() or not language_dir.is_dir():
        conn.close()
        return {"error": f"Language directory '{language}' not found"}

    files = []
    
    # Determine file extension based on language
    file_extensions = {
        "python": "*.py",
        "typescript": "*.ts",
        "c++": "*.cpp",
        "rust": "*.rs"
    }
    
    extension = file_extensions.get(language.lower(), "*")
    
    # Search for files with appropriate extension
    for file_path in language_dir.rglob(extension):
        relative_filename = str(file_path.relative_to(language_dir))
        cursor.execute("SELECT rating FROM ratings WHERE filename = ?", (relative_filename,))
        row = cursor.fetchone()
        files.append({
            "filename": relative_filename, # Use relative path
            "rating": row[0] if row else None
        })

    conn.close()
    return files

# Get a solution for a specific language
@app.get("/solutions/{language}/{filename:path}")
def get_solution(language: str, filename: str):
    # Validate language directory exists
    language_dir = LEETCODE_DIR / language
    if not language_dir.exists() or not language_dir.is_dir():
        return {"error": f"Language directory '{language}' not found"}

    try:
        full_path = (language_dir / filename).resolve(strict=True)
        if not full_path.is_relative_to(language_dir.resolve(strict=True)):
             raise ValueError("Attempted path traversal")
    except (ValueError, FileNotFoundError):
        return {"error": "Invalid or non-existent file path."}

    if not full_path.is_file():
        return {"error": "File not found or is not a file"}

    all_lines = full_path.read_text().splitlines()
    
    description_lines = []
    code_lines = []
    complexity_lines = []
    
    # Generate source_link from filename
    base_filename_str = Path(filename).name
    file_extensions = {
        "python": ".py",
        "typescript": ".ts", 
        "c++": ".cpp",
        "rust": ".rs"
    }
    
    extension = file_extensions.get(language.lower(), "")
    if base_filename_str.endswith(extension):
        slug = base_filename_str[:-len(extension)] # Remove extension
        source_link = f"https://leetcode.com/problems/{slug}/"
        # Replace hyphens with spaces and properly encode the URL
        search_query = slug.replace('-', ' ') + ' Leetcode'
        youtube_link = f"https://www.youtube.com/results?search_query={search_query.replace(' ', '+')}"
    else:
        source_link = None
        youtube_link = None
    
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
            if first_code_line_index == -1: # This is the first actual code line
                first_code_line_index = i
    
    # If no code lines found (e.g., file is all comments or empty after comments)
    if first_code_line_index == -1:
        code_lines = []
    else:
        # Identify last code line from the block starting at first_code_line_index
        potential_code_and_complexity_lines = all_lines[first_code_line_index:]
        current_last_code_line_block_index = -1
        for idx, line_in_block in enumerate(potential_code_and_complexity_lines):
            if line_in_block.lstrip() and not line_in_block.lstrip().startswith("#"):
                current_last_code_line_block_index = idx
        
        if current_last_code_line_block_index == -1: 
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

    description = "\n".join(description_lines)
    code = "\n".join(code_lines)
    complexity = "\n".join(complexity_lines)

    return {"filename": filename, "description": description, "code": code, "complexity": complexity, "source_link": source_link, "youtube_link": youtube_link}

# post a rating
@app.post("/ratings")
def save_rating(data: dict):
    filename = data.get("filename") # filename should be the relative path
    rating = data.get("rating")
    
    if not filename or not isinstance(filename, str) or not isinstance(rating, int) or not (1 <= rating <= 5) :
        return {"error": "Invalid input: filename must be a string, rating an integer between 1-5."}

    # For now, we'll keep the rating system simple and assume it's for the current language
    # In the future, we might want to include language in the rating key
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
    print(f"Starting Uvicorn server. LeetCode directory: {LEETCODE_DIR.resolve()}")
    uvicorn.run(app, host="0.0.0.0", port=8000)