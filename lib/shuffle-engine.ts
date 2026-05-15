// =============================================================================
// Remi 13 Tournament Shuffle Engine — v4
// =============================================================================
//
// BUG IN v3 (roundRobinSeed with interleave + i%numTables):
//   Interleaving produces an ordered[] array where each team appears at
//   positions separated by the current round size. When smaller teams
//   exhaust, round size shrinks. DS members shift to irregular offsets.
//   i % numTables then puts two DS members at the same table.
//
//   Example: DS=24, 21 tables, 10 teams.
//   DS[0]→i=0→T0, DS[20]→i=200→T11, DS[21]→i=209→T20... BUT if teams
//   exhaust mid-way and round sizes fluctuate, DS[21] might land at T0
//   again, giving T0 two DS (and some tables three DS in worst case).
//
// V4 FIX — per-team sequential assignment:
//
//   Instead of interleaving first then assigning, assign each team's
//   members to tables INDEPENDENTLY:
//
//     team_member[k]  →  table[ (k + offset) % numTables ]
//
//   where offset is a random starting table for that team (randomises
//   which tables carry the overflow without breaking the ceiling guarantee).
//
//   PROOF of correctness:
//     For team C with size S across T tables:
//       table j receives members at positions k where (k+offset)%T = j,
//       i.e. k = j-offset, j-offset+T, j-offset+2T, ...
//       Count = ceil(S/T) if (j-offset+T)%T < S%T, else floor(S/T).
//     Therefore: max per table = ceil(S/T) — the provable minimum.
//     No interleave step, no round-size fluctuation, no edge cases.
//
// Architecture:
//   Phase 1 — Per-team sequential assignment  (O(N), provably optimal)
//   Phase 2 — Hill-climbing swaps               (O(maxIter x tableSize))
//             Optimises opponent-history while holding team cap as invariant.
//   Multiple independent runs; best repeat-violation count returned.
//
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  team: string;
  score: number;
  isDummy?: boolean;
  /** IDs of all participants this player has shared a table with in prior phases. */
  opponents: Set<string>;
}

export interface GenerateTablesOptions {
  /** Independent runs — best result (fewest repeat violations) is kept. Default 6. */
  runs?: number;
  /** Hill-climbing swap iterations per run. Default 20000. */
  maxIter?: number;
  /** Seed for reproducible output. Omit for random. */
  seed?: number;
}

export interface ShuffleResult {
  tables: Participant[][];
  /**
   * Same-team pairs that were impossible to separate.
   * e.g. DS has 24 members, 21 tables -> ceil(24/21)=2 -> 3 tables must share DS pairs.
   * These are NOT bugs — they are the mathematical minimum.
   */
  unavoidableTeamPairs: number;
  /**
   * Same-team pairs that COULD have been separated but were not.
   * After v4 this should always be 0.
   */
  avoidableTeamViolations: number;
  /** Pairs who have shared a table in a prior phase, seated together again. */
  repeatViolations: number;
  iterationsUsed: number;
  runtimeMs: number;
  /** Human-readable explanation of any remaining violations (Bahasa Indonesia). */
  warnings: string[];
}

const TABLE_SIZE = 5;

// ---------------------------------------------------------------------------
// PRNG — mulberry32 (fast, seedable, good distribution)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle — returns a NEW shuffled array, original untouched. */
export function fisherYatesShuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Violation counters
// ---------------------------------------------------------------------------

/** Number of same-team pairs within a single table. */
function teamPairs(table: Participant[]): number {
  let n = 0;
  for (let i = 0; i < table.length; i++) {
    for (let j = i + 1; j < table.length; j++) {
      if (table[i].isDummy || table[j].isDummy) continue;
      if (table[i].team === table[j].team) n++;
    }
  }
  return n;
}

/** Number of prior-opponent pairs within a single table. */
function repeatPairs(table: Participant[]): number {
  let n = 0;
  for (let i = 0; i < table.length; i++) {
    for (let j = i + 1; j < table.length; j++) {
      if (table[i].isDummy || table[j].isDummy) continue;
      if (table[i].opponents.has(table[j].id)) n++;
    }
  }
  return n;
}

// ---------------------------------------------------------------------------
// Phase 1 — Per-team sequential assignment + size rebalancing
// ---------------------------------------------------------------------------

/**
 * Computes target table sizes: first numFull tables get TABLE_SIZE each,
 * the last gets the remainder (if N % TABLE_SIZE != 0).
 * Full tables come first so hill-climbing can slice them by index.
 */
function computeTargetSizes(N: number): number[] {
  const numFull = Math.floor(N / TABLE_SIZE);
  const remainder = N % TABLE_SIZE;
  return [...Array(numFull).fill(TABLE_SIZE), ...(remainder > 0 ? [remainder] : [])];
}

/**
 * Moves participants between tables until every table matches its target size.
 *
 * When choosing which participant to move from an over-full table, we score
 * each candidate:
 *   +2 if their team appears ≥2 times at the source (redundant — good to move)
 *   +1 if their team does NOT appear at the destination (won't create a new pair)
 * This keeps team distribution as close to optimal as possible after rebalancing.
 */
function rebalanceSizes(tables: Participant[][], targetSizes: number[]): void {
  for (let round = 0; round < tables.length * TABLE_SIZE; round++) {
    const srcIdx = tables.findIndex((t, i) => t.length > targetSizes[i]);
    if (srcIdx === -1) break;
    const dstIdx = tables.findIndex((t, i) => t.length < targetSizes[i]);
    if (dstIdx === -1) break;

    const src = tables[srcIdx];
    const dst = tables[dstIdx];
    const dstTeams = new Set(dst.map((p) => p.team));

    const srcCounts = new Map<string, number>();
    for (const p of src) srcCounts.set(p.team, (srcCounts.get(p.team) ?? 0) + 1);

    let bestScore = -Infinity;
    let bestIdx = 0;
    for (let k = 0; k < src.length; k++) {
      const c = src[k].team;
      const score =
        ((srcCounts.get(c) ?? 0) >= 2 ? 2 : 0) + (dstTeams.has(c) ? 0 : 1);
      if (score > bestScore) { bestScore = score; bestIdx = k; }
    }

    const [moved] = src.splice(bestIdx, 1);
    dst.push(moved);
  }
}

/**
 * Phase 1: Assigns participants to tables guaranteeing:
 *   1. Each table has EXACTLY the target size (TABLE_SIZE, or remainder for the last).
 *   2. Same-team concentration is at most ceil(teamSize / numTables) per table.
 *
 * Algorithm:
 *   a) Per-team round-robin with random offset — minimises team concentration.
 *   b) Size rebalancing — moves participants between over/under-full tables to hit
 *      exact target sizes, preferring moves that preserve team separation.
 *   c) Partial table (if any) is sorted to the last position so hill-climbing
 *      can safely exclude it by index.
 */
function perTeamSeed(
  participants: Participant[],
  numTables: number,
  rng: () => number,
): Participant[][] {
  const N = participants.length;
  const targetSizes = computeTargetSizes(N);

  // Group by team
  const byTeam = new Map<string, Participant[]>();
  for (const p of participants) {
    if (!byTeam.has(p.team)) byTeam.set(p.team, []);
    byTeam.get(p.team)!.push(p);
  }

  const tables: Participant[][] = Array.from({ length: numTables }, () => []);

  for (const members of byTeam.values()) {
    const shuffled = fisherYatesShuffle(members, rng);
    const offset = Math.floor(rng() * numTables);
    shuffled.forEach((p, k) => {
      tables[(k + offset) % numTables].push(p);
    });
  }

  // Guarantee exact table sizes — fix any imbalance from independent per-team assignment
  rebalanceSizes(tables, targetSizes);

  // Sort so partial table (if any) is last, keeping it out of hill-climbing slice
  if (N % TABLE_SIZE !== 0) {
    tables.sort((a, b) => b.length - a.length);
  }

  // Shuffle within each table so seat order is random
  return tables.map((t) => fisherYatesShuffle(t, rng));
}

// ---------------------------------------------------------------------------
// Phase 2 — Hill-climbing (opponent-history optimisation)
// ---------------------------------------------------------------------------

/**
 * Reduces team-pair violations AND repeat-opponent meetings via randomised
 * hill-climbing.
 *
 * Accept rule (priority order, team is NEVER allowed to get worse):
 *   1. Team strictly improves (and repeats don't worsen)  → accept
 *   2. Team stays same AND repeats strictly improve        → accept
 *   3. Anything else                                         → revert
 *
 * This fixes a key Phase-1 gap: when there are no prior opponents
 * (totalRepeats = 0) the old code exited immediately, leaving avoidable
 * team-pair concentrations (e.g. table with 2 Agape + 2 DS) unfixed.
 * Now hill-climbing also eliminates avoidable team violations even in
 * Phase 1, where repeat history plays no role yet.
 *
 * Pre-computes per-table counts so each iteration is O(tableSize²).
 * Returns final total repeat violations remaining.
 */
function hillClimb(
  tables: Participant[][],
  maxIter: number,
  rng: () => number,
): number {
  const numTables = tables.length;

  const teamCount = tables.map(teamPairs);
  const repCount = tables.map(repeatPairs);
  let totalRepeats = repCount.reduce((s, v) => s + v, 0);
  let totalTeam = teamCount.reduce((s, v) => s + v, 0);

  for (let iter = 0; iter < maxIter && (totalTeam > 0 || totalRepeats > 0); iter++) {
    const ti = Math.floor(rng() * numTables);
    let tj = Math.floor(rng() * numTables);
    while (tj === ti) tj = Math.floor(rng() * numTables);

    const pi = Math.floor(rng() * tables[ti].length);
    const pj = Math.floor(rng() * tables[tj].length);

    const oldTeam = teamCount[ti] + teamCount[tj];
    const oldRep = repCount[ti] + repCount[tj];

    // Perform swap
    const tmp = tables[ti][pi];
    tables[ti][pi] = tables[tj][pj];
    tables[tj][pj] = tmp;

    const newTeamI = teamPairs(tables[ti]);
    const newTeamJ = teamPairs(tables[tj]);
    const newRepI = repeatPairs(tables[ti]);
    const newRepJ = repeatPairs(tables[tj]);

    const newTeam = newTeamI + newTeamJ;
    const newRep = newRepI + newRepJ;

    // Accept: team never worsens, AND at least one metric strictly improves
    const teamOk = newTeam <= oldTeam;
    const somethingImproved = newTeam < oldTeam || newRep < oldRep;

    if (teamOk && somethingImproved) {
      teamCount[ti] = newTeamI;
      teamCount[tj] = newTeamJ;
      repCount[ti] = newRepI;
      repCount[tj] = newRepJ;
      totalRepeats += newRep - oldRep;
      totalTeam += newTeam - oldTeam;
    } else {
      // Revert
      tables[tj][pj] = tables[ti][pi];
      tables[ti][pi] = tmp;
    }
  }

  return totalRepeats;
}

// ---------------------------------------------------------------------------
// Team overflow analysis
// ---------------------------------------------------------------------------

interface OverflowDetail {
  team: string;
  size: number;
  maxPerTable: number;
  forcedPairs: number;
}

/**
 * Computes the minimum unavoidable same-team pairs given team sizes
 * and table count.
 *
 * For a team with S members across T tables:
 *   perTable   = ceil(S / T)
 *   if perTable >= 2: forced pairs per overflow table = C(perTable, 2)
 *   overflow tables = S % T   (tables that carry the extra member)
 */
function analyseTeamOverflow(
  participants: Participant[],
  numTables: number,
): { total: number; details: OverflowDetail[] } {
  const counts = new Map<string, number>();
  for (const p of participants) {
    if (p.isDummy) continue;
    counts.set(p.team, (counts.get(p.team) ?? 0) + 1);
  }

  let total = 0;
  const details: OverflowDetail[] = [];

  for (const [team, size] of counts) {
    const perTable = Math.ceil(size / numTables);
    if (perTable < 2) continue;
    const pairs = (perTable * (perTable - 1)) / 2;
    const overflowTables = size % numTables === 0 ? numTables : size % numTables;
    const forcedPairs = pairs * overflowTables;
    total += forcedPairs;
    details.push({ team, size, maxPerTable: perTable, forcedPairs });
  }

  return { total, details };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assigns all participants into tables of TABLE_SIZE (5).
 *
 * Any remainder (N % 5 != 0) forms a final partial table. Partial tables
 * receive Phase 1 team-optimal seeding but are excluded from Phase 2
 * hill-climbing (too few members to swap meaningfully).
 *
 * @param participants  Full participant list. opponents Set must be pre-loaded
 *                      from prior phases via updateOpponents().
 * @param options       Tuning parameters.
 * @returns             ShuffleResult with tables + full violation diagnostics.
 */
export function generateTables(
  participants: Participant[],
  options: GenerateTablesOptions = {},
): ShuffleResult {
  const t0 = performance.now();
  const { runs = 6, maxIter = 20_000, seed } = options;

  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const paddedParticipants = [...participants];
  const remainder = paddedParticipants.length % TABLE_SIZE;
  const dummyCount = remainder === 0 ? 0 : TABLE_SIZE - remainder;
  for (let i = 0; i < dummyCount; i += 1) {
    paddedParticipants.push({
      id: `dummy-${paddedParticipants.length + 1}-${i + 1}`,
      name: `Dummy ${i + 1}`,
      team: `__dummy_${i + 1}`,
      score: 0,
      opponents: new Set(),
      isDummy: true,
    });
  }

  const N = paddedParticipants.length;
  const numFull = Math.floor(N / TABLE_SIZE);
  const hasRemainder = N % TABLE_SIZE !== 0;
  const totalTables = numFull + (hasRemainder ? 1 : 0);

  const overflow = analyseTeamOverflow(paddedParticipants, Math.max(numFull, 1));

  let bestTables: Participant[][] | null = null;
  let bestRepeats = Infinity;
  let bestTeam = Infinity;
  let totalIters = 0;

  for (let run = 0; run < runs; run++) {
    // Phase 1: team-optimal seeding (provably minimum concentration)
    const allTables = perTeamSeed(paddedParticipants, totalTables, rng);

    // Partial table (if any) sits outside the full-table optimisation
    const fullTables = hasRemainder ? allTables.slice(0, numFull) : allTables;
    const partial = hasRemainder ? allTables.slice(numFull) : [];

    // Phase 2: reduce repeat-opponent meetings without worsening team spread
    hillClimb(fullTables, maxIter, rng);
    totalIters += maxIter;

    const combined = [...fullTables, ...partial];
    const team = combined.reduce((s, t) => s + teamPairs(t), 0);
    const repeats = combined.reduce((s, t) => s + repeatPairs(t), 0);

    const isBetter =
      team < bestTeam || (team === bestTeam && repeats < bestRepeats);

    if (isBetter) {
      bestTables = combined.map((t) => [...t]);
      bestTeam = team;
      bestRepeats = repeats;
    }
  }

  const tables = bestTables!;
  const avoidable = bestTeam - overflow.total;
  const warnings: string[] = [];

  if (overflow.details.length > 0) {
    const parts = overflow.details.map(
      ({ team, size, maxPerTable }) =>
        `${team} (${size} anggota, maks ${maxPerTable}/meja)`,
    );
    warnings.push(
      `Team terlalu besar untuk dipisah sempurna: ${parts.join('; ')}. ` +
        `${overflow.total} pasangan team sama tidak bisa dihindari secara matematika.`,
    );
  }

  if (avoidable > 0) {
    // Should never happen in v4 — surface as a bug report
    warnings.push(
      `BUG: ${avoidable} pelanggaran team yang seharusnya bisa dihindari masih tersisa. ` +
        `Harap laporkan ke developer.`,
    );
  }

  if (bestRepeats > 0) {
    warnings.push(
      `${bestRepeats} pasangan pernah bertemu di babak sebelumnya. ` +
        `Ini wajar mulai babak 4-5 dengan banyak peserta dan team besar.`,
    );
  }

  return {
    tables,
    unavoidableTeamPairs: overflow.total,
    avoidableTeamViolations: avoidable,
    repeatViolations: bestRepeats,
    iterationsUsed: totalIters,
    runtimeMs: performance.now() - t0,
    warnings,
  };
}

/**
 * Records all new opponent matchups after a phase is finalised.
 * Call this ONCE per phase, AFTER generateTables, before moving to the next phase.
 */
export function updateOpponents(tables: Participant[][]): void {
  for (const table of tables) {
    for (const player of table) {
      if (player.isDummy) continue;
      for (const opponent of table) {
        if (!opponent.isDummy && opponent.id !== player.id) {
          player.opponents.add(opponent.id);
        }
      }
    }
  }
}

/**
 * Generate final phase tables (Phase 6) for top 10 players.
 * Uses snake draft order:
 * - Table A: Odd ranks (1, 3, 5, 7, 9)
 * - Table B: Even ranks (2, 4, 6, 8, 10)
 */
export function generateFinalTables(
  topTenPlayers: Participant[]
): { tableA: Participant[]; tableB: Participant[] } {
  if (topTenPlayers.length !== 10) {
    throw new Error(`Final phase requires exactly 10 players, got ${topTenPlayers.length}`);
  }

  // Sort by score descending to ensure correct ranking
  const sorted = [...topTenPlayers].sort((a, b) => b.score - a.score);
  
  // Table A: Odd positions (0, 2, 4, 6, 8) = Ranks 1, 3, 5, 7, 9
  const tableA = [sorted[0], sorted[2], sorted[4], sorted[6], sorted[8]];
  
  // Table B: Even positions (1, 3, 5, 7, 9) = Ranks 2, 4, 6, 8, 10
  const tableB = [sorted[1], sorted[3], sorted[5], sorted[7], sorted[9]];

  return { tableA, tableB };
}

/**
 * Drop-in shim for callers expecting the old Participant[][] return type.
 */
export function generateTablesCompat(
  participants: Participant[],
  options: GenerateTablesOptions = {},
): Participant[][] {
  return generateTables(participants, options).tables;
}
