import { PermissionFlagsBits, type Client, type TextChannel } from "discord.js";
import type { BossSchedule, BossData } from "../bossTimers/types";
import {
  isBossAlive,
  getDefaultBossSchedule,
  fetchBossSchedule,
  fetchBossInfo,
  fetchBosses,
} from "../bossTimers";
import { GuildConfig, guildConfigs, hasRole } from "./config";
import { buildCountdown, buildQuick } from "./embeds";

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
  data: BossData,
) {
  if (cfg.messageId) {
    try {
      await ch.messages.fetch(cfg.messageId);
      return;
    } catch {
      cfg.messageId = null;
    }
  }

  try {
    const msgs = await ch.messages.fetch({ limit: 10 });
    const bot = msgs.find((m) => m.author.id === ch.client.user?.id);

    if (bot) {
      cfg.messageId = bot.id;
      return;
    }
  } catch {
    /* ignore */
  }

  const msg = await ch.send({
    embeds: [buildCountdown(data.bossInfo, data.schedule)],
  });
  cfg.messageId = msg.id;
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

      const msg = await channel.messages.fetch(cfg.messageId).catch(() => null);
      if (!msg) {
        cfg.messageId = null;
        continue;
      }

      if (cfg.lastAlive !== null && cfg.lastAlive !== alive) {
        await msg.delete().catch(() => null);
        cfg.messageId = null;

        const newMsg = await channel.send({ embeds: [embed] });
        cfg.messageId = newMsg.id;
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

    if (commandName === "boss") {
      const cfg = guildConfigs.get(guild.id);

      if (!hasRole(i, cfg?.bossRoles ?? null)) {
        return i.reply({ content: "❌ No permission.", ephemeral: true });
      }

      if (!cfg?.bossName) {
        return i.reply({
          content: "⚠️ No boss configured. Use `/setup` first.",
          ephemeral: true,
        });
      }

      const data = bossData.get(cfg.bossName);
      if (!data) {
        return i.reply({
          content: "❌ Boss data not loaded yet. Try again soon.",
          ephemeral: true,
        });
      }

      await i.deferReply();
      return i.editReply({
        embeds: [buildQuick(data.bossInfo, data.schedule, cfg?.channelId)],
      });
    }

    if (commandName === "setup") {
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
      guildConfigs.set(guild.id, {
        channelId: ch.id,
        messageId: null,
        bossName,
        bossRoles: existing?.bossRoles ?? null,
        statusRoles: existing?.statusRoles ?? null,
        lastAlive: null,
      });

      console.log(`[setup] ${guild.name} → ${ch.name} (${bossName})`);

      await i.reply({
        content: `✅ ${bossName} countdown in ${ch}!`,
        ephemeral: true,
      });

      try {
        await updateAll(client);
      } catch (err) {
        console.error("[setup]", (err as Error).message);
      }
      return;
    }

    if (commandName === "status") {
      const cfg = guildConfigs.get(guild.id);

      if (!hasRole(i, cfg?.statusRoles ?? null)) {
        return i.reply({ content: "❌ No permission.", ephemeral: true });
      }

      if (!cfg) {
        return i.reply({ content: "⚠️ Use `/setup` first.", ephemeral: true });
      }

      const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);

      let r = `**Boss:** ${cfg.bossName}\nCountdown: ${ch ? `<#${ch.id}>` : "(not found)"}`;

      if (cfg.bossRoles?.length) {
        r += `\n🔒 /boss: ${cfg.bossRoles.map((id) => `<@&${id}>`).join(", ")}`;
      }

      if (cfg.statusRoles?.length) {
        r += `\n🔒 /status: ${cfg.statusRoles.map((id) => `<@&${id}>`).join(", ")}`;
      }

      return i.reply({ content: r, ephemeral: true });
    }

    if (commandName === "restrict") {
      const member = await guild.members.fetch(i.user.id);

      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      }

      const cmd = i.options.getString("command");
      const role = i.options.getRole("role");
      const action = i.options.getString("action");

      if (!cmd || !role || !action) {
        return i.reply({ content: "❌ Missing args.", ephemeral: true });
      }

      let cfg = guildConfigs.get(guild.id);

      if (!cfg) {
        cfg = {
          channelId: "",
          messageId: null,
          bossName: "",
          bossRoles: null,
          statusRoles: null,
          lastAlive: null,
        };
        guildConfigs.set(guild.id, cfg);
      }

      const key =
        cmd === "boss" ? "bossRoles" : cmd === "status" ? "statusRoles" : null;

      if (!key) {
        return i.reply({
          content: "❌ Use `boss` or `status`.",
          ephemeral: true,
        });
      }

      const roles = cfg[key] ?? [];

      if (action === "add") {
        if (!roles.includes(role.id)) roles.push(role.id);
        cfg[key] = roles;
      } else if (action === "remove") {
        cfg[key] = roles.filter((id) => id !== role.id);
      } else if (action === "clear") {
        cfg[key] = null;
      } else {
        return i.reply({ content: "❌ Unknown action.", ephemeral: true });
      }

      guildConfigs.set(guild.id, cfg);
      return i.reply({ content: `✅ /${cmd} updated.`, ephemeral: true });
    }
  });
}
