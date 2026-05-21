import {
  PermissionFlagsBits,
  type Client,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { bossData, bossDisplayName } from "../../bossTimers/bosses";
import { guildConfigs, persistConfig } from "../config";
import { buildCountdown } from "../embeds";
import { buildNotifyRow } from "../notify";
import { updateAll } from "../../update";
import { checkAdminPermission } from "../utils";

export async function handleTimerSetup(
  i: ChatInputCommandInteraction,
  client: Client,
): Promise<void> {
  if (!i.guild) {
    void i.reply({ content: "❌ Server only.", ephemeral: true });
    return;
  }

  if (!checkAdminPermission(i)) return;

  const channel = i.options.getChannel("channel") as TextChannel | null;
  if (!channel) {
    void i.reply({ content: "❌ Select a text channel.", ephemeral: true });
    return;
  }

  const bossId = i.options.getString("boss", true).toLowerCase();
  if (!bossData.has(bossId)) {
    void i.reply({
      content: `❌ Unknown boss. Available: ${[...bossData.keys()].map(bossDisplayName).join(", ")}`,
      ephemeral: true,
    });
    return;
  }

  const me = await i.guild.members.fetchMe();
  const perms = channel.permissionsFor(me);

  if (
    !perms?.has([
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ])
  ) {
    void i.reply({
      content: `❌ No permission in ${channel}.`,
      ephemeral: true,
    });
    return;
  }

  const existingCfg = guildConfigs.get(i.guild.id);
  if (existingCfg?.bossId === bossId && existingCfg.messageId) {
    void i.reply({
      content: `⚠️ **${bossDisplayName(bossId)}** already has an active countdown. Run \`/timer-status\` to check, \`/timer-remove\` to delete the message first, or \`/timer-reset\` to wipe everything.`,
      ephemeral: true,
    });
    return;
  }

  const data = bossData.get(bossId);
  if (!data) return;

  const row = buildNotifyRow(i.guild.id);
  const msg = await channel.send({
    embeds: [buildCountdown(data.bossInfo, data.raidBoss, data.spawnedAtMs)],
    components: row ? [row] : [],
  });

  const prevCfg = guildConfigs.get(i.guild.id);
  guildConfigs.set(i.guild.id, {
    ...prevCfg,
    channelId: channel.id,
    messageId: msg.id,
    bossId,
    lastAlive: null,
    notifyRoleId: null,
    notifyMinutes: null,
    lastNotifySpawnTs: null,
    lastNotifyMsgId: null,
  });
  persistConfig(i.guild.id);

  const displayName = bossDisplayName(bossId);
  console.log(`[SETUP] ${i.guild.name} → ${channel.name} (${bossId})`);

  await i.reply({
    content: `✅ ${displayName} countdown in ${channel}!`,
    ephemeral: true,
  });

  try {
    await updateAll(client);
  } catch (err) {
    console.error("[SETUP]", err instanceof Error ? err.message : String(err));
  }
}
