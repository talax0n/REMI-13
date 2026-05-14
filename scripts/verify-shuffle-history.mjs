import assert from 'node:assert/strict';
import { participants } from '../app/components/participants.ts';
import { generateTables, updateOpponents } from '../lib/shuffle-engine.ts';
import { recordTableOpponentHistory } from '../lib/opponent-history.ts';

function totalOpponentEntries(players) {
  return players.reduce((total, player) => total + player.opponents.size, 0);
}

function toEngineParticipant(player) {
  return {
    id: player.id,
    name: player.name,
    team: player.team,
    score: player.score ?? 0,
    opponents: new Set(player.opponents ?? []),
  };
}

const seededPhaseOne = recordTableOpponentHistory(
  participants
    .filter((participant) => participant.active)
    .map((participant, index) => ({
      id: `participant-${index}`,
      name: participant.name,
      team: participant.team,
      score: 0,
      status: 'active',
      tableNumber: participant.tableNumber,
      opponents: [],
    }))
);

assert.equal(seededPhaseOne.length, 100);
assert.equal(
  seededPhaseOne.reduce((total, player) => total + (player.opponents?.length ?? 0), 0),
  400,
  'seeded phase-1 tablemates should be recorded before the first reshuffle'
);

const phaseTwo = generateTables(seededPhaseOne.map(toEngineParticipant), {
  seed: 42,
  runs: 10,
  maxIter: 30_000,
});
assert.equal(
  phaseTwo.repeatViolations,
  0,
  'phase 2 should use seeded phase-1 opponent history when a no-repeat layout is possible'
);

const generatedPlayers = Array.from({ length: 25 }, (_, index) => ({
  id: `p${index}`,
  name: `Player ${index}`,
  team: `Team ${index % 5}`,
  score: 0,
  opponents: new Set(),
}));

const generatedRoundOne = generateTables(generatedPlayers, {
  seed: 1,
  runs: 8,
  maxIter: 30_000,
});
updateOpponents(generatedRoundOne.tables);
assert.equal(
  totalOpponentEntries(generatedPlayers),
  100,
  'generated round tablemates should be recorded into opponent history'
);

const generatedRoundTwo = generateTables(generatedPlayers, {
  seed: 2,
  runs: 8,
  maxIter: 30_000,
});
assert.equal(
  generatedRoundTwo.repeatViolations,
  0,
  'a second generated round should avoid repeat tablemates when possible'
);

const fallbackPlayers = Array.from({ length: 10 }, (_, index) => ({
  id: `f${index}`,
  name: `Fallback ${index}`,
  team: `Fallback Team ${index % 5}`,
  score: 0,
  opponents: new Set(),
}));
updateOpponents([fallbackPlayers.slice(0, 5), fallbackPlayers.slice(5)]);
assert.equal(
  totalOpponentEntries(fallbackPlayers),
  40,
  'fallback table groups should also record opponent history'
);

console.log('shuffle-history verification passed');
