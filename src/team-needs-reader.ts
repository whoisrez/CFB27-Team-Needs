import path from 'node:path';
import Franchise from 'madden-franchise';

export type TeamNeedsPlayer = {
  position: string;
  schoolYear: string;
  redshirtStatus: string;
};

export type TeamNeedsTeam = {
  teamName: string;
  teamIndex: number;
  isUserControlled: boolean;
  roster: TeamNeedsPlayer[];
};

export type TeamNeedsDynasty = {
  filePath: string;
  teams: TeamNeedsTeam[];
};

type FranchiseReferenceFieldLike = {
  isReference?: boolean;
  referenceData?: {
    tableId?: number;
    rowNumber?: number;
  } | null;
};

type FranchiseRecordLike = Record<string, unknown> & {
  isEmpty?: boolean;
  fields?: Record<string, FranchiseReferenceFieldLike>;
};
type FranchiseTableLike = {
  header: { recordCapacity: number };
  records: FranchiseRecordLike[];
  readRecords: (attributes?: string[]) => Promise<void>;
};
type FranchiseLike = {
  getAllTablesByName: (name: string) => FranchiseTableLike[];
};

function largestTable(franchise: FranchiseLike, name: string): FranchiseTableLike {
  const tables = franchise.getAllTablesByName(name);
  if (!tables || tables.length === 0) throw new Error(`No table found named "${name}".`);
  return tables.reduce((largest, table) => table.header.recordCapacity > largest.header.recordCapacity ? table : largest);
}

function nonEmpty(records: FranchiseRecordLike[]): FranchiseRecordLike[] {
  return records.filter((record) => !record.isEmpty);
}

function teamName(record: FranchiseRecordLike): string {
  return String(record.DisplayName ?? record.LongName ?? record.ShortName ?? '').trim();
}

function truthy(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const text = String(value ?? '').trim().toLowerCase();
  return text === 'true' || text === '1' || text === 'yes';
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function appearsUserControlled(record: FranchiseRecordLike): boolean {
  const exactCandidates = new Set([
    'isusercontrolled',
    'usercontrolled',
    'isuserteam',
    'userteam',
    'ishumancontrolled',
    'humancontrolled',
  ]);

  return Object.entries(record).some(([key, value]) => {
    if (!truthy(value)) return false;
    const normalized = normalizeKey(key);
    if (exactCandidates.has(normalized)) return true;

    const mentionsUser = normalized.includes('user') || normalized.includes('human');
    const mentionsControl = normalized.includes('control') || normalized.includes('team');
    return mentionsUser && mentionsControl;
  });
}

function hasUserCharacterReference(record: FranchiseRecordLike): boolean {
  const field = record.fields?.UserCharacter;
  if (!field?.isReference) return false;
  const tableId = Number(field.referenceData?.tableId ?? 0);
  return Number.isFinite(tableId) && tableId !== 0;
}

function recordTeamIndex(record: FranchiseRecordLike): number | null {
  const direct = Number(record.TeamIndex);
  if (Number.isFinite(direct)) return direct;

  for (const [key, value] of Object.entries(record)) {
    const normalized = normalizeKey(key);
    if (normalized !== 'teamindex' && normalized !== 'teamid') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function userControlledTeamIndices(franchise: FranchiseLike): Promise<Set<number>> {
  const userTeams = new Set<number>();
  const coachTables = franchise.getAllTablesByName('Coach') ?? [];

  for (const table of coachTables) {
    try {
      // This is only a compatibility fallback for saves where Team.UserCharacter
      // is unavailable. Coach metadata can be stale after a coaching change.
      await table.readRecords();
      for (const record of nonEmpty(table.records)) {
        if (!appearsUserControlled(record)) continue;
        const teamIndex = recordTeamIndex(record);
        if (teamIndex != null) userTeams.add(teamIndex);
      }
    } catch {
      // Some CFB 27 updates change the Coach schema. Team Needs does not depend
      // on that table, so failure here simply falls back to Team flags, save-name
      // matching, and the user's remembered selection.
    }
  }

  return userTeams;
}

function saveNameMatchesTeam(filePath: string, name: string): boolean {
  const saveName = normalizeKey(path.basename(filePath, path.extname(filePath)));
  const normalizedTeamName = normalizeKey(name);
  return normalizedTeamName.length >= 3 && saveName.includes(normalizedTeamName);
}

export async function loadTeamNeedsDynasty(filePath: string): Promise<TeamNeedsDynasty> {
  const opened = await Franchise.create(filePath);
  const franchise = opened as unknown as FranchiseLike;

  const teamTable = largestTable(franchise, 'Team');
  const playerTable = largestTable(franchise, 'Player');
  await teamTable.readRecords();
  await playerTable.readRecords();

  const teamRecords = nonEmpty(teamTable.records);
  const userCharacterTeams = new Set<number>();
  for (const record of teamRecords) {
    const index = recordTeamIndex(record);
    if (index != null && hasUserCharacterReference(record)) userCharacterTeams.add(index);
  }

  // Team.UserCharacter is CFB 27's authoritative current human-team signal.
  // Only consult older heuristics when no usable UserCharacter reference exists.
  const coachUserTeams = userCharacterTeams.size === 0
    ? await userControlledTeamIndices(franchise)
    : new Set<number>();

  const playersByTeam = new Map<number, TeamNeedsPlayer[]>();
  for (const record of nonEmpty(playerTable.records)) {
    const index = Number(record.TeamIndex);
    if (!Number.isFinite(index) || !String(record.LastName ?? '').trim()) continue;
    const player: TeamNeedsPlayer = {
      position: String(record.Position ?? '').trim(),
      schoolYear: String(record.SchoolYear ?? '').trim(),
      redshirtStatus: String(record.RedshirtStatus ?? '').trim(),
    };
    const roster = playersByTeam.get(index) ?? [];
    roster.push(player);
    playersByTeam.set(index, roster);
  }

  const teams: TeamNeedsTeam[] = [];
  for (const record of teamRecords) {
    const index = Number(record.TeamIndex);
    const name = teamName(record);
    const roster = playersByTeam.get(index) ?? [];
    if (!Number.isFinite(index) || !name || roster.length === 0) continue;
    teams.push({
      teamName: name,
      teamIndex: index,
      isUserControlled: userCharacterTeams.size > 0
        ? userCharacterTeams.has(index)
        : appearsUserControlled(record)
          || coachUserTeams.has(index)
          || saveNameMatchesTeam(filePath, name),
      roster,
    });
  }

  teams.sort((a, b) => Number(b.isUserControlled) - Number(a.isUserControlled) || a.teamName.localeCompare(b.teamName));
  if (teams.length === 0) throw new Error('The save opened, but no team rosters could be read.');
  return { filePath, teams };
}
