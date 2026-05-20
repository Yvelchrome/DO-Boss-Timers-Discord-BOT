import { PermissionFlagsBits, type Client, type TextChannel } from "discord.js";
import type { BossData } from "../bossTimers/types";
import { fetchRaidBosses, isBossAlive } from "../bossTimers/bosses";
import { fetchBossInfo } from "../bossTimers/wiki";
import {
  GuildConfig,
  guildConfigs,
  persistConfig,
  removeGuildConfig,
} from "./config";
import { EmbedBuilder } from "discord.js";
import { buildCountdown } from "./embeds";

const bossData = new Map<string, BossData>();

function bossDisplayName(monsterId: string): string {
  return bossData.get(monsterId)?.raidBoss.monster_name ?? monsterId;
}

export async function refreshAllBosses() {
  const bosses = await fetchRaidBosses();
  const entries: [string, BossData][] = [];

  for (const raidBoss of bosses) {
    const existing = bossData.get(raidBoss.monster_id);
    const bossInfo = await fetchBossInfo(raidBoss.monster_id);
    entries.push([
      raidBoss.monster_id,
      {
        raidBoss,
        bossInfo,
        spawnedAtMs:
          existing?.spawnedAtMs ??
          (raidBoss.status !== "respawning" ? Date.now() : null),
      },
    ]);

    if (bossInfo) {
      console.info(
        `[${raidBoss.monster_id}] ${bossInfo.name} — ${raidBoss.map_name}`,
      );
    } else {
      console.info(
        `[${raidBoss.monster_id}] ${raidBoss.monster_name} (no wiki)`,
      );
    }
  }

  bossData.clear();
  for (const [id, data] of entries) bossData.set(id, data);
  console.log(`[data] Loaded ${bossData.size} boss(es)`);
}

export async function refreshTimers() {
  const bosses = await fetchRaidBosses();

  for (const raidBoss of bosses) {
    const existing = bossData.get(raidBoss.monster_id);
    if (existing) {
      if (
        existing.raidBoss.status === "respawning" &&
        raidBoss.status !== "respawning"
      ) {
        existing.spawnedAtMs = Date.now();
      } else if (raidBoss.status === "respawning") {
        existing.spawnedAtMs = null;
      }
      existing.raidBoss = raidBoss;
    } else {
      const bossInfo = await fetchBossInfo(raidBoss.monster_id);
      bossData.set(raidBoss.monster_id, {
        raidBoss,
        bossInfo,
        spawnedAtMs: raidBoss.status !== "respawning" ? Date.now() : null,
      });
      console.info(`[boss] Auto-discovered ${raidBoss.monster_name}`);
    }
  }
}

async function postOrFindMessage(ch: TextChannel, cfg: GuildConfig) {
  if (cfg.messageId) {
    try {
      await ch.messages.fetch({ message: cfg.messageId, force: true });
      return;
    } catch {
      cfg.messageId = null;
    }
  }

  // Message not found — don't auto-create. Let admins run /timer-setup.
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

      const bossId = i.options.getString("boss", true).toLowerCase();
      if (!bossData.has(bossId)) {
        return i.reply({
          content: `❌ Unknown boss. Available: ${[...bossData.keys()].map(bossDisplayName).join(", ")}`,
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

      const existingCfg = guildConfigs.get(guild.id);
      if (existingCfg?.bossId === bossId && existingCfg.messageId) {
        return i.reply({
          content: `⚠️ **${bossDisplayName(bossId)}** already has an active countdown. Run \`/timer-status\` to check, \`/timer-remove\` to delete the message first, or \`/timer-reset\` to wipe everything.`,
          ephemeral: true,
        });
      }

      const data = bossData.get(bossId);
      if (!data) return;

      const msg = await ch.send({
        embeds: [
          buildCountdown(data.bossInfo, data.raidBoss, data.spawnedAtMs),
        ],
      });

      guildConfigs.set(guild.id, {
        channelId: ch.id,
        messageId: msg.id,
        bossId,
        lastAlive: null,
      });
      persistConfig(guild.id);

      const displayName = bossDisplayName(bossId);
      console.log(`[setup] ${guild.name} → ${ch.name} (${bossId})`);

      await i.reply({
        content: `✅ ${displayName} countdown in ${ch}!`,
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

      if (!cfg || !cfg.messageId) {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf39c12)
              .setTitle("Server Configuration")
              .setDescription(
                "⚠️ **No active countdown.** Run \`/timer-setup\` to get started.",
              ),
          ],
          ephemeral: true,
        });
      }

      const ch = cfg.channelId
        ? await guild.channels.fetch(cfg.channelId).catch(() => null)
        : null;

      const bossFields = [
        {
          name: "Boss",
          value: bossDisplayName(cfg.bossId),
          inline: true,
        },
        {
          name: "Channel",
          value: ch ? `<#${ch.id}>` : "not set",
          inline: true,
        },
      ];

      const msgAlive =
        cfg.messageId && ch?.isTextBased()
          ? await ch.messages
              .fetch({ message: cfg.messageId, force: true })
              .then(() => true)
              .catch(() => {
                cfg.messageId = null;
                persistConfig(guild.id);
                return false;
              })
          : false;

      return i.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Boss Configuration")
            .addFields(...bossFields),
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

      const bossId = i.options.getString("boss", true).toLowerCase();
      const cfg = guildConfigs.get(guild.id);

      if (!cfg) {
        return i.reply({
          content: "⚠️ No boss configured. Use \`/timer-setup\` first.",
          ephemeral: true,
        });
      }

      const cfgDisplayName = bossDisplayName(cfg.bossId);
      const inputDisplayName = bossDisplayName(bossId);

      if (cfg.bossId !== bossId) {
        return i.reply({
          content: `⚠️ No countdown for **${inputDisplayName}**. Configured boss is **${cfgDisplayName}**.`,
          ephemeral: true,
        });
      }

      if (!cfg.messageId) {
        return i.reply({
          content: `⚠️ No countdown message for **${inputDisplayName}**.`,
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
        content: `✅ Countdown message for **${inputDisplayName}** deleted.`,
        ephemeral: true,
      });
    }
  });
}
