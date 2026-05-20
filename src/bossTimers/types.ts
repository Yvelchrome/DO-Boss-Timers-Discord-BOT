export type RaidBossStatus = "respawning" | "ready" | "alive";

export type RaidBoss = {
  monster_id: string;
  monster_name: string;
  status: RaidBossStatus;
  map_name: string;
  next_spawn_ts: number;
  respawn_sec: number;
  despawn_sec: number;
};

export type BossInfo = {
  name: string;
  level: number;
  hp: number;
  drops: { item_name: string; drop_type: string }[];
  rewards: { item_name: string; rank: string; qty: string; rate: string }[];
};

export type BossData = {
  raidBoss: RaidBoss;
  bossInfo: BossInfo | null;
  spawnedAtMs: number | null;
};
