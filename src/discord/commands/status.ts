import {
  type Client,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { guildConfigs, persistConfig } from "../config";
import { buildNoCountdownEmbed, buildStatusEmbed } from "../embeds";
import { fetchTextChannel, userHasRole } from "../utils";

export async function handleTimerStatus(
  i: ChatInputCommandInteraction,
  _client: Client,
) {
  if (!i.guild) {
    return i.reply({
      content: "❌ Server only.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const guildId = i.guild.id;
  const config = guildConfigs.get(guildId);

  if (!config || !config.messageId) {
    return i.reply({
      embeds: [buildNoCountdownEmbed()],
      flags: MessageFlags.Ephemeral,
    });
  }

  const channel = config.channelId
    ? await fetchTextChannel(i.guild, config.channelId)
    : null;

  if (channel) {
    await channel.messages
      .fetch({ message: config.messageId, force: true })
      .catch((err) => {
        if (err instanceof Error && err.message.includes("10008")) {
          config.messageId = null;
          persistConfig(guildId);
        }
      });
  }

  const userHasRoleFlag = userHasRole(i.guild, i.user.id, config.notifyRoleId);
  const [bossEmbed, notifyEmbed] = buildStatusEmbed(
    config,
    channel?.id ?? null,
    userHasRoleFlag,
  );

  return i.reply({
    embeds: [bossEmbed, notifyEmbed],
    flags: MessageFlags.Ephemeral,
  });
}
