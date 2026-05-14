type TableGroupedParticipant = {
  id: string;
  status?: string;
  tableNumber?: number;
  opponents?: string[];
};

export function recordTableOpponentHistory<T extends TableGroupedParticipant>(
  participants: T[]
): T[] {
  const byTable = new Map<number, T[]>();

  participants.forEach((participant) => {
    if (participant.tableNumber === undefined || participant.status !== 'active') return;
    const table = byTable.get(participant.tableNumber) ?? [];
    table.push(participant);
    byTable.set(participant.tableNumber, table);
  });

  const opponentsById = new Map<string, Set<string>>();
  byTable.forEach((table) => {
    table.forEach((participant) => {
      const opponents = opponentsById.get(participant.id) ?? new Set(participant.opponents ?? []);
      table.forEach((opponent) => {
        if (opponent.id !== participant.id) opponents.add(opponent.id);
      });
      opponentsById.set(participant.id, opponents);
    });
  });

  return participants.map((participant) => ({
    ...participant,
    opponents: Array.from(opponentsById.get(participant.id) ?? participant.opponents ?? []),
  }));
}
