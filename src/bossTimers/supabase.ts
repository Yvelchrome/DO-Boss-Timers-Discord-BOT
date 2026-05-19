import bosses from "../bosses.json";
import type { BossSchedule } from "./types.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

const BOSS_NAME = bosses[0].name.toLowerCase();

export async function fetchBossSchedule(): Promise<BossSchedule | null> {
  if (!SUPABASE_ANON) throw new Error("SUPABASE_ANON is required");

  const url = `${SUPABASE_URL}/rest/v1/boss_schedules?select=boss_id,anchor_utc_ms,alive_window_ms,respawn_wait_ms,updated_at_ms&boss_id=eq.${BOSS_NAME}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
  });

  if (!response.ok) throw new Error(`Supabase failed: ${response.status}`);

  const data = (await response.json()) as {
    anchor_utc_ms: number;
    alive_window_ms: number;
    respawn_wait_ms: number;
    updated_at_ms: number;
  }[];

  if (!data.length) return null;

  const row = data[0];
  const schedule = {
    anchorUtcMs: Math.round(row.anchor_utc_ms),
    aliveWindowMs: Math.round(row.alive_window_ms),
    respawnWaitMs: Math.round(row.respawn_wait_ms),
    updatedAtMs: Math.round(row.updated_at_ms),
  };

  return schedule;
}
