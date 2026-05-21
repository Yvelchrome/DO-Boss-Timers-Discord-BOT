import { EmbedBuilder } from "discord.js";
import type { RaidBoss, BossInfo } from "../bossTimers/types";
import { isBossAlive } from "../bossTimers/bosses";

function titleCase(v: string): string {
  const c = v.replace(/[_-]+/g, " ").trim();
  return c ? c.replace(/\b\w/g, (x) => x.toUpperCase()) : v;
}

export function timestamp(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

function buildStatus(
  raidBoss: RaidBoss,
  spawnedAtMs: number | null,
): { alive: boolean; status: string } {
  const alive = isBossAlive(raidBoss);
  const respawnMin = raidBoss.respawn_sec / 60;
  const respawnLabel = Number.isInteger(respawnMin)
    ? `${respawnMin} min`
    : `${Math.floor(respawnMin)}m ${Math.round((respawnMin % 1) * 60)}s`;

  let status = "";
  if (alive) {
    status = `**Spawned:** ${timestamp(spawnedAtMs ?? Date.now())}\n`;
  } else {
    status = `**Next spawn:** ${timestamp(raidBoss.next_spawn_ts * 1000)}\n`;
  }
  status += `**Cycle:** ${respawnLabel}`;

  return { alive, status };
}

const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const URL = "https://thedigitalodyssey.com/raid-timer";

export function buildCountdown(
  bossInfo: BossInfo | null,
  raidBoss: RaidBoss,
  spawnedAtMs: number | null,
): EmbedBuilder {
  if (!bossInfo || !raidBoss) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setDescription("Error: The boss info is not available");
  }

  const { alive, status } = buildStatus(raidBoss, spawnedAtMs);

  const lines: string[] = [
    SEPARATOR,
    `**${bossInfo.name}**`,
    SEPARATOR,
    "",
    status,
    "",
    `**Location:** ${raidBoss.map_name}`,
    `**HP:** ${bossInfo.hp.toLocaleString()}`,
    `**Level:** ${bossInfo.level}`,
  ];

  if (bossInfo.drops.length || bossInfo.rewards.length) {
    lines.push("", SEPARATOR, "**Loot Table**", SEPARATOR);

    if (bossInfo.drops.length > 0) {
      lines.push("", "**Drops:**");

      for (const drop of bossInfo.drops) {
        lines.push(
          `• **${drop.item_name}** - x1 - ${titleCase(drop.drop_type)}`,
        );
      }
    }

    if (bossInfo.rewards.length > 0) {
      const byRank = new Map<string, typeof bossInfo.rewards>();

      for (const reward of bossInfo.rewards) {
        const group = byRank.get(reward.rank) ?? [];
        byRank.set(reward.rank, group);
        group.push(reward);
      }

      for (const [rank, items] of byRank) {
        lines.push("", `**Raid Rewards (${rank}):**`);

        for (const reward of items) {
          lines.push(
            `• **${reward.item_name}** - ${reward.qty} - ${reward.rate}`,
          );
        }
      }
    }
  }

  return new EmbedBuilder()
    .setColor(alive ? 0x2ecc71 : 0xe74c3c)
    .setDescription(
      `${lines.join("\n")}\n\n${SEPARATOR}\nData from the Digital Odyssey API`,
    )
    .setURL(URL)
    .addFields({
      name: "Links",
      value: `[Web Version](${URL})`,
      inline: false,
    });
}
