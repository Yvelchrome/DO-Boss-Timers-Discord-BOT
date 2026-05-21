import { type Client, type TextChannel, DiscordAPIError } from "discord.js";
import type { GuildConfig } from "./discord/config";
import { guildConfigs, persistConfig } from "./discord/config";
import { bossData, bossDisplayName, isBossAlive } from "./bossTimers/bosses";
import { buildCountdown } from "./discord/embeds";
import { buildNotifyRow } from "./discord/notify";

async function postOrFindMessage(ch: TextChannel, cfg: GuildConfig) {
  if (!cfg.messageId) return;

  try {
    await ch.messages.fetch({ message: cfg.messageId, force: true });
  } catch (err) {
    if (err instanceof DiscordAPIError && err.code === 10008) {
      cfg.messageId = null;
    } else {
      console.error(
        `[update] Failed to fetch message ${cfg.messageId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export async function updateAll(client: Client) {
  for (const [gid, cfg] of guildConfigs) {
    if (!cfg.channelId || !cfg.bossId) continue;

    const data = bossData.get(cfg.bossId);
    if (!data) continue;

    const alive = isBossAlive(data.raidBoss);
    const embed = buildCountdown(
      data.bossInfo,
      data.raidBoss,
      data.spawnedAtMs,
    );

    try {
      const guild = await client.guilds.fetch(gid).catch(() => null);
      if (!guild) continue;

      const channel = (await guild.channels
        .fetch(cfg.channelId)
        .catch(() => null)) as TextChannel | null;
      if (!channel) continue;

      await postOrFindMessage(channel, cfg);
      if (!cfg.messageId) continue;

      const msg = await channel.messages
        .fetch({ message: cfg.messageId, force: true })
        .catch(() => null);
      if (!msg) {
        console.error(
          `[UPDATE] Message ${cfg.messageId} not found after postOrFindMessage passed`,
        );
        continue;
      }

      const row = buildNotifyRow(gid);

      if (cfg.lastAlive !== null && cfg.lastAlive !== alive) {
        await msg.delete().catch(() => null);
        cfg.messageId = null;

        const newMsg = await channel.send({
          embeds: [embed],
          components: row ? [row] : [],
        });
        cfg.messageId = newMsg.id;
        persistConfig(gid);
      } else {
        await msg.edit({
          embeds: [embed],
          components: row ? [row] : [],
        });
      }

      if (cfg.lastNotifyMsgId && data.raidBoss.status !== "respawning") {
        await channel.messages.delete(cfg.lastNotifyMsgId).catch(() => null);
        cfg.lastNotifyMsgId = null;
        persistConfig(gid);
      }

      if (
        cfg.notifyRoleId &&
        cfg.notifyMinutes &&
        data.raidBoss.status === "respawning"
      ) {
        const msBeforeSpawn = data.raidBoss.next_spawn_ts * 1000 - Date.now();
        const notifyMs = cfg.notifyMinutes * 60 * 1000;

        if (
          msBeforeSpawn <= notifyMs &&
          cfg.lastNotifySpawnTs !== data.raidBoss.next_spawn_ts
        ) {
          if (cfg.lastNotifyMsgId) {
            await channel.messages
              .delete(cfg.lastNotifyMsgId)
              .catch(() => null);
          }

          const pingMsg = await channel
            .send({
              content: `🔔 **${bossDisplayName(cfg.bossId)}** spawns soon! <@&${cfg.notifyRoleId}>`,
              allowedMentions: { roles: [cfg.notifyRoleId] },
            })
            .catch(() => null);

          cfg.lastNotifySpawnTs = data.raidBoss.next_spawn_ts;
          cfg.lastNotifyMsgId = pingMsg?.id ?? null;
          persistConfig(gid);
        }
      }

      cfg.lastAlive = alive;
    } catch (err) {
      console.error(`[update] ${gid}:`, (err as Error).message);
    }
  }
}
