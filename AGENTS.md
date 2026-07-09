# Karaoke App Codex Instructions

## Project

Self-hosted multi-client karaoke app.

Root: `C:\karaoke-app`

Core rules:
- Audio files are `.opus` only.
- Lyric files are `.ttml` only.
- Audio/lyrics pair by exact same-folder stem.
- Backend session state is authoritative.
- Frontend owns browser media playback and local lyric clock.
- Do not introduce feature creep.
- Do not commit unless explicitly asked.

## Workflow

For each task:
1. Keep scope narrow.
2. Edit only listed files unless required.
3. Preserve existing behaviour outside task scope.
4. Run validation.
5. Return summary, validation result, focused diff, and `git status --short`.
6. Do not commit.

## Validation

Use:

```powershell
.\scripts\validate.ps1