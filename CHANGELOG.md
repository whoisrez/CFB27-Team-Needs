# Changelog

## v0.1.0

Initial Windows release candidate for CFB 27 Team Needs.

### Included
- Import a CFB 27 dynasty save and read Team + Player data only.
- Auto-detect the user-controlled school when the save exposes a reliable signal, with remembered-team fallback.
- Team branding with school logo and color accents when available.
- 85-man roster targets by position group.
- Graduating-player logic that keeps current-year redshirt seniors out of the graduating count.
- Manual Transferring, Being Cut, and Recruited planning fields with roster-safe limits.
- Manual values remembered per team.
- Sync button that reloads the last imported dynasty save without reopening the file picker.
- Needs Only filter.
- Offense, Defense, and Special Teams table sections.
- Windows installer build through Electron Forge / Squirrel.

### Deferred
- Automatic committed-recruit counts. This will be tested against a real save once committed recruits are available.
