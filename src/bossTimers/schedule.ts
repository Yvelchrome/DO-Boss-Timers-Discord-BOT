import type { BossSchedule } from "./types";

export function getDefaultBossSchedule(): BossSchedule {
  return {
    anchorUtcMs: Date.UTC(2026, 4, 17, 15, 49, 19),
    aliveWindowMs: 105_000,
    respawnWaitMs: 90 * 60_000,
    updatedAtMs: Date.UTC(2026, 4, 17, 15, 49, 19),
  };
}

function bossPeriodMs(schedule: BossSchedule): number {
  return schedule.aliveWindowMs + schedule.respawnWaitMs;
}

export function lastBossSpawnUtcMs(
  atMs: number,
  schedule: BossSchedule,
): number | null {
  const diff = atMs - schedule.anchorUtcMs;
  if (diff < 0) {
    return null;
  }

  const result =
    schedule.anchorUtcMs +
    Math.floor(diff / bossPeriodMs(schedule)) * bossPeriodMs(schedule);

  return result;
}

export function nextBossSpawnUtcMs(
  atMs: number,
  schedule: BossSchedule,
): number {
  const diff = atMs - schedule.anchorUtcMs;
  if (diff < 0) {
    return schedule.anchorUtcMs;
  }

  const result =
    schedule.anchorUtcMs +
    (Math.floor(diff / bossPeriodMs(schedule)) + 1) * bossPeriodMs(schedule);

  return result;
}

export function isBossAlive(atMs: number, schedule: BossSchedule): boolean {
  const last = lastBossSpawnUtcMs(atMs, schedule);
  const result = last !== null && atMs < last + schedule.aliveWindowMs;

  return result;
}
