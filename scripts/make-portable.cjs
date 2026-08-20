const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const packagedDir = path.join(root, 'out', 'CFB 27 Team Needs-win32-x64');
const portableRoot = path.join(root, 'out', 'portable');
const portableAppDir = path.join(portableRoot, 'CFB 27 Team Needs');
const makeDir = path.join(root, 'out', 'make', 'portable');
const zipPath = path.join(makeDir, 'CFB-27-Team-Needs-Portable.zip');

if (!fs.existsSync(packagedDir)) {
  throw new Error(`Packaged app is missing: ${packagedDir}`);
}

fs.rmSync(portableRoot, { recursive: true, force: true });
fs.mkdirSync(portableAppDir, { recursive: true });
fs.cpSync(packagedDir, portableAppDir, { recursive: true, force: true });

fs.writeFileSync(
  path.join(portableAppDir, 'README.txt'),
  [
    'CFB 27 Team Needs - Portable Windows Build',
    '',
    'Keep this entire folder together and run CFB 27 Team Needs.exe.',
    'The app stores its persistent settings in the data folder beside the executable.',
    'To move the app, move the whole CFB 27 Team Needs folder.',
    '',
  ].join('\r\n'),
  'utf8',
);

fs.mkdirSync(makeDir, { recursive: true });
fs.rmSync(zipPath, { force: true });

const escapePowerShell = (value) => value.replaceAll("'", "''");
const command = [
  'Compress-Archive',
  `-LiteralPath '${escapePowerShell(portableAppDir)}'`,
  `-DestinationPath '${escapePowerShell(zipPath)}'`,
  '-CompressionLevel Optimal',
  '-Force',
].join(' ');

const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
  cwd: root,
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Portable ZIP creation failed with exit code ${result.status}.`);

console.log(`Created portable app: ${path.relative(root, portableAppDir)}`);
console.log(`Created portable ZIP: ${path.relative(root, zipPath)}`);
