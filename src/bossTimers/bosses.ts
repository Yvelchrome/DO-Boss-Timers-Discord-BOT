import type { BossData, BossSchedule } from "./types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

export async function fetchBosses(): Promise<
  Pick<BossData, "bossId" | "wikiId">[]
> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return [];
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/boss_schedules?select=boss_id,wiki_id`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });

    if (!response.ok) throw new Error(`Supabase failed: ${response.status}`);

    const data: { boss_id: string; wiki_id: string }[] = await response.json();

    if (!data.length) {
      return [];
    }

    const map = new Map<string, string>();
    for (const row of data) {
      map.set(row.boss_id, row.wiki_id);
    }

    const bosses = Array.from(map.entries()).map(([bossId, wikiId]) => ({
      bossId,
      wikiId,
    }));
    console.log(`[bosses] Loaded ${bosses.length} boss(es) from Supabase`);
    return bosses;
  } catch (err) {
    console.error("[bosses] Fetch failed:", (err as Error).message);
    return [];
  }
}

export async function fetchBossSchedule(
  bossId: string,
): Promise<BossSchedule | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return null;
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/boss_schedules?select=boss_id,anchor_utc_ms,alive_window_ms,respawn_wait_ms,updated_at_ms&boss_id=eq.${bossId}`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });

    if (!response.ok)
      throw new Error(`Supabase schedule fetch failed: ${response.status}`);

    const data: {
      anchor_utc_ms: number;
      alive_window_ms: number;
      respawn_wait_ms: number;
      updated_at_ms: number;
    }[] = await response.json();

    if (!data.length) {
      return null;
    }

    const row = data[0];
    return {
      anchorUtcMs: Math.round(row.anchor_utc_ms),
      aliveWindowMs: Math.round(row.alive_window_ms),
      respawnWaitMs: Math.round(row.respawn_wait_ms),
      updatedAtMs: Math.round(row.updated_at_ms),
    };
  } catch (err) {
    console.error(`[${bossId}] schedule fetch failed:`, (err as Error).message);
    return null;
  }
}
