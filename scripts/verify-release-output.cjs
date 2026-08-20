const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rendererIndex = path.join(root, '.vite', 'renderer', 'main_window', 'index.html');
const makeDir = path.join(root, 'out', 'make');

function findFile(dir, fileName) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(fullPath, fileName);
      if (nested) return nested;
    } else if (entry.name === fileName) {
      return fullPath;
    }
  }
  return null;
}

if (!fs.existsSync(rendererIndex)) {
  throw new Error(`Release renderer is missing: ${rendererIndex}`);
}

const installer = findFile(makeDir, 'CFB-27-Team-Needs-Setup.exe');
if (!installer) {
  throw new Error(`Release installer is missing under: ${makeDir}`);
}

console.log(`Verified renderer: ${path.relative(root, rendererIndex)}`);
console.log(`Verified installer: ${path.relative(root, installer)}`);
