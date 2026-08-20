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

## Windows portable release build

```powershell
npm.cmd run release:check
```

The release build creates:

- `out/portable/CFB 27 Team Needs/` — runnable portable app folder.
- `out/make/portable/CFB-27-Team-Needs-Portable.zip` — release artifact for GitHub.

The portable release has no hardcoded install location. Download the ZIP and extract the `CFB 27 Team Needs` folder to any writable location you choose, on any drive. Run `CFB 27 Team Needs.exe` from that folder.

Packaged builds keep persistent app data in a `data` folder beside the executable instead of `%LOCALAPPDATA%`. If the entire `CFB 27 Team Needs` folder is moved to another writable location, the app and its portable data move together.

See `RELEASE.md` for the portable-build acceptance checklist and publishing process. Release changes are tracked in `CHANGELOG.md`.
