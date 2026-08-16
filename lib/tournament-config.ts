/**
 * Remi 13 competition rules.
 *
 * Keep these values in one place so the admin flow, public display, and player
 * score view all describe the same tournament format.
 */
export const REMI13_RULES = {
  targetParticipants: 60,
  tableSize: 5,
  totalPhases: 5,
  shufflesPerPhase: 6,
  individualWinners: 5,
  defaultKocokanDurationSeconds: 15 * 60,
} as const;

// Legacy phase columns remain in the database for backwards compatibility.
// A value after the final regular phase makes all five phases cumulative for
// existing SQL that used the old semifinal boundary.
export const LEGACY_SEMIFINAL_PHASE = REMI13_RULES.totalPhases + 1;
