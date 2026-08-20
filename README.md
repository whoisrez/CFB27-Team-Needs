# CFB 27 Team Needs

Standalone Windows roster-planning utility for College Football 27 dynasty saves.

Import a dynasty save and the app reads the Team + Player data needed to populate roster counts and graduating players. Transferring, Being Cut, and Recruited are manual planning fields remembered per team. Sync reloads the last imported dynasty save without reopening the file picker.

## Features

- Team-agnostic dynasty import with automatic/remembered school selection.
- School logo and color branding when available.
- 85-man roster targets grouped by position.
- Correct current-year redshirt senior graduation handling.
- Roster-safe Transferring and Being Cut limits.
- Needs Only filter and Offense / Defense / Special Teams sections.
- Manual planning values remembered per team.
- One-click Sync for the last imported save.

The app intentionally reads only the Team and Player tables needed for Team Needs. Automatic committed-recruit counts are deferred until they can be tested against a real save containing commits.

## Development

Development is local-first. GitHub Actions are manual-only and never run automatically on pushes or pull requests.

```powershell
npm.cmd install
npm.cmd run verify
npm.cmd start
```

## Windows release build

```powershell
npm.cmd run release:check
```

Electron Forge creates the Windows installer under `out/make/`. The installer is named `CFB-27-Team-Needs-Setup.exe`.

See `RELEASE.md` for the installed-build acceptance checklist and publishing process. Release changes are tracked in `CHANGELOG.md`.
