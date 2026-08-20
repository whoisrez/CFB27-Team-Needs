# Release Process

CFB 27 Team Needs publishes Windows releases through GitHub Actions. Real-save acceptance testing should still be completed before bumping the public version.

## Release candidate check

1. Pull the current `main` branch.
2. Install/update dependencies if needed with `npm.cmd install`.
3. Run `npm.cmd run release:check` for the portable acceptance build.
4. Confirm `out/portable/CFB 27 Team Needs/CFB 27 Team Needs.exe` exists.
5. Confirm `out/make/portable/CFB-27-Team-Needs-Portable.zip` exists.
6. Run the portable executable directly from the generated portable folder.
7. Copy or extract the portable folder to a different writable location and confirm it runs there without any path-specific configuration.

## Portable-build acceptance test

Before publishing a release, verify the portable app with a real dynasty save:

- App launches directly from the portable folder.
- The portable folder can be placed in any writable user-selected location or drive.
- A `data` folder is created beside the executable instead of using `%LOCALAPPDATA%` for persistent app data.
- Moving the whole portable folder keeps the app and its data together.
- Dynasty import succeeds.
- The current controlled school is detected automatically through `Team.UserCharacter` when available.
- Manual school selection remains usable as a fallback.
- Roster and graduating counts are correct.
- Current-year redshirt seniors are not counted as graduating.
- Transferring and Being Cut inputs enforce roster-safe limits.
- Recruited manual values update Team Needs correctly.
- Needs Only filtering works.
- Sync reloads the same dynasty save after the save changes.
- Manual values persist after closing/reopening the app.
- Sync still works after closing/reopening the app.
- Reset Manual Values clears only the selected team's manual planning values.

## Publishing

After the acceptance test passes:

1. Update `CHANGELOG.md` for the new version.
2. Change the version in `package.json`.
3. Merge those release changes into `main`.
4. The `Publish Release` GitHub Actions workflow runs on Windows and:
   - installs dependencies;
   - runs the TypeScript verification;
   - builds the Squirrel Windows installer;
   - builds the portable ZIP;
   - runs release-output verification;
   - creates the `vX.Y.Z` GitHub Release and attaches both downloads.
5. Confirm the release contains `CFB-27-Team-Needs-Setup.exe` and `CFB-27-Team-Needs-Portable.zip`.

The workflow has `contents: write` only for publishing the release. A release is not created if the build or verification steps fail.

## Updating

For each update, repeat real-save acceptance testing, update the changelog, bump the version, and merge the release change. Portable users can replace application files while keeping their `data` folder. Installer users can install the newer release normally.
