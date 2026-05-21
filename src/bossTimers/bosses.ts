import type { BossData, RaidBoss } from "./types";
import { RAID_TIMER_API } from "../api";
import { fetchBossInfo } from "./wiki";

export const bossData = new Map<string, BossData>();

export function isBossAlive(raidBoss: RaidBoss): boolean {
  return raidBoss.status !== "respawning";
}

export function bossDisplayName(monsterId: string): string {
  return bossData.get(monsterId)?.raidBoss.monster_name ?? monsterId;
}

export async function fetchRaidBosses(): Promise<RaidBoss[]> {
  try {
    const res = await fetch(RAID_TIMER_API, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Raid API failed: ${res.status}`);

    const data: {
      bosses: RaidBoss[];
    } = await res.json();
    if (!data.bosses?.length) {
      console.log("[bosses] No bosses returned from raid API");
      return [];
    }

    return data.bosses;
  } catch (err) {
    console.error("[bosses] Fetch failed:", (err as Error).message);
    return [];
  }
}

export async function refreshAllBosses() {
  const bosses = await fetchRaidBosses();
  const entries: [string, BossData][] = [];

  for (const raidBoss of bosses) {
    const existing = bossData.get(raidBoss.monster_id);
    const bossInfo = await fetchBossInfo(raidBoss.monster_id);

    entries.push([
      raidBoss.monster_id,
      {
        raidBoss,
        bossInfo,
        spawnedAtMs:
          existing?.spawnedAtMs ??
          (raidBoss.status !== "respawning" ? Date.now() : null),
      },
    ]);

    if (bossInfo) {
      console.info(
        `[${raidBoss.monster_id}] ${bossInfo.name} — ${raidBoss.map_name}`,
      );
    } else {
      console.info(
        `[${raidBoss.monster_id}] ${raidBoss.monster_name} (no wiki)`,
      );
    }
  }

  bossData.clear();
  for (const [id, data] of entries) {
    bossData.set(id, data);
  }

  console.log(`[DATA] Loaded ${bossData.size} boss(es)`);
}

export async function refreshTimers() {
  const bosses = await fetchRaidBosses();

  for (const raidBoss of bosses) {
    const existing = bossData.get(raidBoss.monster_id);
    if (existing) {
      if (
        existing.raidBoss.status === "respawning" &&
        raidBoss.status !== "respawning"
      ) {
        existing.spawnedAtMs = Date.now();
      } else if (raidBoss.status === "respawning") {
        existing.spawnedAtMs = null;
      }
      existing.raidBoss = raidBoss;
    } else {
      const bossInfo = await fetchBossInfo(raidBoss.monster_id);
      bossData.set(raidBoss.monster_id, {
        raidBoss,
        bossInfo,
        spawnedAtMs: raidBoss.status !== "respawning" ? Date.now() : null,
      });
      console.info(`[boss] Auto-discovered ${raidBoss.monster_name}`);
    }
  }
}
