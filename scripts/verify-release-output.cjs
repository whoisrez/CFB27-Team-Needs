const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rendererIndex = path.join(root, '.vite', 'renderer', 'main_window', 'index.html');
const portableDir = path.join(root, 'out', 'portable', 'CFB 27 Team Needs');
const portableExe = path.join(portableDir, 'CFB 27 Team Needs.exe');
const portableDataDir = path.join(portableDir, 'data');
const portableZip = path.join(root, 'out', 'make', 'portable', 'CFB-27-Team-Needs-Portable.zip');

if (!fs.existsSync(rendererIndex)) {
  throw new Error(`Release renderer is missing: ${rendererIndex}`);
}

if (!fs.existsSync(portableExe)) {
  throw new Error(`Portable executable is missing: ${portableExe}`);
}

if (fs.existsSync(portableDataDir)) {
  throw new Error(`Portable release contains user data and must not be published: ${portableDataDir}`);
}

if (!fs.existsSync(portableZip)) {
  throw new Error(`Portable ZIP is missing: ${portableZip}`);
}

console.log(`Verified renderer: ${path.relative(root, rendererIndex)}`);
console.log(`Verified portable app: ${path.relative(root, portableExe)}`);
console.log('Verified portable app contains no data folder.');
console.log(`Verified portable ZIP: ${path.relative(root, portableZip)}`);
