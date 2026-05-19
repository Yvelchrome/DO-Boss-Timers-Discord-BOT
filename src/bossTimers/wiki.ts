import bosses from "../bosses.json" with { type: "json" };
import type { BossInfo } from "./types.js";

type MonsterDrop = { item_name?: unknown; drop_type?: unknown };
type RaidReward = {
  item_name?: unknown;
  rate_permil?: unknown;
  min?: unknown;
  max?: unknown;
};
type RaidBand = { start?: unknown; end?: unknown; rewards?: unknown };
type MonsterPayload = {
  name?: unknown;
  level?: unknown;
  hp?: unknown;
  locations?: unknown;
  drops?: unknown;
  raid_rankings?: unknown;
};

const WIKI_API_BASE =
  "https://odyssey-proxy.qawsar-ahmed.workers.dev/proxy/api/wiki";
const MONSTER_ID = bosses[0].id;

export async function fetchBossInfo(): Promise<BossInfo> {
  const res = await fetch(`${WIKI_API_BASE}/monsters?id=${MONSTER_ID}`);
  if (!res.ok) {
    throw new Error(`Wiki API failed: ${res.status} ${res.statusText}`);
  }

  const monster: MonsterPayload = await res.json();

  const name = String(monster.name ?? "Boss");
  const level = Number(monster.level ?? 0);
  const hp = Number(monster.hp ?? 0);

  const locs = Array.isArray(monster.locations) ? monster.locations : [];
  const mapName = String(
    (locs[0] as Record<string, unknown> | undefined)?.map_name ?? "Unknown",
  );

  const drops = Array.isArray(monster.drops)
    ? (monster.drops as MonsterDrop[])
    : [];
  const dropList = drops.map((d) => ({
    itemName: String(d.item_name ?? "Unknown"),
    dropType: String(d.drop_type ?? "Drop"),
  }));

  const bands = Array.isArray(monster.raid_rankings)
    ? (monster.raid_rankings as RaidBand[])
    : [];
  const rewards: BossInfo["rewards"] = [];
  for (const band of bands) {
    const start = Number(band.start ?? 0);
    const end = Number(band.end ?? 0);
    const rankLabel = start === 1 ? `Top ${end}` : `#${start}–#${end}`;
    const items = Array.isArray(band.rewards)
      ? (band.rewards as RaidReward[])
      : [];
    for (const r of items) {
      const itemName = String(r.item_name ?? "Unknown");
      const min = Math.max(1, Math.round(Number(r.min) || 1));
      const max = Math.max(1, Math.round(Number(r.max) || 1));
      const qty = min === max ? `x${min}` : `x${min}–${max}`;
      const permil = Number(r.rate_permil ?? 0);
      const rate =
        permil > 0
          ? `${(permil / 100).toLocaleString(undefined, { maximumFractionDigits: permil % 100 === 0 ? 0 : 1 })}%`
          : "";
      rewards.push({ itemName, rank: rankLabel, qty, rate });
    }
  }

  return { name, mapName, hp, level, drops: dropList, rewards };
}
