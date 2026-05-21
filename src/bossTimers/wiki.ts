import type { BossInfo } from "./types";
import { WIKI_API } from "../api";

type RawRankReward = {
  item_name: string;
  rate_permil: number;
  min: number;
  max: number;
};

type RawMonster = Omit<BossInfo, "rewards"> & {
  raid_rankings: {
    start: number;
    end: number;
    rewards: RawRankReward[];
  }[];
};

export async function fetchBossInfo(
  monsterId: string,
): Promise<BossInfo | null> {
  try {
    const res = await fetch(`${WIKI_API}/monsters?id=${monsterId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`Wiki API failed: ${res.status} ${res.statusText}`);
    }

    const monster = (await res.json()) as RawMonster;

    return {
      name: monster.name,
      level: monster.level,
      hp: monster.hp,
      drops: monster.drops,
      rewards: monster.raid_rankings.flatMap((band) =>
        band.rewards.map((reward) => ({
          item_name: reward.item_name,
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
    console.error(
      `[wiki] fetch failed for ${monsterId}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}
