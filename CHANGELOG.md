# Changelog

## v0.1.4

Automatic recruiting update.

### Added
- Automatically reads committed recruits from CFB 27 dynasty saves for the controlled team.
- Counts SoftCommitted, HardCommitted, and Signed recruits together in the Recruited total.
- Resolves each committed recruit's linked player position and maps it into the Team Needs position groups.
- Recruited cells display automatic counts when recruiting data is available in the save.

### Changed
- Sync now refreshes committed-recruit counts from the dynasty save and recalculates Still Needed automatically.
- Manual Recruited input remains available as a fallback when recruiting data cannot be resolved.
- Public distribution remains portable-only through `CFB-27-Team-Needs-Portable.zip`.

## v0.1.3

Projected draft planning update.

### Added
- Added a manual `Projected Draft` column between Transferring and Being Cut.
- Projected Draft is intended for draft-eligible underclassmen you expect to leave early, such as juniors or redshirt sophomores.
- Projected draft values are saved per team and position group alongside the existing manual planning fields.

### Changed
- Projected Draft departures now reduce Projected Returning and increase Still Needed.
- Transferring + Projected Draft + Being Cut share one roster-safe departure cap so projected departures cannot exceed available non-graduating players.
- Existing saved manual values remain compatible; Projected Draft defaults to 0 when no prior value exists.
- Public distribution remains portable-only through `CFB-27-Team-Needs-Portable.zip`.

## v0.1.2

First public team-agnostic Windows release.

### Fixed
- Controlled-school detection now uses CFB 27's `Team.UserCharacter` reference, which reliably identifies the current human-controlled school.
- Saves that do not expose a usable controlled-team reference no longer lose all team options; the full team selector remains available as a fallback.
- Team detection no longer depends on potentially stale Coach team metadata when `Team.UserCharacter` is available.

### Changed
- Public distribution remains portable-only: `CFB-27-Team-Needs-Portable.zip` is the sole application download.
- GitHub Actions now builds and verifies the portable Windows release before publishing or updating the GitHub Release.
- Release verification confirms the portable package contains no previous user data.

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
