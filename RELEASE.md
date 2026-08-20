# Release Process

CFB 27 Team Needs uses a local-first Windows release process. GitHub Actions remain manual-only.

## Release candidate check

1. Pull the current `main` branch.
2. Install/update dependencies if needed with `npm.cmd install`.
3. Run `npm.cmd run release:check`.
4. Confirm the installer is created under `out/make/`.
5. Install `CFB-27-Team-Needs-Setup.exe` on Windows.

## Installed-build acceptance test

Before publishing a release, verify the installed app with a real dynasty save:

- App launches from the Windows-installed shortcut/app entry.
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

After the installed build passes acceptance:

1. Confirm `package.json` contains the intended version.
2. Update `CHANGELOG.md`.
3. Tag the accepted commit as `vX.Y.Z`.
4. Create a GitHub Release from that tag.
5. Attach `CFB-27-Team-Needs-Setup.exe` from the successful local build.

## Updating

For each update, repeat the same development, local verification, installed-build acceptance, version bump, and release process. Early releases intentionally use a fresh installer rather than an automatic updater.
