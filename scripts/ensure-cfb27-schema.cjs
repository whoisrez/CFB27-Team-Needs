'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const SCHEMA_RELATIVE_PATH = path.join('resources', 'schemas', '27', 'C27_486_1.gz');
const SCHEMA_PATH = path.join(process.cwd(), SCHEMA_RELATIVE_PATH);
const SCHEMA_URL = 'https://raw.githubusercontent.com/whoisrez/CFB27-Dynasty-Tracker/main/resources/schemas/27/C27_486_1.gz';
const EXPECTED_SIZE = 2992481;

function existingSchemaIsUsable() {
  try {
    return fs.statSync(SCHEMA_PATH).size === EXPECTED_SIZE;
  } catch {
    return false;
  }
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { 'User-Agent': 'CFB27-Team-Needs' },
    }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(response.headers.location, destination).then(resolve, reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Schema download failed with HTTP ${response.statusCode ?? 'unknown'}.`));
        return;
      }

      const temporary = `${destination}.download`;
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const output = fs.createWriteStream(temporary);
      response.pipe(output);
      output.on('finish', () => {
        output.close(() => {
          try {
            const size = fs.statSync(temporary).size;
            if (size !== EXPECTED_SIZE) {
              fs.rmSync(temporary, { force: true });
              reject(new Error(`Downloaded CFB 27 schema has unexpected size ${size}.`));
              return;
            }
            fs.renameSync(temporary, destination);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
      output.on('error', (error) => {
        fs.rmSync(temporary, { force: true });
        reject(error);
      });
    });
    request.on('error', reject);
  });
}

(async () => {
  if (existingSchemaIsUsable()) process.exit(0);

  console.log('Fetching CFB 27 Coach-table schema...');
  try {
    await download(SCHEMA_URL, SCHEMA_PATH);
    console.log(`CFB 27 schema ready: ${SCHEMA_RELATIVE_PATH}`);
  } catch (error) {
    console.error(`Unable to prepare the CFB 27 schema: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
})();
