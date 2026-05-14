export interface ParticipantData {
  name: string;
  team: string;
  active: boolean;
  tableNumber?: number;
}

export const participants: ParticipantData[] = [];
