import subprocess
import sys
import os

def run_cmd(cmd: list[str]) -> tuple[int, str, str]:
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
    return result.returncode, result.stdout.strip(), result.stderr.strip()

def get_current_branch() -> str:
    code, stdout, _ = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    if code != 0 or not stdout:
        return "main"
    return stdout

def get_conventional_message(file_path: str, status_code: str) -> str:
    norm_path = file_path.replace("\\", "/")
    basename = os.path.basename(norm_path)
    dirname = os.path.dirname(norm_path)
    
    action = "update"
    if status_code in ["??", "A"]:
        action = "create"
    elif status_code in ["D"]:
        action = "remove"

    if basename in ["PRD.md", "ARCHITECTURE.md", "RULES.md", "DESIGN.md", "TASK.md", "CONTEXT.md", "README.md"]:
        scope = basename.replace(".md", "").lower()
        return f"docs({scope}): {action} {basename} specification"
    elif "skills/" in norm_path:
        parts = norm_path.split("skills/")[1].split("/")
        skill_name = parts[0]
        return f"feat(skills): {action} {basename} in {skill_name} skill"
    elif norm_path.startswith("api/"):
        return f"feat(api): {action} {basename} backend module"
    elif norm_path.startswith("core/"):
        sub = norm_path.split("/")[1] if len(norm_path.split("/")) > 1 else "core"
        return f"feat({sub}): {action} {basename}"
    elif norm_path.startswith("frontend/"):
        return f"feat(ui): {action} {basename} frontend component"
    elif norm_path.startswith("storage/"):
        return f"chore(storage): {action} {basename} storage configuration"
    else:
        return f"chore: {action} {norm_path}"

def main():
    code, status_output, err = run_cmd(["git", "status", "--porcelain", "-uall"])
    if code != 0:
        print(f"Error checking git status: {err}")
        sys.exit(1)

    if not status_output:
        print("Working tree is completely clean. No files to commit.")
        return

    branch = get_current_branch()
    lines = status_output.splitlines()
    print(f"Detected {len(lines)} file change(s) to commit 1-by-1 to branch '{branch}'.\n")

    successful_commits = 0

    import re
    for idx, line in enumerate(lines, 1):
        if not line.strip():
            continue
        
        # Git porcelain status: XY PATH or XY "PATH"
        match = re.match(r'^\s*([MADRCU?!]{1,2})\s+(.+)$', line)
        if match:
            status_part = match.group(1).strip()
            path_part = match.group(2).strip()
        else:
            status_part = line[:2].strip()
            path_part = line[2:].strip()
        
        # Strip quotes if present
        if path_part.startswith('"') and path_part.endswith('"'):
            path_part = path_part[1:-1]
        
        commit_msg = get_conventional_message(path_part, status_part)
        print(f"[{idx}/{len(lines)}] Processing: {path_part}")
        print(f"    Message: {commit_msg}")

        # 1. Stage single file
        code, _, err = run_cmd(["git", "add", path_part])
        if code != 0:
            print(f"    [FAIL] Failed to stage {path_part}: {err}")
            continue

        # 2. Commit single file
        code, commit_out, err = run_cmd(["git", "commit", "-m", commit_msg])
        if code != 0:
            print(f"    [FAIL] Failed to commit {path_part}: {err}")
            continue
        print(f"    [OK] Committed: {commit_msg}")

        # 3. Push single commit immediately
        code, push_out, err = run_cmd(["git", "push", "origin", branch])
        if code != 0:
            print(f"    [FAIL] Failed to push commit for {path_part}: {err}")
        else:
            print(f"    [OK] Pushed commit to origin/{branch}")
            successful_commits += 1
        print("-" * 50)

    print(f"\nFinished: Successfully committed and pushed {successful_commits} file(s) individually to GitHub!")

if __name__ == "__main__":
    main()
