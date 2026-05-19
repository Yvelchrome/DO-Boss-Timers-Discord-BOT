import { PermissionFlagsBits, type Client, type TextChannel } from "discord.js";
import type { BossSchedule, BossData } from "../bossTimers/types";
import {
  isBossAlive,
  getDefaultBossSchedule,
  fetchBossSchedule,
  fetchBossInfo,
  fetchBosses,
} from "../bossTimers";
import { GuildConfig, guildConfigs, persistConfig, removeGuildConfig } from "./config";
import { EmbedBuilder } from "discord.js";
import { buildCountdown } from "./embeds";

const bossData = new Map<string, BossData>();

export async function refreshAllBosses() {
  const bosses = await fetchBosses();

  for (const boss of bosses) {
    let schedule: BossSchedule;

    try {
      const remote = await fetchBossSchedule(boss.bossId);
      schedule = remote ?? getDefaultBossSchedule();
    } catch {
      schedule = getDefaultBossSchedule();
    }

    const bossInfo = await fetchBossInfo(boss.wikiId);

    if (bossInfo) {
      console.info(`[${boss.bossId}] ${bossInfo.name} — ${bossInfo.mapName}`);
    }

    bossData.set(boss.bossId, {
      bossId: boss.bossId,
      wikiId: boss.wikiId,
      schedule,
      bossInfo,
    });
  }

  console.log(`[data] Loaded ${bossData.size} boss(es)`);
}

export async function refreshSchedules() {
  for (const [name, data] of bossData) {
    try {
      const remote = await fetchBossSchedule(name);

      if (remote && remote.updatedAtMs > data.schedule.updatedAtMs) {
        data.schedule = remote;
        console.log(`[${name}] Schedule synced`);
      }
    } catch (err) {
      console.error(`[${name}] schedule:`, (err as Error).message);
    }
  }
}

export async function refreshBossInfos() {
  for (const [name, data] of bossData) {
    const info = await fetchBossInfo(data.wikiId);

    if (info) {
      data.bossInfo = info;
      console.info(`[${name}] Wiki refreshed — ${info.name}`);
    }
  }
}

async function postOrFindMessage(
  ch: TextChannel,
  cfg: GuildConfig,
  _data: BossData,
) {
  if (cfg.messageId) {
    try {
      await ch.messages.fetch({ message: cfg.messageId, force: true });
      return;
    } catch {
      cfg.messageId = null;
    }
  }

  // Message not found — don't auto-create. Let admins run /setup.
}

export async function updateAll(client: Client) {
  for (const [gid, cfg] of guildConfigs) {
    if (!cfg.channelId || !cfg.bossName) continue;

    const data = bossData.get(cfg.bossName);
    if (!data) continue;

    const now = Date.now();
    const alive =
      (globalThis as any).__testFlipAlive ?? isBossAlive(now, data.schedule);
    const embed = buildCountdown(data.bossInfo, data.schedule);

    try {
      const guild = await client.guilds.fetch(gid).catch(() => null);
      if (!guild) continue;

      const channel = (await guild.channels
        .fetch(cfg.channelId)
        .catch(() => null)) as TextChannel | null;
      if (!channel) continue;

      await postOrFindMessage(channel, cfg, data);
      if (!cfg.messageId) continue;

      const msg = await channel.messages
        .fetch({ message: cfg.messageId, force: true })
        .catch(() => null);
      if (!msg) {
        cfg.messageId = null;
        continue;
      }

      if (cfg.lastAlive !== null && cfg.lastAlive !== alive) {
        await msg.delete().catch(() => null);
        cfg.messageId = null;

        const newMsg = await channel.send({ embeds: [embed] });
        cfg.messageId = newMsg.id;
        persistConfig(gid);
      } else {
        await msg.edit({ embeds: [embed] });
      }

      cfg.lastAlive = alive;
    } catch (err) {
      console.error(`[update] ${gid}:`, (err as Error).message);
    }
  }
}

export function registerCommands(client: Client) {
  client.on("interactionCreate", async (i) => {
    if (!i.isChatInputCommand()) return;

    const { commandName, guild } = i;
    if (!guild) {
      return i.reply({ content: "❌ Server only.", ephemeral: true });
    }

    if (commandName === "timer-setup") {
      const member = await guild.members.fetch(i.user.id);

      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      }

      const ch = i.options.getChannel("channel") as TextChannel | null;
      if (!ch) {
        return i.reply({
          content: "❌ Select a text channel.",
          ephemeral: true,
        });
      }

      const bossName = i.options.getString("boss", true).toLowerCase();
      if (!bossData.has(bossName)) {
        return i.reply({
          content: `❌ Unknown boss. Available: ${[...bossData.keys()].join(", ")}`,
          ephemeral: true,
        });
      }

      const me = await guild.members.fetchMe();
      const perms = ch.permissionsFor(me);

      if (
        !perms?.has([
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
        ])
      ) {
        return i.reply({
          content: `❌ No permission in ${ch}.`,
          ephemeral: true,
        });
      }

      const existing = guildConfigs.get(guild.id);

      // Send initial countdown message
      const data = bossData.get(bossName)!;
      const msg = await ch.send({
        embeds: [buildCountdown(data.bossInfo, data.schedule)],
      });

      guildConfigs.set(guild.id, {
        channelId: ch.id,
        messageId: msg.id,
        bossName,
        bossRoles: existing?.bossRoles ?? null,
        statusRoles: existing?.statusRoles ?? null,
        lastAlive: null,
      });
      persistConfig(guild.id);

      console.log(`[setup] ${guild.name} → ${ch.name} (${bossName})`);

      await i.reply({
        content: `✅ ${bossName} countdown in ${ch}!`,
        ephemeral: true,
      });

      // Run update cycle to set initial status
      try {
        await updateAll(client);
      } catch (err) {
        console.error("[setup]", (err as Error).message);
      }
      return;
    }

    if (commandName === "timer-status") {
      const cfg = guildConfigs.get(guild.id);

      if (!cfg) {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf39c12)
              .setTitle("Server Configuration")
              .setDescription(
                "⚠️ **No configuration yet.** Run `/setup` to get started.",
              ),
          ],
          ephemeral: true,
        });
      }

      const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);

      // Check if countdown message still exists
      let msgAlive = false;
      if (cfg.messageId && ch?.isTextBased()) {
        const msg = await ch.messages
          .fetch({ message: cfg.messageId, force: true })
          .catch(() => null);
        if (msg) {
          msgAlive = true;
        } else {
          cfg.messageId = null;
          persistConfig(guild.id);
        }
      }

      const bossFields = msgAlive
        ? [
            {
              name: "Boss",
              value: cfg.bossName.replace(/\b\w/g, (c) => c.toUpperCase()),
              inline: true,
            },
            {
              name: "Channel",
              value: ch ? `<#${ch.id}>` : "not set",
              inline: true,
            },
          ]
        : [];

      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Boss Configuration")
            .addFields(
              ...(msgAlive
                ? bossFields
                : [{ name: "Countdown", value: "❌ Not set", inline: false }]),
            ),
        ],
        ephemeral: true,
      });
    }

    if (commandName === "timer-reset") {
      const member = await guild.members.fetch(i.user.id);

      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      }

      const cfg = guildConfigs.get(guild.id);

      if (cfg?.channelId && cfg?.messageId) {
        const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
        if (ch?.isTextBased()) {
          const msg = await ch.messages
            .fetch({ message: cfg.messageId, force: true })
            .catch(() => null);
          if (msg) await msg.delete().catch(() => null);
        }
      }

      removeGuildConfig(guild.id);
      console.log(`[reset] ${guild.name} — config wiped`);

      return i.reply({
        content: "✅ Configuration wiped.",
        ephemeral: true,
      });
    }

    if (commandName === "timer-remove") {
      const member = await guild.members.fetch(i.user.id);

      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      }

      const bossName = i.options.getString("boss", true).toLowerCase();
      const cfg = guildConfigs.get(guild.id);

      if (!cfg) {
        return i.reply({
          content: "⚠️ No boss configured. Use `/setup` first.",
          ephemeral: true,
        });
      }

      if (cfg.bossName !== bossName) {
        return i.reply({
          content: `⚠️ No countdown for **${bossName}**. Configured boss is **${cfg.bossName}**.`,
          ephemeral: true,
        });
      }

      if (!cfg.messageId) {
        return i.reply({
          content: `⚠️ No countdown message for **${bossName}**.`,
          ephemeral: true,
        });
      }

      const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
      if (ch?.isTextBased()) {
        const msg = await ch.messages
          .fetch({ message: cfg.messageId, force: true })
          .catch(() => null);
        if (msg) await msg.delete().catch(() => null);
      }

      cfg.messageId = null;
      persistConfig(guild.id);

      return i.reply({
        content: `✅ Countdown message for **${bossName}** deleted.`,
        ephemeral: true,
      });
    }

  });
}
