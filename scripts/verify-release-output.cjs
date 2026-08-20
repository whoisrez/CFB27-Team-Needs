const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rendererIndex = path.join(root, '.vite', 'renderer', 'main_window', 'index.html');
const portableExe = path.join(root, 'out', 'portable', 'CFB 27 Team Needs', 'CFB 27 Team Needs.exe');
const portableZip = path.join(root, 'out', 'make', 'portable', 'CFB-27-Team-Needs-Portable.zip');

if (!fs.existsSync(rendererIndex)) {
  throw new Error(`Release renderer is missing: ${rendererIndex}`);
}

if (!fs.existsSync(portableExe)) {
  throw new Error(`Portable executable is missing: ${portableExe}`);
}

if (!fs.existsSync(portableZip)) {
  throw new Error(`Portable ZIP is missing: ${portableZip}`);
}

console.log(`Verified renderer: ${path.relative(root, rendererIndex)}`);
console.log(`Verified portable app: ${path.relative(root, portableExe)}`);
console.log(`Verified portable ZIP: ${path.relative(root, portableZip)}`);
