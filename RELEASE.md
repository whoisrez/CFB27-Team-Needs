# Release Process

CFB 27 Team Needs uses a local-first portable Windows release process. GitHub Actions remain manual-only.

## Release candidate check

1. Pull the current `main` branch.
2. Install/update dependencies if needed with `npm.cmd install`.
3. Run `npm.cmd run release:check`.
4. Confirm `out/portable/CFB 27 Team Needs/CFB 27 Team Needs.exe` exists.
5. Confirm `out/make/portable/CFB-27-Team-Needs-Portable.zip` exists.
6. Run the portable executable directly from the generated portable folder.

## Portable-build acceptance test

Before publishing a release, verify the portable app with a real dynasty save:

- App launches directly from the portable folder.
- A `data` folder is created beside the executable instead of using `%LOCALAPPDATA%` for persistent app data.
- Dynasty import succeeds.
- Correct school is selected automatically or remembered correctly.
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

After the portable build passes acceptance:

1. Confirm `package.json` contains the intended version.
2. Update `CHANGELOG.md`.
3. Tag the accepted commit as `vX.Y.Z`.
4. Create a GitHub Release from that tag.
5. Attach `CFB-27-Team-Needs-Portable.zip` from the successful local build.

## Updating

For each update, repeat the same development, local verification, portable-build acceptance, version bump, and release process. Users update by replacing the application files with the newer portable release while keeping the `data` folder.
