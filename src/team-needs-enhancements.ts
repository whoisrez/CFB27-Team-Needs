import './team-needs-enhancements.css';

type SyncAPI = typeof window.teamNeedsAPI & {
  prepareSync: () => Promise<boolean>;
};

type SectionDefinition = {
  id: string;
  label: string;
  startKey: string;
  keys: readonly string[];
};

const NEEDS_ONLY_KEY = 'cfb27-team-needs-filter-needs-only';
const syncAPI = window.teamNeedsAPI as SyncAPI;
const sections: readonly SectionDefinition[] = [
  { id: 'offense', label: 'Offense', startKey: 'QB', keys: ['QB', 'HB', 'FB', 'WR', 'TE', 'C', 'OG', 'OT'] },
  { id: 'defense', label: 'Defense', startKey: 'EDGE', keys: ['EDGE', 'DT', 'MIKE', 'SAM/WILL', 'CB', 'FS', 'SS'] },
  { id: 'special-teams', label: 'Special Teams', startKey: 'K', keys: ['K', 'P'] },
];

let needsOnly = localStorage.getItem(NEEDS_ONLY_KEY) === 'true';
let enhanceQueued = false;

function showSyncError(message: string): void {
  const status = document.querySelector<HTMLElement>('#status');
  if (!status) return;
  status.classList.add('error');
  status.innerHTML = `<span><strong>Sync unavailable.</strong> ${message}</span>`;
}

function installSyncButton(): void {
  const actions = document.querySelector<HTMLElement>('.actions');
  const importButton = document.querySelector<HTMLButtonElement>('#importButton');
  if (!actions || !importButton || document.querySelector('#syncButton')) return;

  const syncButton = document.createElement('button');
  syncButton.id = 'syncButton';
  syncButton.className = 'secondary sync-button';
  syncButton.type = 'button';
  syncButton.textContent = 'Sync';
  importButton.insertAdjacentElement('afterend', syncButton);

  syncButton.addEventListener('click', async () => {
    if (importButton.disabled || syncButton.disabled) return;

    syncButton.disabled = true;
    syncButton.textContent = 'Syncing…';

    try {
      const ready = await syncAPI.prepareSync();
      if (!ready) {
        showSyncError('Import a dynasty once first, or re-import it if the save file was moved.');
        return;
      }

      let importStarted = false;
      const finish = () => {
        syncButton.disabled = false;
        syncButton.textContent = 'Sync';
        watcher.disconnect();
        window.clearTimeout(timeoutId);
      };
      const watcher = new MutationObserver(() => {
        if (importButton.disabled) importStarted = true;
        if (importStarted && !importButton.disabled) finish();
      });
      const timeoutId = window.setTimeout(finish, 30000);
      watcher.observe(importButton, { attributes: true, childList: true, subtree: true });
      importButton.click();
      return;
    } catch {
      showSyncError('The last dynasty save could not be reopened.');
    }

    syncButton.disabled = false;
    syncButton.textContent = 'Sync';
  });
}

function installNeedsOnlyToggle(): void {
  const panelHead = document.querySelector<HTMLElement>('.panel-head');
  if (!panelHead || document.querySelector('#needsOnlyToggle')) return;

  const button = document.createElement('button');
  button.id = 'needsOnlyToggle';
  button.className = 'needs-only-toggle';
  button.type = 'button';
  button.innerHTML = '<span class="toggle-dot" aria-hidden="true"></span><span>Needs Only</span>';
  button.addEventListener('click', () => {
    needsOnly = !needsOnly;
    localStorage.setItem(NEEDS_ONLY_KEY, String(needsOnly));
    updateToggleState(button);
    applyNeedsFilter();
  });
  panelHead.append(button);
  updateToggleState(button);
}

function updateToggleState(button: HTMLButtonElement): void {
  button.setAttribute('aria-pressed', String(needsOnly));
  button.classList.toggle('active', needsOnly);
}

function ensureSectionDividers(): void {
  const body = document.querySelector<HTMLTableSectionElement>('#rows');
  if (!body) return;

  for (const section of sections) {
    const firstRow = body.querySelector<HTMLTableRowElement>(`tr[data-target-group="${section.startKey}"]`);
    if (!firstRow) continue;

    const previous = firstRow.previousElementSibling as HTMLTableRowElement | null;
    if (previous?.classList.contains('roster-section-divider') && previous.dataset.section === section.id) continue;

    const divider = document.createElement('tr');
    divider.className = 'roster-section-divider';
    divider.dataset.section = section.id;
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = section.label;
    divider.append(cell);
    body.insertBefore(divider, firstRow);
  }
}

function applyNeedsFilter(): void {
  const body = document.querySelector<HTMLTableSectionElement>('#rows');
  if (!body) return;

  const dataRows = [...body.querySelectorAll<HTMLTableRowElement>('tr[data-target-group]')];
  for (const row of dataRows) {
    const stillNeeded = Number(row.querySelector<HTMLElement>('.still-needed')?.textContent ?? 0);
    row.classList.toggle('needs-filter-hidden', needsOnly && stillNeeded <= 0);
  }

  for (const section of sections) {
    const divider = body.querySelector<HTMLTableRowElement>(`.roster-section-divider[data-section="${section.id}"]`);
    if (!divider) continue;
    const hasVisibleNeed = section.keys.some((key) => {
      const row = body.querySelector<HTMLTableRowElement>(`tr[data-target-group="${key}"]`);
      return Boolean(row && !row.classList.contains('needs-filter-hidden'));
    });
    divider.classList.toggle('needs-filter-hidden', needsOnly && !hasVisibleNeed);
  }
}

function enhanceTable(): void {
  enhanceQueued = false;
  ensureSectionDividers();
  applyNeedsFilter();
}

function scheduleEnhance(): void {
  if (enhanceQueued) return;
  enhanceQueued = true;
  queueMicrotask(enhanceTable);
}

installSyncButton();
installNeedsOnlyToggle();
scheduleEnhance();

document.addEventListener('input', scheduleEnhance);
document.querySelector('#teamSelect')?.addEventListener('change', scheduleEnhance);

const rows = document.querySelector('#rows');
if (rows) {
  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(rows, { childList: true, subtree: true, characterData: true });
}
