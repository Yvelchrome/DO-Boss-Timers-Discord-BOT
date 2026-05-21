import {
  PermissionFlagsBits,
  type Guild,
  type TextChannel,
  type ChatInputCommandInteraction,
  type Message,
  MessageFlags,
} from "discord.js";
import type { GuildConfig } from "./config";

export async function fetchTextChannel(
  guild: Guild,
  channelId: string,
): Promise<TextChannel | null> {
  try {
    const channel = await guild.channels.fetch(channelId);
    return channel?.isTextBased() ? (channel as TextChannel) : null;
  } catch {
    return null;
  }
}

export async function fetchMessage(
  channel: TextChannel,
  messageId: string,
): Promise<Message | null> {
  try {
    return await channel.messages.fetch(messageId);
  } catch {
    return null;
  }
}

export async function deleteMessage(
  channel: TextChannel,
  messageId: string,
): Promise<void> {
  try {
    await channel.messages.delete(messageId);
  } catch {
    // Silently ignore delete errors
  }
}

export function checkAdminPermission(i: ChatInputCommandInteraction): boolean {
  if (!i.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    i.reply({
      content: "❌ Need **Manage Channels**.",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

export function userHasRole(
  guild: Guild,
  userId: string,
  roleId: string | null,
): boolean {
  if (!roleId) return false;
  const member = guild.members.cache.get(userId);
  return member?.roles.cache.has(roleId) ?? false;
}

export function getConfig(
  guildId: string,
  configs: Map<string, GuildConfig>,
): GuildConfig | null {
  return configs.get(guildId) ?? null;
}
