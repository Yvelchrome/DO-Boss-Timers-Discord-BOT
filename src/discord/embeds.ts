import { EmbedBuilder } from "discord.js";
import type { BossSchedule, BossInfo } from "../bossTimers/index.js";
import {
  isBossAlive,
  nextBossSpawnUtcMs,
  lastBossSpawnUtcMs,
} from "../bossTimers/index.js";
import { titleCase } from "./config.js";

export function timestamp(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

function buildStatus(
  now: number,
  schedule: BossSchedule,
): { alive: boolean; status: string } {
  const alive =
    (globalThis as any).__testFlipAlive ?? isBossAlive(now, schedule);
  const next = nextBossSpawnUtcMs(now, schedule);
  const lastSpawn = lastBossSpawnUtcMs(now, schedule);
  const respawnMin = schedule.respawnWaitMs / 60_000;
  const respawnLabel = Number.isInteger(respawnMin)
    ? `${respawnMin} min`
    : `${Math.floor(respawnMin)}m ${Math.round((respawnMin % 1) * 60)}s`;

  let status = "";
  if (alive) {
    if (lastSpawn) status = `**Spawned:** ${timestamp(lastSpawn)}\n`;
  } else {
    status = `**Next spawn:** ${timestamp(next)}\n`;
  }
  status += `**Cycle:** ${respawnLabel}`;

  return { alive, status };
}

const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const URL = "https://mistgg.github.io/Odyssey-Calc/#/timers";

export function buildCountdown(
  bossInfo: BossInfo | null,
  schedule: BossSchedule,
): EmbedBuilder {
  if (!bossInfo) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setDescription("Error: The boss info is not available");
  }

  const { alive, status } = buildStatus(Date.now(), schedule);

  const lines: string[] = [
    SEPARATOR,
    `**${bossInfo.name}**`,
    SEPARATOR,
    "",
    status,
    "",
    `**Location:** ${bossInfo.mapName}`,
    `**HP:** ${bossInfo.hp.toLocaleString()}`,
    `**Level:** ${bossInfo.level}`,
  ];

  if (bossInfo.drops.length || bossInfo.rewards.length) {
    lines.push("", SEPARATOR, "**Loot Table**", SEPARATOR);

    if (bossInfo.drops.length > 0) {
      lines.push("", "**Drops:**");

      for (const drop of bossInfo.drops) {
        lines.push(`• **${drop.itemName}** - x1 - ${titleCase(drop.dropType)}`);
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
            `• **${reward.itemName}** - ${reward.qty} - ${reward.rate}`,
          );
        }
      }
    }
  }

  return new EmbedBuilder()
    .setColor(alive ? 0x2ecc71 : 0xe74c3c)
    .setDescription(
      `${lines.join("\n")}\n\n${SEPARATOR}\nData from the Digital Odyssey wiki API`,
    )
    .setURL(URL)
    .addFields({
      name: "Links",
      value: `[Web Version](${URL})`,
      inline: false,
    });
}

export function buildQuick(
  bossInfo: BossInfo | null,
  schedule: BossSchedule,
  channelId?: string,
): EmbedBuilder {
  if (!bossInfo) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setDescription("Error: The boss info is not available");
  }

  const { alive, status } = buildStatus(Date.now(), schedule);

  const lines: string[] = [
    SEPARATOR,
    `**${bossInfo.name}**`,
    SEPARATOR,
    "",
    status,
    "",
    `**Location:** ${bossInfo.mapName}`,
    `**HP:** ${bossInfo.hp.toLocaleString()}`,
    `**Level:** ${bossInfo.level}`,
  ];

  if (channelId) {
    lines.push("", SEPARATOR, "", `Countdown channel: <#${channelId}>`);
  }

  return new EmbedBuilder()
    .setColor(alive ? 0x2ecc71 : 0xe74c3c)
    .setDescription(
      `${lines.join("\n")}\n\n${SEPARATOR}\nData from the Digital Odyssey wiki API`,
    )
    .setURL(URL)
    .addFields({
      name: "Links",
      value: `[Web Version](${URL})`,
      inline: false,
    });
}
