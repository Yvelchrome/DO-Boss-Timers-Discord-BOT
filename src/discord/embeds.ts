import { EmbedBuilder } from "discord.js";
import type { RaidBoss, BossInfo } from "../bossTimers/types";
import { isBossAlive, bossDisplayName } from "../bossTimers/bosses";
import type { GuildConfig } from "./config";

function timestamp(ms: number): string {
  return `<t:${Math.floor(ms / 1000)}:R>`;
}

const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const URL = "https://thedigitalodyssey.com/raid-timer";

function buildBossStatus(
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

  const { alive, status } = buildBossStatus(raidBoss, spawnedAtMs);

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
        lines.push(`• **${drop.item_name}** - x1 - ${drop.drop_type}`);
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

export function buildStatusEmbed(
  config: GuildConfig,
  channelName: string | null,
  userHasRoleFlag: boolean,
): [EmbedBuilder, EmbedBuilder] {
  const notifyEmbed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("Notifications")
    .setDescription(
      config.notifyRoleId && userHasRoleFlag
        ? `<@&${config.notifyRoleId}> - You will get pinged **${config.notifyMinutes}min** before spawn`
        : `Click the bell button on the countdown message to get notified **${config.notifyMinutes}min** before spawn.`,
    );

  const bossEmbed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("Boss Configuration")
    .addFields(
      {
        name: "Boss",
        value: bossDisplayName(config.bossId),
        inline: true,
      },
      {
        name: "Channel",
        value: channelName ? `<#${channelName}>` : "not set",
        inline: true,
      },
    );

  return [bossEmbed, notifyEmbed];
}

export function buildErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0xe74c3c).setDescription(`❌ ${message}`);
}

export function buildNoCountdownEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("Server Configuration")
    .setDescription(
      "⚠️ **No active countdown.** Run `/timer-setup` to get started.",
    );
}
