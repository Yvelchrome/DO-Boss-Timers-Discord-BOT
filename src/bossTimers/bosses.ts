import type { BossData, RaidBoss } from "./types";
import { RAID_TIMER_API } from "../api";
import { fetchBossInfo } from "./wiki";

export let bossData = new Map<string, BossData>();

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

    const data = (await res.json()) as { bosses: RaidBoss[] };
    if (!data.bosses?.length) {
      console.log("[BOSSES] No bosses returned from raid API");
      return [];
    }

    return data.bosses;
  } catch (err) {
    console.error(
      "[BOSSES] Fetch failed:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

export async function refreshAllBosses() {
  const bosses = await fetchRaidBosses();
  if (bosses.length === 0) {
    console.warn("[BOSSES] Empty API response - keeping existing data");
    return;
  }

  const entries: [string, BossData][] = [];

  const results = await Promise.allSettled(
    bosses.map(async (raidBoss) => {
      const existing = bossData.get(raidBoss.monster_id);
      const bossInfo = await fetchBossInfo(raidBoss.monster_id);
      return { raidBoss, existing, bossInfo };
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[BOSSES] Wiki fetch failed:", result.reason);
      continue;
    }

    const { raidBoss, existing, bossInfo } = result.value;

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
        `[${raidBoss.monster_id}] ${bossInfo.name} - ${raidBoss.map_name}`,
      );
    } else {
      console.info(
        `[${raidBoss.monster_id}] ${raidBoss.monster_name} (no wiki)`,
      );
    }
  }

  bossData = new Map(entries);

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
      console.info(`[BOSS] Auto-discovered ${raidBoss.monster_name}`);
    }
  }
}
