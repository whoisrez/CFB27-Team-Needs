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

type FranchiseRecordLike = Record<string, unknown> & { isEmpty?: boolean };
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

function appearsUserControlled(record: FranchiseRecordLike): boolean {
  const candidates = [
    'IsUserControlled',
    'UserControlled',
    'IsUserTeam',
    'UserTeam',
    'IsHumanControlled',
    'HumanControlled',
  ];
  return candidates.some((key) => truthy(record[key]));
}

async function userControlledTeamIndices(franchise: FranchiseLike): Promise<Set<number>> {
  const userTeams = new Set<number>();
  const coachTables = franchise.getAllTablesByName('Coach') ?? [];

  for (const table of coachTables) {
    try {
      await table.readRecords(['IsUserControlled', 'TeamIndex']);
      for (const record of nonEmpty(table.records)) {
        if (!truthy(record.IsUserControlled)) continue;
        const teamIndex = Number(record.TeamIndex);
        if (Number.isFinite(teamIndex)) userTeams.add(teamIndex);
      }
    } catch {
      // Some CFB 27 updates change the Coach schema. Team Needs does not depend
      // on that table, so failure here simply falls back to Team flags and the
      // user's remembered selection instead of making the whole import fail.
    }
  }

  return userTeams;
}

export async function loadTeamNeedsDynasty(filePath: string): Promise<TeamNeedsDynasty> {
  const opened = await Franchise.create(filePath);
  const franchise = opened as unknown as FranchiseLike;

  const teamTable = largestTable(franchise, 'Team');
  const playerTable = largestTable(franchise, 'Player');
  await teamTable.readRecords();
  await playerTable.readRecords();
  const coachUserTeams = await userControlledTeamIndices(franchise);

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
  for (const record of nonEmpty(teamTable.records)) {
    const index = Number(record.TeamIndex);
    const name = teamName(record);
    const roster = playersByTeam.get(index) ?? [];
    if (!Number.isFinite(index) || !name || roster.length === 0) continue;
    teams.push({
      teamName: name,
      teamIndex: index,
      isUserControlled: appearsUserControlled(record) || coachUserTeams.has(index),
      roster,
    });
  }

  teams.sort((a, b) => Number(b.isUserControlled) - Number(a.isUserControlled) || a.teamName.localeCompare(b.teamName));
  if (teams.length === 0) throw new Error('The save opened, but no team rosters could be read.');
  return { filePath, teams };
}
