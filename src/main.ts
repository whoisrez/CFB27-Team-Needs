import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import started from 'electron-squirrel-startup';
import type { TeamNeedsDynasty } from './team-needs-reader';

if (app.isPackaged) {
  // Portable releases keep settings, localStorage, and sync metadata beside the app
  // instead of writing them to %LOCALAPPDATA%.
  app.setPath('userData', path.join(path.dirname(process.execPath), 'data'));
}

if (started) app.quit();

type WorkerRequest = { kind: 'load'; filePath: string };
type WorkerResponse<T> = { ok: true; data: T } | { ok: false; error: string };
type TeamBranding = { logoUrl: string; color: string; alternateColor: string; displayName: string };

type EspnTeamResponse = {
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    abbreviation?: string;
    color?: string;
    alternateColor?: string;
    logos?: Array<{ href?: string }>;
  };
};

const teamBrandingCache = new Map<string, TeamBranding | null>();
let pendingSyncPath: string | null = null;

function lastSavePathFile(): string {
  return path.join(app.getPath('userData'), 'last-dynasty-save.txt');
}

async function rememberLastSavePath(filePath: string): Promise<void> {
  try {
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(lastSavePathFile(), filePath, 'utf8');
  } catch {
    // Sync convenience is optional; never fail an import because persistence failed.
  }
}

async function readLastSavePath(): Promise<string | null> {
  try {
    const filePath = (await readFile(lastSavePathFile(), 'utf8')).trim();
    if (!filePath) return null;
    await access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

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

function normalizeBrandingColor(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(text) ? `#${text.toLowerCase()}` : fallback;
}

function teamBrandingCandidates(teamName: string): string[] {
  const raw = teamName.trim().toLowerCase();
  const compact = raw.replace(/[^a-z0-9]+/g, '');
  const dashed = raw.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const aliases: Record<string, string[]> = {
    fiu: ['fiu', 'florida-international'],
    ecu: ['ecu', 'east-carolina'],
    cal: ['cal', 'california'],
    byu: ['byu', 'brigham-young'],
    ucf: ['ucf', 'central-florida'],
    usf: ['usf', 'south-florida'],
    uab: ['uab'],
    utep: ['utep'],
    utsa: ['utsa'],
    unlv: ['unlv'],
    smu: ['smu'],
    tcu: ['tcu'],
    lsu: ['lsu'],
    usc: ['usc', 'southern-california'],
    umass: ['umass', 'massachusetts'],
    fau: ['florida-atlantic'],
    fsu: ['florida-state'],
    jmu: ['james-madison'],
    wku: ['western-kentucky'],
    'miami-oh': ['miami-oh', 'miami-ohio'],
  };
  const values = [...(aliases[raw] ?? []), raw, dashed, compact];
  return [...new Set(values.filter(Boolean))];
}

async function resolveTeamBranding(teamName: string): Promise<TeamBranding | null> {
  const cacheKey = teamName.trim().toLowerCase();
  if (!cacheKey) return null;
  if (teamBrandingCache.has(cacheKey)) return teamBrandingCache.get(cacheKey) ?? null;

  for (const candidate of teamBrandingCandidates(teamName)) {
    try {
      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${encodeURIComponent(candidate)}`, {
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) continue;
      const payload = await response.json() as EspnTeamResponse;
      const team = payload.team;
      const href = team?.logos?.find((logo) => typeof logo.href === 'string' && logo.href.length > 0)?.href;
      if (!team || !href) continue;

      const branding: TeamBranding = {
        logoUrl: href.replace(/^http:/, 'https:'),
        color: normalizeBrandingColor(team.color, '#7b3342'),
        alternateColor: normalizeBrandingColor(team.alternateColor, '#d6b35a'),
        displayName: String(team.displayName ?? team.shortDisplayName ?? team.abbreviation ?? teamName),
      };
      teamBrandingCache.set(cacheKey, branding);
      return branding;
    } catch {
      // Try the next candidate. Branding is optional and must never block save import.
    }
  }

  teamBrandingCache.set(cacheKey, null);
  return null;
}

async function loadRenderer(mainWindow: BrowserWindow): Promise<void> {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    return;
  }

  // Resolve from the packaged application root instead of from __dirname.
  // Electron Forge places the renderer bundle at .vite/renderer/main_window.
  const rendererPath = path.join(app.getAppPath(), '.vite', 'renderer', 'main_window', 'index.html');

  try {
    await mainWindow.loadFile(rendererPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'CFB 27 Team Needs',
      message: 'The application interface could not be loaded.',
      detail: `Renderer path: ${rendererPath}\n\n${message}`,
    });
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 660,
    backgroundColor: '#050505',
    title: 'CFB 27 Team Needs',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  void loadRenderer(mainWindow);
}

async function loadSave(filePath: string): Promise<TeamNeedsDynasty> {
  return runSaveWorker<TeamNeedsDynasty>({ kind: 'load', filePath });
}

ipcMain.handle('team-needs:prepare-sync', async () => {
  const filePath = await readLastSavePath();
  pendingSyncPath = filePath;
  return Boolean(filePath);
});

ipcMain.handle('team-needs:choose-and-load', async () => {
  const testSave = process.env.CFB27_TEST_DYNASTY_SAVE;
  if (testSave) return loadSave(testSave);

  if (pendingSyncPath) {
    const filePath = pendingSyncPath;
    pendingSyncPath = null;
    return loadSave(filePath);
  }

  const defaultPath = path.join(app.getPath('documents'), 'EA SPORTS College Football 27', 'saves');
  const result = await dialog.showOpenDialog({
    title: 'Select CFB 27 Dynasty Save',
    defaultPath,
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const dynasty = await loadSave(filePath);
  await rememberLastSavePath(filePath);
  return dynasty;
});

ipcMain.handle('team-needs:team-branding', async (_event, teamName: unknown) => {
  const name = String(teamName ?? '').trim();
  return name ? resolveTeamBranding(name) : null;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
