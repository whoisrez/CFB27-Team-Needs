import { ROSTER_TARGETS, ROSTER_TARGET_TOTAL } from './config/roster-targets';
import {
  availableTeamNeedsDepartures,
  calculateTeamNeedsStillNeeded,
  normalizeTeamNeedsDepartures,
} from './utils/team-needs';
import './styles.css';

type TeamNeedsPlayer = { position: string; schoolYear: string; redshirtStatus: string };
type TeamNeedsTeam = { teamName: string; teamIndex: number; isUserControlled: boolean; roster: TeamNeedsPlayer[] };
type TeamNeedsDynasty = { filePath: string; teams: TeamNeedsTeam[] };

declare global {
  interface Window {
    teamNeedsAPI: {
      chooseAndLoad: () => Promise<TeamNeedsDynasty | null>;
    };
  }
}

type ManualField = 'transferring' | 'projectedDraft' | 'beingCut' | 'recruited';
type ManualRow = Record<ManualField, number>;
type ManualStore = Record<string, Record<string, ManualRow>>;

const STORAGE_KEY = 'cfb27-team-needs-v1';
const LAST_TEAM_KEY = 'cfb27-team-needs-last-team-index';
const positionAliases: Record<string, string> = {
  RB: 'HB', LEDG: 'LE', LDE: 'LE', REDG: 'RE', RDE: 'RE', NT: 'DT',
  LOLB: 'SAM', MLB: 'MIKE', ROLB: 'WILL',
};

let dynasty: TeamNeedsDynasty | null = null;
let selectedTeamIndex: number | null = null;

function currentTeam(): TeamNeedsTeam | null {
  if (!dynasty || selectedTeamIndex == null) return null;
  return dynasty.teams.find((team) => team.teamIndex === selectedTeamIndex) ?? null;
}

function displayPosition(position: string): string {
  return positionAliases[position] ?? position;
}

function isGraduatingSenior(player: TeamNeedsPlayer): boolean {
  return player.schoolYear === 'Senior' && player.redshirtStatus !== 'Current';
}

function clampManual(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(85, Math.trunc(parsed)));
}

function storageScope(): string {
  return selectedTeamIndex == null ? 'no-team' : `team-index:${selectedTeamIndex}`;
}

function readStore(): ManualStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ManualStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function manualValues(groupKey: string): ManualRow {
  const row = readStore()[storageScope()]?.[groupKey];
  return {
    transferring: clampManual(row?.transferring),
    projectedDraft: clampManual(row?.projectedDraft),
    beingCut: clampManual(row?.beingCut),
    recruited: clampManual(row?.recruited),
  };
}

function saveManual(groupKey: string, field: ManualField, value: number): void {
  const store = readStore();
  const scope = storageScope();
  const scoped = store[scope] ?? {};
  const current = scoped[groupKey] ?? { transferring: 0, projectedDraft: 0, beingCut: 0, recruited: 0 };
  scoped[groupKey] = { ...current, [field]: clampManual(value) };
  store[scope] = scoped;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function clearManualValues(): void {
  const store = readStore();
  delete store[storageScope()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  render();
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing app root.');

root.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="title-wrap">
        <div class="mark">27</div>
        <div><span class="eyebrow">ROSTER PLANNING</span><h1>CFB 27 Team Needs</h1><p class="subtitle">Import a dynasty save, select a school, then plan departures and recruiting against the 85-man target.</p></div>
      </div>
      <div class="actions">
        <select id="teamSelect" class="team-select" aria-label="Team" disabled><option value="">Import dynasty first</option></select>
        <button id="resetButton" class="secondary" type="button" disabled>Reset Manual Values</button>
        <button id="importButton" class="primary" type="button">Import Dynasty</button>
      </div>
    </header>
    <div id="status" class="status"><span><strong>No dynasty loaded.</strong> Import a save to read team rosters.</span><span>Manual values save per team.</span></div>
    <section id="summary" class="summary"></section>
    <section class="panel">
      <div class="panel-head"><div><span class="eyebrow">85-MAN ROSTER PLAN</span><h2>Team Needs</h2></div><div id="meta" class="panel-meta">Import a dynasty to calculate needs</div></div>
      <div class="table-wrap"><table class="needs-table">
        <thead><tr><th>Position</th><th>On Team</th><th>Graduating</th><th>Transferring</th><th>Projected Draft</th><th>Being Cut</th><th>Target</th><th>Recruited</th><th>Still Needed</th></tr></thead>
        <tbody id="rows"></tbody>
      </table></div>
    </section>
    <p class="footnote"><b>Roster-safe departures:</b> Transferring + Projected Draft + Being Cut can never exceed the non-graduating players available in that position group. Use Projected Draft for draft-eligible underclassmen you expect to leave, such as juniors or redshirt sophomores. LG + RG count as OG, LT + RT as OT, LE + RE as EDGE, and SAM + WILL as SAM/WILL.</p>
  </div>`;

const importButton = document.querySelector<HTMLButtonElement>('#importButton')!;
const resetButton = document.querySelector<HTMLButtonElement>('#resetButton')!;
const teamSelect = document.querySelector<HTMLSelectElement>('#teamSelect')!;
const status = document.querySelector<HTMLElement>('#status')!;
const summary = document.querySelector<HTMLElement>('#summary')!;
const rows = document.querySelector<HTMLTableSectionElement>('#rows')!;
const meta = document.querySelector<HTMLElement>('#meta')!;

function renderTeamSelect(): void {
  if (!dynasty) {
    teamSelect.disabled = true;
    teamSelect.innerHTML = '<option value="">Import dynasty first</option>';
    return;
  }
  teamSelect.disabled = false;
  teamSelect.innerHTML = '<option value="">Select team…</option>' + dynasty.teams.map((team) =>
    `<option value="${team.teamIndex}"${team.teamIndex === selectedTeamIndex ? ' selected' : ''}>${escapeHtml(team.teamName)}${team.isUserControlled ? ' • User' : ''}</option>`,
  ).join('');
}

function updateStatus(): void {
  if (!dynasty) {
    status.classList.remove('error');
    status.innerHTML = '<span><strong>No dynasty loaded.</strong> Import a save to read team rosters.</span><span>Manual values save per team.</span>';
    return;
  }
  const team = currentTeam();
  if (!team) {
    status.classList.remove('error');
    status.innerHTML = `<span><strong>Dynasty loaded.</strong> ${dynasty.teams.length} team rosters found — select your school.</span><span>Manual values save per team.</span>`;
    return;
  }
  status.classList.remove('error');
  status.innerHTML = `<span><strong>${escapeHtml(team.teamName)} loaded.</strong> ${team.roster.length} players read from the save.</span><span>Manual values save per team.</span>`;
}

function render(): void {
  const team = currentTeam();
  resetButton.disabled = !team;
  if (!team) {
    summary.innerHTML = `
      <article><span>Roster</span><strong>— / ${ROSTER_TARGET_TOTAL}</strong><small>${dynasty ? 'Select team' : 'Import dynasty'}</small></article>
      <article><span>Graduating</span><strong>—</strong><small>Projected departures</small></article>
      <article><span>Projected Returning</span><strong>—</strong><small>After departures</small></article>
      <article><span>Still Needed</span><strong>—</strong><small>Net to target</small></article>`;
    rows.innerHTML = `<tr><td colspan="9" class="empty">${dynasty ? 'Select your school above to populate the chart.' : 'Import a CFB 27 dynasty save to populate the chart.'}</td></tr>`;
    meta.textContent = dynasty ? 'Select a team to calculate needs' : 'Import a dynasty to calculate needs';
    return;
  }

  const values = ROSTER_TARGETS.map((group) => {
    const players = team.roster.filter((player) => group.positions.includes(displayPosition(player.position)));
    const graduating = players.filter(isGraduatingSenior).length;
    const manual = manualValues(group.key);
    const normalized = normalizeTeamNeedsDepartures(
      players.length,
      graduating,
      manual.transferring,
      manual.projectedDraft,
      manual.beingCut,
    );
    const recruited = manual.recruited;
    const available = availableTeamNeedsDepartures(players.length, graduating);
    const stillNeeded = calculateTeamNeedsStillNeeded(
      group.target,
      players.length,
      graduating,
      normalized.transferring,
      normalized.projectedDraft,
      normalized.beingCut,
      recruited,
    );
    return {
      group,
      onTeam: players.length,
      graduating,
      transferring: normalized.transferring,
      projectedDraft: normalized.projectedDraft,
      beingCut: normalized.beingCut,
      recruited,
      available,
      stillNeeded,
    };
  });

  const totalGraduating = values.reduce((sum, row) => sum + row.graduating, 0);
  const totalTransferring = values.reduce((sum, row) => sum + row.transferring, 0);
  const totalProjectedDraft = values.reduce((sum, row) => sum + row.projectedDraft, 0);
  const totalBeingCut = values.reduce((sum, row) => sum + row.beingCut, 0);
  const totalRecruited = values.reduce((sum, row) => sum + row.recruited, 0);
  const totalStillNeeded = values.reduce((sum, row) => sum + row.stillNeeded, 0);
  const projectedReturning = team.roster.length - totalGraduating - totalTransferring - totalProjectedDraft - totalBeingCut;

  summary.innerHTML = `
    <article><span>Roster</span><strong>${team.roster.length} / ${ROSTER_TARGET_TOTAL}</strong><small>Current / target</small></article>
    <article><span>Graduating</span><strong>${totalGraduating}</strong><small>Projected departures</small></article>
    <article><span>Projected Returning</span><strong id="projectedReturning">${projectedReturning}</strong><small>After manual departures</small></article>
    <article><span>Still Needed</span><strong id="totalStillNeeded">${totalStillNeeded}</strong><small><span id="recruitedSummary">${totalRecruited}</span> recruited</small></article>`;
  meta.textContent = `${team.teamName} • ${team.roster.length} on roster • ${projectedReturning} projected returning`;

  rows.innerHTML = values.map((row) => {
    const needClass = row.stillNeeded > 0 ? 'need-positive' : row.stillNeeded < 0 ? 'need-surplus' : 'need-balanced';
    const statusText = row.stillNeeded > 0 ? `${row.stillNeeded} to add` : row.stillNeeded < 0 ? `${Math.abs(row.stillNeeded)} over target` : 'On target';
    const maxTransferring = Math.max(0, row.available - row.projectedDraft - row.beingCut);
    const maxProjectedDraft = Math.max(0, row.available - row.transferring - row.beingCut);
    const maxBeingCut = Math.max(0, row.available - row.transferring - row.projectedDraft);
    return `<tr data-target-group="${escapeHtml(row.group.key)}" data-on-team="${row.onTeam}" data-graduating="${row.graduating}" data-target="${row.group.target}">
      <td><div class="position-name"><strong>${escapeHtml(row.group.label)}</strong><small>${escapeHtml(row.group.key)}</small></div></td>
      <td><span class="count">${row.onTeam}</span></td>
      <td><span class="count departing">${row.graduating}</span></td>
      <td><div class="manual-wrap"><input class="manual" type="number" min="0" max="${maxTransferring}" step="1" data-manual-field="transferring" value="${row.transferring}" aria-label="${escapeHtml(row.group.key)} transferring"><small>max ${row.available} combined</small></div></td>
      <td><div class="manual-wrap"><input class="manual" type="number" min="0" max="${maxProjectedDraft}" step="1" data-manual-field="projectedDraft" value="${row.projectedDraft}" aria-label="${escapeHtml(row.group.key)} projected draft"></div></td>
      <td><div class="manual-wrap"><input class="manual" type="number" min="0" max="${maxBeingCut}" step="1" data-manual-field="beingCut" value="${row.beingCut}" aria-label="${escapeHtml(row.group.key)} being cut"></div></td>
      <td><span class="target">${row.group.target}</span></td>
      <td><div class="manual-wrap"><input class="manual" type="number" min="0" max="85" step="1" data-manual-field="recruited" value="${row.recruited}" aria-label="${escapeHtml(row.group.key)} recruited"></div></td>
      <td><div class="need-result"><strong class="still-needed ${needClass}">${row.stillNeeded}</strong><small>${statusText}</small></div></td>
    </tr>`;
  }).join('') + `<tr class="total-row"><td><strong>Total</strong></td><td><strong>${team.roster.length}</strong></td><td><strong>${totalGraduating}</strong></td><td><strong id="totalTransferring">${totalTransferring}</strong></td><td><strong id="totalProjectedDraft">${totalProjectedDraft}</strong></td><td><strong id="totalBeingCut">${totalBeingCut}</strong></td><td><strong>${ROSTER_TARGET_TOTAL}</strong></td><td><strong id="totalRecruited">${totalRecruited}</strong></td><td><strong id="totalNeedCell">${totalStillNeeded}</strong></td></tr>`;
}

function refreshTotals(): void {
  const team = currentTeam();
  if (!team) return;
  let totalTransferring = 0;
  let totalProjectedDraft = 0;
  let totalBeingCut = 0;
  let totalRecruited = 0;
  let totalStillNeeded = 0;
  rows.querySelectorAll<HTMLTableRowElement>('tr[data-target-group]').forEach((row) => {
    const onTeam = Number(row.dataset.onTeam ?? 0);
    const graduating = Number(row.dataset.graduating ?? 0);
    const target = Number(row.dataset.target ?? 0);
    const transferring = clampManual(row.querySelector<HTMLInputElement>('input[data-manual-field="transferring"]')?.value);
    const projectedDraft = clampManual(row.querySelector<HTMLInputElement>('input[data-manual-field="projectedDraft"]')?.value);
    const beingCut = clampManual(row.querySelector<HTMLInputElement>('input[data-manual-field="beingCut"]')?.value);
    const recruited = clampManual(row.querySelector<HTMLInputElement>('input[data-manual-field="recruited"]')?.value);
    const normalized = normalizeTeamNeedsDepartures(onTeam, graduating, transferring, projectedDraft, beingCut);
    totalTransferring += normalized.transferring;
    totalProjectedDraft += normalized.projectedDraft;
    totalBeingCut += normalized.beingCut;
    totalRecruited += recruited;
    totalStillNeeded += calculateTeamNeedsStillNeeded(
      target,
      onTeam,
      graduating,
      normalized.transferring,
      normalized.projectedDraft,
      normalized.beingCut,
      recruited,
    );
  });
  const totalGraduating = team.roster.filter(isGraduatingSenior).length;
  const projectedReturning = team.roster.length - totalGraduating - totalTransferring - totalProjectedDraft - totalBeingCut;
  document.querySelector('#projectedReturning')!.textContent = String(projectedReturning);
  document.querySelector('#totalStillNeeded')!.textContent = String(totalStillNeeded);
  document.querySelector('#recruitedSummary')!.textContent = String(totalRecruited);
  document.querySelector('#totalTransferring')!.textContent = String(totalTransferring);
  document.querySelector('#totalProjectedDraft')!.textContent = String(totalProjectedDraft);
  document.querySelector('#totalBeingCut')!.textContent = String(totalBeingCut);
  document.querySelector('#totalRecruited')!.textContent = String(totalRecruited);
  document.querySelector('#totalNeedCell')!.textContent = String(totalStillNeeded);
  meta.textContent = `${team.teamName} • ${team.roster.length} on roster • ${projectedReturning} projected returning`;
}

function refreshRow(row: HTMLTableRowElement): void {
  const groupKey = row.dataset.targetGroup;
  if (!groupKey) return;
  const target = Number(row.dataset.target ?? 0);
  const onTeam = Number(row.dataset.onTeam ?? 0);
  const graduating = Number(row.dataset.graduating ?? 0);
  const transferringInput = row.querySelector<HTMLInputElement>('input[data-manual-field="transferring"]')!;
  const projectedDraftInput = row.querySelector<HTMLInputElement>('input[data-manual-field="projectedDraft"]')!;
  const beingCutInput = row.querySelector<HTMLInputElement>('input[data-manual-field="beingCut"]')!;
  const recruitedInput = row.querySelector<HTMLInputElement>('input[data-manual-field="recruited"]')!;
  const available = availableTeamNeedsDepartures(onTeam, graduating);
  const normalized = normalizeTeamNeedsDepartures(
    onTeam,
    graduating,
    transferringInput.value,
    projectedDraftInput.value,
    beingCutInput.value,
  );
  const recruited = clampManual(recruitedInput.value);

  transferringInput.value = String(normalized.transferring);
  projectedDraftInput.value = String(normalized.projectedDraft);
  beingCutInput.value = String(normalized.beingCut);
  recruitedInput.value = String(recruited);
  transferringInput.max = String(Math.max(0, available - normalized.projectedDraft - normalized.beingCut));
  projectedDraftInput.max = String(Math.max(0, available - normalized.transferring - normalized.beingCut));
  beingCutInput.max = String(Math.max(0, available - normalized.transferring - normalized.projectedDraft));
  saveManual(groupKey, 'transferring', normalized.transferring);
  saveManual(groupKey, 'projectedDraft', normalized.projectedDraft);
  saveManual(groupKey, 'beingCut', normalized.beingCut);
  saveManual(groupKey, 'recruited', recruited);

  const stillNeeded = calculateTeamNeedsStillNeeded(
    target,
    onTeam,
    graduating,
    normalized.transferring,
    normalized.projectedDraft,
    normalized.beingCut,
    recruited,
  );
  const still = row.querySelector<HTMLElement>('.still-needed');
  const note = still?.nextElementSibling as HTMLElement | null;
  if (still) {
    still.textContent = String(stillNeeded);
    still.className = `still-needed ${stillNeeded > 0 ? 'need-positive' : stillNeeded < 0 ? 'need-surplus' : 'need-balanced'}`;
  }
  if (note) note.textContent = stillNeeded > 0 ? `${stillNeeded} to add` : stillNeeded < 0 ? `${Math.abs(stillNeeded)} over target` : 'On target';
  refreshTotals();
}

rows.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.matches('input[data-manual-field]')) return;
  const row = input.closest<HTMLTableRowElement>('tr[data-target-group]');
  if (row) refreshRow(row);
});

teamSelect.addEventListener('change', () => {
  const parsed = Number(teamSelect.value);
  selectedTeamIndex = Number.isFinite(parsed) && teamSelect.value !== '' ? parsed : null;
  if (selectedTeamIndex != null) localStorage.setItem(LAST_TEAM_KEY, String(selectedTeamIndex));
  renderTeamSelect();
  render();
  updateStatus();
});

resetButton.addEventListener('click', clearManualValues);

importButton.addEventListener('click', async () => {
  importButton.disabled = true;
  importButton.textContent = 'Loading…';
  status.classList.remove('error');
  status.innerHTML = '<span><strong>Reading dynasty save…</strong> Loading Team and Player tables only.</span><span>This can take a moment.</span>';
  try {
    const loaded = await window.teamNeedsAPI.chooseAndLoad();
    if (!loaded) {
      updateStatus();
      return;
    }
    dynasty = loaded;
    const userTeams = loaded.teams.filter((team) => team.isUserControlled);
    const rememberedRaw = localStorage.getItem(LAST_TEAM_KEY);
    const remembered = rememberedRaw == null ? Number.NaN : Number(rememberedRaw);
    const rememberedTeam = loaded.teams.find((team) => team.teamIndex === remembered);
    selectedTeamIndex = userTeams.length === 1 ? userTeams[0].teamIndex : rememberedTeam?.teamIndex ?? null;
    renderTeamSelect();
    render();
    updateStatus();
  } catch (error) {
    status.classList.add('error');
    status.innerHTML = `<span><strong>Import failed.</strong> ${escapeHtml(error instanceof Error ? error.message : String(error))}</span><span>Choose another dynasty save and try again.</span>`;
  } finally {
    importButton.disabled = false;
    importButton.textContent = 'Import Dynasty';
  }
});

renderTeamSelect();
render();
