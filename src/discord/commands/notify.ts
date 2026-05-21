import {
  PermissionFlagsBits,
  type Client,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { bossData } from "../../bossTimers/bosses";
import { guildConfigs, persistConfig } from "../config";
import { buildNotifyRow } from "../notify";
import { checkAdminPermission, fetchTextChannel } from "../utils";

export async function handleTimerNotify(
  i: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!i.guild) {
    return i.reply({
      content: "❌ Server only.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const subcommand = i.options.getSubcommand();
  const config = guildConfigs.get(i.guild.id);

  if (subcommand === "off") {
    if (!checkAdminPermission(i)) return;

    if (!config) {
      return i.reply({
        content: "⚠️ No configuration found for this server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (config.lastNotifyMsgId && config.channelId) {
      const channel = await fetchTextChannel(i.guild, config.channelId);
      if (channel) {
        await channel.messages.delete(config.lastNotifyMsgId).catch(() => null);
      }
    }

    config.notifyRoleId = null;
    config.notifyMinutes = null;
    config.lastNotifySpawnTs = null;
    config.lastNotifyMsgId = null;
    persistConfig(i.guild.id);

    if (config.channelId && config.messageId) {
      const channel = await fetchTextChannel(i.guild, config.channelId);
      if (channel) {
        const msg = await channel.messages
          .fetch(config.messageId)
          .catch(() => null);
        if (msg) await msg.edit({ components: [] }).catch(() => null);
      }
    }

    console.log(`[NOTIFY] ${i.guild.name} → notifications disabled`);
    return i.reply({
      content: "✅ Notifications disabled.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!checkAdminPermission(i)) return;

  const me = await i.guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.MentionEveryone)) {
    return i.reply({
      content: "❌ I need **Mention Everyone** permission to ping roles.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const role = i.options.getRole("role", true);
  const minutes = i.options.getInteger("minutes", true);

  const data = config?.bossId ? bossData.get(config.bossId) : null;
  if (data && data.raidBoss.respawn_sec > 0) {
    const maxMinutes = data.raidBoss.respawn_sec / 60;
    if (minutes > maxMinutes) {
      return i.reply({
        content: `❌ **${minutes}min** is longer than the boss respawn time (**${maxMinutes}min**). Max: **${maxMinutes}min**.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  guildConfigs.set(i.guild.id, {
    channelId: "",
    messageId: null,
    bossId: "",
    lastAlive: null,
    lastNotifyMsgId: null,
    ...config,
    notifyRoleId: role.id,
    notifyMinutes: minutes,
    lastNotifySpawnTs: null,
  });
  persistConfig(i.guild.id);

  if (config?.channelId && config?.messageId) {
    const row = buildNotifyRow(i.guild.id);
    const channel = await fetchTextChannel(i.guild, config.channelId);
    if (channel) {
      const msg = await channel.messages
        .fetch(config.messageId)
        .catch(() => null);
      if (msg) {
        await msg.edit({ components: row ? [row] : [] }).catch(() => null);
      }
    }
  }

  console.log(`[NOTIFY] ${i.guild.name} → @${role.name} (${minutes}min)`);
  return i.reply({
    content: `✅ Notifications set: <@&${role.id}> will be pinged **${minutes}min** before spawn.`,
    flags: MessageFlags.Ephemeral,
  });
}
