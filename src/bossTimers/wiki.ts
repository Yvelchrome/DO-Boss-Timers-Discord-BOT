import type { BossInfo } from "./types";

type MonsterPayload = {
  name: string;
  level: number;
  hp: number;
  locations: { map_name: string }[];
  drops: { item_name: string; drop_type: string }[];
  raid_rankings: {
    start: number;
    end: number;
    rewards: {
      item_name: string;
      rate_permil: number;
      min: number;
      max: number;
    }[];
  }[];
};

export async function fetchBossInfo(wikiId: string): Promise<BossInfo | null> {
  const WIKI_API_BASE =
    "https://odyssey-proxy.qawsar-ahmed.workers.dev/proxy/api/wiki";

  try {
    const res = await fetch(`${WIKI_API_BASE}/monsters?id=${wikiId}`);
    if (!res.ok) {
      throw new Error(`Wiki API failed: ${res.status} ${res.statusText}`);
    }

    const monster: MonsterPayload = await res.json();

    return {
      name: monster.name,
      mapName: monster.locations[0].map_name,
      hp: monster.hp,
      level: monster.level,
      drops: monster.drops.map((drop) => ({
        itemName: drop.item_name,
        dropType: drop.drop_type,
      })),
      rewards: monster.raid_rankings.flatMap((band) =>
        band.rewards.map((reward) => ({
          itemName: reward.item_name,
          rank:
            band.start === 1
              ? `Top ${band.end}`
              : `#${band.start}–#${band.end}`,
          qty:
            reward.min === reward.max
              ? `x${reward.min}`
              : `x${reward.min}–${reward.max}`,
          rate:
            reward.rate_permil > 0
              ? `${(reward.rate_permil / 100).toLocaleString(undefined, { maximumFractionDigits: reward.rate_permil % 100 === 0 ? 0 : 1 })}%`
              : "",
        })),
      ),
    };
  } catch (err) {
    console.error(`[wiki] fetch failed for ${wikiId}:`, (err as Error).message);
    return null;
  }
}
