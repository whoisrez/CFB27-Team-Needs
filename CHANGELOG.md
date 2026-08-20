# Changelog

## v0.1.2

First public team-agnostic Windows release.

### Fixed
- Controlled-school detection now uses CFB 27's `Team.UserCharacter` reference, which reliably identifies the current human-controlled school.
- Saves that do not expose a usable controlled-team reference no longer lose all team options; the full team selector remains available as a fallback.
- Team detection no longer depends on potentially stale Coach team metadata when `Team.UserCharacter` is available.

### Changed
- Public releases now include both `CFB-27-Team-Needs-Setup.exe` and `CFB-27-Team-Needs-Portable.zip`.
- GitHub Actions now builds and verifies Windows release output before publishing the GitHub Release.
- Release notes call out the unsigned Windows SmartScreen warning.

## v0.1.1

Portable Windows release.

### Changed
- Windows releases are now distributed as a portable app folder and ZIP instead of relying on the Squirrel installer.
- The portable app can be extracted to any writable location and run directly from `CFB 27 Team Needs.exe`.
- Packaged builds store persistent app data in a `data` folder beside the executable instead of `%LOCALAPPDATA%`.
- Moving the entire portable folder moves the app and its saved local data together.
- Release verification now checks the portable executable and ZIP output.

## v0.1.0

Initial Windows release candidate for CFB 27 Team Needs.

### Included
- Import a CFB 27 dynasty save and read Team + Player data only.
- Auto-detect user-controlled schools when the save exposes a reliable signal.
- Only user-controlled teams are exposed in the UI; the team selector is hidden when there is only one user-controlled team.
- Team branding with school logo and color accents when available.
- 85-man roster targets by position group.
- Graduating-player logic that keeps current-year redshirt seniors out of the graduating count.
- Manual Transferring, Being Cut, and Recruited planning fields with roster-safe limits.
- Manual values remembered per team.
- Sync button that reloads the last imported dynasty save without reopening the file picker.
- Needs Only filter.
- Offense, Defense, and Special Teams table sections.
- Windows installer build through Electron Forge / Squirrel.
- Production renderer packaging verification so release builds fail if the packaged UI is missing.

### Deferred
- Automatic committed-recruit counts. This will be tested against a real save once committed recruits are available.
