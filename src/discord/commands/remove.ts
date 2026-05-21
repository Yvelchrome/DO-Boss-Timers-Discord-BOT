import { type Client, type ChatInputCommandInteraction } from "discord.js";
import { bossDisplayName } from "../../bossTimers/bosses";
import { guildConfigs, persistConfig } from "../config";
import {
  checkAdminPermission,
  fetchTextChannel,
  deleteMessage,
} from "../utils";

export async function handleTimerRemove(
  i: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!i.guild) {
    return i.reply({ content: "❌ Server only.", ephemeral: true });
  }

  if (!checkAdminPermission(i)) return;

  const bossId = i.options.getString("boss", true).toLowerCase();
  const config = guildConfigs.get(i.guild.id);

  if (!config) {
    return i.reply({
      content: "⚠️ No boss configured. Use `/timer-setup` first.",
      ephemeral: true,
    });
  }

  const cfgDisplayName = bossDisplayName(config.bossId);
  const inputDisplayName = bossDisplayName(bossId);

  if (config.bossId !== bossId) {
    return i.reply({
      content: `⚠️ No countdown for **${inputDisplayName}**. Configured boss is **${cfgDisplayName}**.`,
      ephemeral: true,
    });
  }

  if (!config.messageId) {
    return i.reply({
      content: `⚠️ No countdown message for **${inputDisplayName}**.`,
      ephemeral: true,
    });
  }

  const channel = await fetchTextChannel(i.guild, config.channelId);
  if (channel) {
    await deleteMessage(channel, config.messageId);
  }

  config.messageId = null;
  persistConfig(i.guild.id);

  return i.reply({
    content: `✅ Countdown message for **${inputDisplayName}** deleted.`,
    ephemeral: true,
  });
}
