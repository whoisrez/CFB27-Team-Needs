const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'resources', 'app.ico.base64');
const target = path.join(root, 'resources', 'app.ico');

if (!fs.existsSync(source)) {
  throw new Error(`Missing release icon source: ${source}`);
}

const encoded = fs.readFileSync(source, 'utf8').trim();
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, Buffer.from(encoded, 'base64'));
console.log(`Prepared release asset: ${path.relative(root, target)}`);
