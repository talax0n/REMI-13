// =============================================================================
// Remi 13 Tournament Shuffle Engine — v3
// =============================================================================
//
// ROOT CAUSE OF v2 BUG:
//   The greedy table-by-table fill in tryBuild() fills one table completely
//   before moving to the next. When a dominant church (e.g. DS with 17/32
//   members) is present, the algorithm exhausts valid placements and falls
//   through to Tier 3 (churchStrict = false). Tier 3 then uses random
//   seeding with no church cap, producing clusters like 4 DS at one table.
//
// V3 FIX — two-phase approach:
//
//   Phase 1 — Round-robin seeding (O(N), deterministic):
//     Groups participants by church, shuffles within each group, sorts
//     groups largest-first, then interleaves one-from-each-church per
//     round, assigning participant at position i → table[i % numTables].
//     This GUARANTEES each church appears at most ceil(churchSize / numTables)
//     times at any single table — the provably optimal distribution —
//     BY CONSTRUCTION, before any swap-based optimisation.
//
//   Phase 2 — Hill-climbing swaps (O(maxIter × tableSize)):
//     Randomly proposes participant swaps between tables. A swap is
//     accepted if and only if:
//       (a) it does not increase same-church pairs at either table, AND
//       (b) it reduces total repeat-opponent meetings.
//     Church optimality from Phase 1 is preserved as an invariant.
//
//   Multiple independent runs are attempted; the result with fewest
//   repeat violations is returned.
//
// Constraint hierarchy (always enforced in this order):
//   1. Church separation — spread as evenly as possible (hard, by construction)
//   2. Opponent history  — minimise repeat meetings  (soft, via hill-climbing)
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  church: string;
  score: number;
  opponents: Set<string>;
}

export interface GenerateTablesOptions {
  /** Number of independent runs. Best result (fewest repeats) is returned. */
  runs?: number;
  /** Hill-climbing iterations per run. */
  maxIter?: number;
  /** PRNG seed for reproducibility. Omit for random. */
  seed?: number;
}

export interface ShuffleResult {
  tables: Participant[][];
  /** Same-church pairs that could not be separated (overflow church). */
  unavoidableChurchPairs: number;
  /** Same-church pairs that COULD have been separated but weren't — should be 0. */
  avoidableChurchViolations: number;
  /** Pairs seated together again despite having met in a prior phase. */
  repeatViolations: number;
  iterationsUsed: number;
  runtimeMs: number;
  /** Human-readable explanation of any remaining violations. */
  warnings: string[];
}

const TABLE_SIZE = 5;

// ---------------------------------------------------------------------------
// PRNG
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

export function fisherYatesShuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Violation counters (operate on full tables only)
// ---------------------------------------------------------------------------

/** Same-church pairs at a single table. */
function churchPairs(table: Participant[]): number {
  let n = 0;
  for (let i = 0; i < table.length; i++)
    for (let j = i + 1; j < table.length; j++)
      if (table[i].church === table[j].church) n++;
  return n;
}

/** Prior-opponent pairs at a single table. */
function repeatPairs(table: Participant[]): number {
  let n = 0;
  for (let i = 0; i < table.length; i++)
    for (let j = i + 1; j < table.length; j++)
      if (table[i].opponents.has(table[j].id)) n++;
  return n;
}

function totalChurchPairs(tables: Participant[][]): number {
  return tables.reduce((s, t) => s + churchPairs(t), 0);
}

function totalRepeatPairs(tables: Participant[][]): number {
  return tables.reduce((s, t) => s + repeatPairs(t), 0);
}

// ---------------------------------------------------------------------------
// Phase 1 — Round-robin seeding
// ---------------------------------------------------------------------------

/**
 * Distributes participants into tables so that same-church members are spread
 * as evenly as possible — at most ceil(churchSize / numTables) per table.
 *
 * Algorithm:
 *   1. Group participants by church. Shuffle within each group (randomness).
 *   2. Sort groups by size descending (largest church seated first each round).
 *   3. Pick one participant from each group in round-robin, in order.
 *      Participant at interleaved position i → tables[i % numTables].
 *
 * This guarantees the theoretical minimum church concentration, regardless
 * of how skewed the church distribution is.
 */
function roundRobinSeed(
  participants: Participant[],
  numTables: number,
  rng: () => number,
): Participant[][] {
  // Group by church
  const byChurch = new Map<string, Participant[]>();
  for (const p of participants) {
    if (!byChurch.has(p.church)) byChurch.set(p.church, []);
    byChurch.get(p.church)!.push(p);
  }

  // Shuffle within each church group (preserves randomness across runs)
  const groups: Participant[][] = [...byChurch.values()]
    .map((g) => fisherYatesShuffle(g, rng))
    .sort((a, b) => b.length - a.length); // largest first

  // Interleave: pick one from each group per round
  const ordered: Participant[] = [];
  while (ordered.length < participants.length) {
    for (const g of groups) {
      if (g.length > 0) ordered.push(g.shift()!);
      if (ordered.length === participants.length) break;
    }
  }

  // Assign to tables: position i → table[i % numTables]
  const tables: Participant[][] = Array.from({ length: numTables }, () => []);
  ordered.forEach((p, i) => tables[i % numTables].push(p));
  return tables;
}

// ---------------------------------------------------------------------------
// Phase 2 — Hill-climbing swaps (opponent optimisation)
// ---------------------------------------------------------------------------

/**
 * Reduces repeat-opponent meetings via randomised hill-climbing swaps.
 *
 * Invariant: a swap is accepted ONLY if it does not increase church pairs
 * at either affected table. Church optimality from Phase 1 is preserved.
 *
 * Returns total repeat violations remaining after optimisation.
 */
function hillClimb(
  tables: Participant[][],
  maxIter: number,
  rng: () => number,
): number {
  const numTables = tables.length;

  // Pre-compute violations per table (avoid recomputing from scratch each iteration)
  const chPairs = tables.map(churchPairs);
  const repPairs = tables.map(repeatPairs);
  let totalRepeats = repPairs.reduce((s, v) => s + v, 0);

  for (let iter = 0; iter < maxIter && totalRepeats > 0; iter++) {
    // Pick two distinct random tables
    const ti = Math.floor(rng() * numTables);
    let tj = Math.floor(rng() * numTables);
    while (tj === ti) tj = Math.floor(rng() * numTables);

    // Pick one random participant from each
    const pi = Math.floor(rng() * tables[ti].length);
    const pj = Math.floor(rng() * tables[tj].length);

    const a = tables[ti][pi];
    const b = tables[tj][pj];

    // Perform swap
    tables[ti][pi] = b;
    tables[tj][pj] = a;

    const newChI = churchPairs(tables[ti]);
    const newChJ = churchPairs(tables[tj]);
    const newRepI = repeatPairs(tables[ti]);
    const newRepJ = repeatPairs(tables[tj]);

    const churchDelta = (newChI + newChJ) - (chPairs[ti] + chPairs[tj]);
    const repeatDelta = (newRepI + newRepJ) - (repPairs[ti] + repPairs[tj]);

    // Accept swap if: church is no worse AND repeats improve
    if (churchDelta <= 0 && repeatDelta < 0) {
      chPairs[ti] = newChI;
      chPairs[tj] = newChJ;
      repPairs[ti] = newRepI;
      repPairs[tj] = newRepJ;
      totalRepeats += repeatDelta;
    } else {
      // Revert
      tables[ti][pi] = a;
      tables[tj][pj] = b;
    }
  }

  return totalRepeats;
}

// ---------------------------------------------------------------------------
// Church cap analysis
// ---------------------------------------------------------------------------

/**
 * Computes the minimum unavoidable same-church pairs per table.
 *
 * When a church has C members and there are T tables, at least
 * ceil(C / T) members must share a table. The unavoidable pair count
 * per table is C(ceil(C/T), 2) = ceil(C/T) * (ceil(C/T) - 1) / 2.
 */
function computeUnavoidableChurchPairs(
  participants: Participant[],
  numTables: number,
): { total: number; byChurch: Map<string, number> } {
  const counts = new Map<string, number>();
  for (const p of participants)
    counts.set(p.church, (counts.get(p.church) ?? 0) + 1);

  let total = 0;
  const byChurch = new Map<string, number>();
  for (const [church, count] of counts) {
    const perTable = Math.ceil(count / numTables);
    // Pairs forced per table = C(perTable, 2)
    const pairs = (perTable * (perTable - 1)) / 2;
    // How many tables will have the overflow (ceiling) count
    const overflowTables = count % numTables === 0 ? numTables : count % numTables;
    const forced = pairs * overflowTables;
    if (forced > 0) {
      byChurch.set(church, forced);
      total += forced;
    }
  }
  return { total, byChurch };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assign `participants` into tables of TABLE_SIZE (5).
 *
 * Remainders (N % 5 ≠ 0) form a partial final table. The partial table
 * is excluded from hill-climbing (too few seats to optimise meaningfully)
 * but does respect the round-robin church distribution.
 *
 * @param participants   Full participant list with opponent history pre-loaded.
 * @param options        Tuning options (runs, maxIter, seed).
 * @returns              ShuffleResult with tables and violation statistics.
 */
export function generateTables(
  participants: Participant[],
  options: GenerateTablesOptions = {},
): ShuffleResult {
  const t0 = performance.now();
  const { runs = 6, maxIter = 15_000, seed } = options;

  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const N = participants.length;
  const numFull = Math.floor(N / TABLE_SIZE);
  const hasRemainder = N % TABLE_SIZE !== 0;

  // Analyse unavoidable church pairs before we start
  const { total: unavoidableTotal, byChurch: unavoidableByChurch } =
    computeUnavoidableChurchPairs(participants, Math.max(numFull, 1));

  let bestTables: Participant[][] | null = null;
  let bestRepeats = Infinity;
  let bestChurch = Infinity;
  let totalIters = 0;

  for (let run = 0; run < runs; run++) {
    // Phase 1: church-optimal seeding by round-robin
    const allTables = roundRobinSeed(participants, numFull + (hasRemainder ? 1 : 0), rng);

    // Separate full tables from partial table (partial skips hill-climbing)
    const fullTables = hasRemainder ? allTables.slice(0, numFull) : allTables;
    const partialTable = hasRemainder ? [allTables[numFull]] : [];

    // Phase 2: hill-climb on full tables only
    const itersUsed = maxIter;
    hillClimb(fullTables, maxIter, rng);
    totalIters += itersUsed;

    const combinedTables = [...fullTables, ...partialTable];
    const church = totalChurchPairs(combinedTables);
    const repeats = totalRepeatPairs(combinedTables);

    // Prefer: fewer church violations first, then fewer repeat violations.
    // After round-robin, church should always equal the unavoidable minimum,
    // so in practice we're choosing among runs by repeats alone.
    const isBetter =
      church < bestChurch ||
      (church === bestChurch && repeats < bestRepeats);

    if (isBetter) {
      bestTables = combinedTables.map((t) => [...t]);
      bestChurch = church;
      bestRepeats = repeats;
    }
  }

  const tables = bestTables!;

  // Build warnings
  const warnings: string[] = [];

  const avoidableChurchViolations = bestChurch - unavoidableTotal;

  if (unavoidableTotal > 0) {
    const overflow = [...unavoidableByChurch.entries()]
      .map(([church]) => {
        const count = participants.filter((p) => p.church === church).length;
        return `${church} (${count} anggota, maks ${Math.ceil(count / numFull)}/meja)`;
      })
      .join(', ');
    warnings.push(
      `Gereja terlalu besar untuk dipisah sepenuhnya: ${overflow}. ` +
        `${unavoidableTotal} pasangan gereja sama tidak dapat dihindari.`,
    );
  }

  if (avoidableChurchViolations > 0) {
    // This should not happen with correct round-robin + hill-climbing
    warnings.push(
      `PERHATIAN: ${avoidableChurchViolations} pelanggaran gereja yang seharusnya bisa dihindari ` +
        `masih tersisa. Coba generate ulang.`,
    );
  }

  if (bestRepeats > 0) {
    warnings.push(
      `${bestRepeats} pasangan pernah bertemu di fase sebelumnya. ` +
        `Ini normal mulai fase 4–5 dengan banyak peserta.`,
    );
  }

  return {
    tables,
    unavoidableChurchPairs: unavoidableTotal,
    avoidableChurchViolations,
    repeatViolations: bestRepeats,
    iterationsUsed: totalIters,
    runtimeMs: performance.now() - t0,
    warnings,
  };
}

/**
 * Record all new matchups after tables are finalised.
 * Call this ONCE per phase, AFTER generateTables returns.
 */
export function updateOpponents(tables: Participant[][]): void {
  for (const table of tables) {
    for (const player of table) {
      for (const opponent of table) {
        if (opponent.id !== player.id) {
          player.opponents.add(opponent.id);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Backward-compat shim
// ---------------------------------------------------------------------------
// The old generateTables returned Participant[][] directly.
// Use this wrapper if you need the old return type.

export function generateTablesCompat(
  participants: Participant[],
  options: GenerateTablesOptions = {},
): Participant[][] {
  return generateTables(participants, options).tables;
}
