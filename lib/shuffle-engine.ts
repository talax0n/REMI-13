// =============================================================================
// Remi 13 Tournament Shuffle Engine
// =============================================================================

export interface Participant {
  id: string;
  name: string;
  church: string;
  score: number;
  opponents: Set<string>;
}

// -----------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — deterministic when seed is provided
// -----------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -----------------------------------------------------------------------------
// Step 1 — Sort participants by score descending
// -----------------------------------------------------------------------------

export function sortParticipants(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => b.score - a.score);
}

// -----------------------------------------------------------------------------
// Step 2 — Group sorted participants into buckets of ~10
// -----------------------------------------------------------------------------

export function createBuckets(
  sorted: Participant[],
  bucketSize = 10,
): Participant[][] {
  const buckets: Participant[][] = [];
  for (let i = 0; i < sorted.length; i += bucketSize) {
    buckets.push(sorted.slice(i, i + bucketSize));
  }
  return buckets;
}

// -----------------------------------------------------------------------------
// Step 3 — Fisher–Yates in-place shuffle (operates on a single bucket)
// -----------------------------------------------------------------------------

export function fisherYatesShuffle<T>(
  array: T[],
  random: () => number = Math.random,
): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -----------------------------------------------------------------------------
// Constraint checkers
// -----------------------------------------------------------------------------

export function violatesChurch(
  table: Participant[],
  candidate: Participant,
): boolean {
  return table.some((p) => p.church === candidate.church);
}

export function violatesRepeat(
  table: Participant[],
  candidate: Participant,
): boolean {
  // candidate has already faced someone at this table, OR
  // someone at this table has already faced candidate
  return table.some(
    (p) => p.opponents.has(candidate.id) || candidate.opponents.has(p.id),
  );
}

// -----------------------------------------------------------------------------
// Step 4 — Try to build tables from a flat shuffled pool (backtracking)
// -----------------------------------------------------------------------------

const TABLE_SIZE = 5;

export function tryBuildTables(
  pool: Participant[],
  relaxRepeat = false,
): Participant[][] | null {
  const tables: Participant[][] = [];
  const used = new Set<string>();

  // Greedy pass with light look-ahead
  outer: for (let i = 0; i < pool.length; i++) {
    if (used.has(pool[i].id)) continue;

    const table: Participant[] = [pool[i]];
    used.add(pool[i].id);

    for (let j = i + 1; j < pool.length && table.length < TABLE_SIZE; j++) {
      const candidate = pool[j];
      if (used.has(candidate.id)) continue;

      if (violatesChurch(table, candidate)) continue;
      if (!relaxRepeat && violatesRepeat(table, candidate)) continue;

      table.push(candidate);
      used.add(candidate.id);
    }

    if (table.length === TABLE_SIZE) {
      tables.push(table);
    } else {
      // Return unused seats back to the pool for next attempt
      for (const p of table) used.delete(p.id);

      // Backtrack: skip this starting participant and try from the next
      // (avoids infinite loops while still exploring alternatives)
      if (!relaxRepeat) return null; // signal caller to retry with reshuffle
    }
  }

  // Verify every participant was seated (handles remainder logic)
  const seated = tables.flat().length;
  if (seated !== pool.length) return null;

  return tables;
}

// -----------------------------------------------------------------------------
// Step 5 — Top-level table generator with retry loop
// -----------------------------------------------------------------------------

export interface GenerateTablesOptions {
  bucketSize?: number;
  maxAttempts?: number;
  seed?: number;
  fallbackRelaxRepeat?: boolean;
}

export function generateTables(
  participants: Participant[],
  options: GenerateTablesOptions = {},
): Participant[][] {
  const {
    bucketSize = 10,
    maxAttempts = 20,
    seed,
    fallbackRelaxRepeat = false,
  } = options;

  if (participants.length % TABLE_SIZE !== 0) {
    throw new Error(
      `Participant count (${participants.length}) must be divisible by ${TABLE_SIZE}.`,
    );
  }

  const random = seed !== undefined ? mulberry32(seed) : Math.random;
  const sorted = sortParticipants(participants);
  const buckets = createBuckets(sorted, bucketSize);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Shuffle within each bucket independently, then flatten into one pool
    const pool: Participant[] = buckets.flatMap((bucket) =>
      fisherYatesShuffle(bucket, random),
    );

    // First try with all constraints enforced
    let result = tryBuildTables(pool, false);

    if (result) return result;

    // If fallback is enabled and we've exhausted most attempts, relax repeat constraint
    if (fallbackRelaxRepeat && attempt >= Math.floor(maxAttempts * 0.75)) {
      result = tryBuildTables(pool, true);
      if (result) return result;
    }
  }

  throw new Error(
    `Failed to generate valid tables after ${maxAttempts} attempts. ` +
      `Consider enabling fallbackRelaxRepeat or reviewing church distribution.`,
  );
}

// -----------------------------------------------------------------------------
// Step 6 — Update opponent history after tables are finalised
// -----------------------------------------------------------------------------

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
