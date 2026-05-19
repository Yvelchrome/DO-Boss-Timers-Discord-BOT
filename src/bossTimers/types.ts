export type BossSchedule = {
  anchorUtcMs: number;
  aliveWindowMs: number;
  respawnWaitMs: number;
  updatedAtMs: number;
};

export type BossInfo = {
  name: string;
  mapName: string;
  hp: number;
  level: number;
  drops: { itemName: string; dropType: string }[];
  rewards: { itemName: string; rank: string; qty: string; rate: string }[];
};
