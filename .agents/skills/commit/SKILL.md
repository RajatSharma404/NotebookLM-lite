---
name: commit
description: >-
  Use this skill to inspect all modified or untracked files in the workspace,
  stage and commit them one by one with descriptive Conventional Commit messages,
  and push each commit immediately to GitHub to maintain a rich, granular commit history.
---

# 1-by-1 Commit & Push Skill

This skill automates the process of breaking workspace changes into individual, granular git commits and pushing them one-by-one to GitHub.

---

## 1. When to Use This Skill
- Whenever new files have been created or existing files modified, and you want each change to appear as a dedicated, standalone commit on GitHub.
- To maintain maximum transparency, clean git histories, and easy rollback granularity.

---

## 2. Automated Execution Procedure

Run the dedicated helper script from the workspace root:

```powershell
python .agents/skills/commit/scripts/commit_push_each.py
```

### What the Script Executes:
1. Detects all modified, added, deleted, or untracked files via `git status --porcelain`.
2. For every single file detected:
   - Formulates a context-aware Conventional Commit message (e.g., `docs(prd): create PRD.md specification`, `feat(skills): create SKILL.md in audio-overview-synthesis skill`).
   - Stages **only** that individual file: `git add <file_path>`.
   - Creates a commit: `git commit -m "<conventional_message>"`.
   - Pushes that single commit immediately to the remote branch: `git push origin <current_branch>`.
3. Reports the execution summary with exact counts of committed and pushed files.

---

## 3. Manual Fallback Procedure (PowerShell)

If Python is temporarily unavailable, execute the one-by-one flow in PowerShell:

```powershell
# Get all untracked or modified files individually
git status --porcelain -uall | ForEach-Object {
    $line = $_.Trim()
    $status = $line.Substring(0, 2).Trim()
    $file = $line.Substring(3).Trim(' "')
    
    Write-Host "Staging and committing: $file"
    git add $file
    git commit -m "feat: update $file"
    git push origin main
}
```

---

## 4. Verification Step
After execution, verify the commit tree and remote sync:

```powershell
git log -n 5 --oneline
git status
```
Working tree should be clean (`nothing to commit, working tree clean`) and local branch should be up to date with `origin/main`.
