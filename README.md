# CFB 27 Team Needs

Standalone Windows roster-planning utility for College Football 27 dynasty saves.

Import a dynasty save and the app reads the Team + Player data needed to populate roster counts and graduating players. Transferring, Being Cut, and Recruited are manual planning fields remembered per team. Sync reloads the last imported dynasty save without reopening the file picker.

## Download

Use the repository's **Releases** page for normal Windows downloads:

- `CFB-27-Team-Needs-Setup.exe` — standard Windows installer.
- `CFB-27-Team-Needs-Portable.zip` — portable version; extract the folder anywhere writable and run `CFB 27 Team Needs.exe`.

Windows may show a SmartScreen warning because the current release is not code-signed.

## Features

- Team-agnostic dynasty import with automatic controlled-school detection through CFB 27's `Team.UserCharacter` reference.
- Manual team selection remains available as a fallback when a save cannot expose a controlled-team reference.
- School logo and color branding when available.
- 85-man roster targets grouped by position.
- Correct current-year redshirt senior graduation handling.
- Roster-safe Transferring and Being Cut limits.
- Needs Only filter and Offense / Defense / Special Teams sections.
- Manual planning values remembered per team.
- One-click Sync for the last imported save.

The app intentionally reads only the dynasty data needed for Team Needs. Automatic committed-recruit counts are deferred until they can be tested against a real save containing commits.

## Development

```powershell
npm.cmd install
npm.cmd run verify
npm.cmd start
```

## Release builds

Public releases are built on a Windows GitHub Actions runner after the version in `package.json` is changed and merged into `main`. The release workflow type-checks the project, builds the Windows installer and portable ZIP, verifies the portable output, and then creates the GitHub Release.

For a local portable verification build:

```powershell
npm.cmd run release:check
```

The portable release has no hardcoded install location. Packaged portable builds keep persistent app data in a `data` folder beside the executable instead of `%LOCALAPPDATA%`. If the entire `CFB 27 Team Needs` folder is moved to another writable location, the app and its portable data move together.

See `RELEASE.md` for the release checklist and publishing process. Release changes are tracked in `CHANGELOG.md`.
