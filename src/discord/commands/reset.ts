import {
  type Client,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { guildConfigs, removeGuildConfig } from "../config";
import {
  checkAdminPermission,
  fetchTextChannel,
  deleteMessage,
} from "../utils";

export async function handleTimerReset(
  i: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!i.guild) {
    return i.reply({
      content: "❌ Server only.",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!checkAdminPermission(i)) return;

  const config = guildConfigs.get(i.guild.id);

  if (config?.channelId && config?.messageId) {
    const channel = await fetchTextChannel(i.guild, config.channelId);
    if (channel) {
      await deleteMessage(channel, config.messageId);
    }
  }

  removeGuildConfig(i.guild.id);
  console.log(`[RESET] ${i.guild.name} - config wiped`);

  return i.reply({
    content: "✅ Configuration wiped.",
    flags: MessageFlags.Ephemeral,
  });
}
