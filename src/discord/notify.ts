import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
} from "discord.js";
import { guildConfigs } from "./config";

export function buildNotifyRow(
  guildId: string,
): ActionRowBuilder<MessageActionRowComponentBuilder> | null {
  const cfg = guildConfigs.get(guildId);
  if (!cfg?.notifyRoleId) return null;

  return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("notify_optin")
      .setEmoji("🔔")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("notify_optout")
      .setEmoji("🔕")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function handleNotifyButton(i: any) {
  const guild = i.guild;
  if (!guild) return i.reply({ content: "❌ Server only.", ephemeral: true });

  const cfg = guildConfigs.get(guild.id);
  if (!cfg?.notifyRoleId) {
    return i.reply({
      content: "⚠️ Notifications not configured on this server.",
      ephemeral: true,
    });
  }

  // Defer first to avoid 3s timeout
  await i.deferReply({ ephemeral: true });

  const member = await guild.members.fetch(i.user.id).catch(() => null);
  if (!member)
    return i.editReply({
      content: "❌ Could not fetch your member data.",
    });

  const role = await guild.roles.fetch(cfg.notifyRoleId).catch(() => null);
  if (!role) {
    return i.editReply({
      content: "⚠️ The notification role no longer exists.",
    });
  }

  const isOptin = i.customId === "notify_optin";
  const alreadyHasRole = member.roles.cache.has(role.id);

  if (isOptin === alreadyHasRole) {
    return i.editReply({
      content: isOptin
        ? "✅ You already have the role."
        : "🔕 You don't have the role.",
    });
  }

  try {
    await (isOptin ? member.roles.add(role) : member.roles.remove(role));
    return i.editReply({
      content: isOptin
        ? "✅ You'll now receive boss notifications."
        : "🔕 Notifications silenced.",
    });
  } catch {
    return i.editReply({
      content:
        "❌ Could not update role. Check the bot has **Manage Roles** permission and the role is below my highest role.",
    });
  }
}
