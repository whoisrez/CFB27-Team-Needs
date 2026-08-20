# Changelog

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
