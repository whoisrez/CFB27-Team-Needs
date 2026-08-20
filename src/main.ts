import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import started from 'electron-squirrel-startup';
import type { TeamNeedsDynasty } from './team-needs-reader';

if (started) app.quit();

type WorkerRequest = { kind: 'load'; filePath: string };
type WorkerResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function runSaveWorker<T>(request: WorkerRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'save-reader-worker.js'));
    let settled = false;
    const finish = () => {
      settled = true;
      void worker.terminate();
    };
    worker.once('message', (response: WorkerResponse<T>) => {
      finish();
      if ('data' in response) resolve(response.data);
      else reject(new Error(response.error));
    });
    worker.once('error', (error) => {
      finish();
      reject(error);
    });
    worker.once('exit', (code) => {
      if (settled) return;
      settled = true;
      reject(new Error(code === 0 ? 'Dynasty reader exited before returning data.' : `Dynasty reader exited with code ${code}.`));
    });
    worker.postMessage(request);
  });
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 660,
    backgroundColor: '#07131f',
    title: 'CFB 27 Team Needs',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
}

async function loadSave(filePath: string): Promise<TeamNeedsDynasty> {
  return runSaveWorker<TeamNeedsDynasty>({ kind: 'load', filePath });
}

ipcMain.handle('team-needs:choose-and-load', async () => {
  const testSave = process.env.CFB27_TEST_DYNASTY_SAVE;
  if (testSave) return loadSave(testSave);

  const defaultPath = path.join(app.getPath('documents'), 'EA SPORTS College Football 27', 'saves');
  const result = await dialog.showOpenDialog({
    title: 'Select CFB 27 Dynasty Save',
    defaultPath,
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return loadSave(result.filePaths[0]);
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
