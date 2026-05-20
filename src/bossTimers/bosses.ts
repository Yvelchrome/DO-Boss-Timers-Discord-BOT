import type { RaidBoss } from "./types";
import { RAID_TIMER_API } from "../api";

export function isBossAlive(raidBoss: RaidBoss): boolean {
  return raidBoss.status !== "respawning";
}

export async function fetchRaidBosses(): Promise<RaidBoss[]> {
  try {
    const res = await fetch(RAID_TIMER_API, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`Raid API failed: ${res.status}`);

    const data: {
      bosses: RaidBoss[];
    } = await res.json();
    if (!data.bosses?.length) {
      console.log("[bosses] No bosses returned from raid API");
      return [];
    }

    const bosses: RaidBoss[] = data.bosses;

    console.log(
      `[bosses] Loaded ${bosses.length} boss(es) from raid-timer API`,
    );
    return bosses;
  } catch (err) {
    console.error("[bosses] Fetch failed:", (err as Error).message);
    return [];
  }
}
