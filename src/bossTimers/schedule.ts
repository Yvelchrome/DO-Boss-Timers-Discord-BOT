import type { BossSchedule } from "./types.js";

export function getDefaultBossSchedule(): BossSchedule {
  const schedule = {
    anchorUtcMs: Date.UTC(2026, 4, 17, 15, 49, 19),
    aliveWindowMs: 105_000,
    respawnWaitMs: 90 * 60_000,
    updatedAtMs: Date.UTC(2026, 4, 17, 15, 49, 19),
  };

  return schedule;
}

function bossPeriodMs(schedule: BossSchedule): number {
  return schedule.aliveWindowMs + schedule.respawnWaitMs;
}

export function lastBossSpawnUtcMs(
  atMs: number,
  s: BossSchedule,
): number | null {
  const diff = atMs - s.anchorUtcMs;
  if (diff < 0) return null;
  const result =
    s.anchorUtcMs + Math.floor(diff / bossPeriodMs(s)) * bossPeriodMs(s);

  return result;
}

export function nextBossSpawnUtcMs(atMs: number, s: BossSchedule): number {
  const diff = atMs - s.anchorUtcMs;
  if (diff < 0) return s.anchorUtcMs;
  const result =
    s.anchorUtcMs + (Math.floor(diff / bossPeriodMs(s)) + 1) * bossPeriodMs(s);

  return result;
}

export function isBossAlive(atMs: number, s: BossSchedule): boolean {
  const last = lastBossSpawnUtcMs(atMs, s);
  const result = last !== null && atMs < last + s.aliveWindowMs;

  return result;
}
