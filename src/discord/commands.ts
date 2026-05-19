import { PermissionFlagsBits, type Client, type TextChannel } from "discord.js";
import type { BossSchedule, BossInfo } from "../bossTimers/index.js";
import {
  isBossAlive,
  getDefaultBossSchedule,
  fetchBossSchedule,
} from "../bossTimers/index.js";
import { GuildConfig, guildConfigs, hasRole } from "./config.js";
import { buildCountdown, buildQuick } from "./embeds.js";

let schedule: BossSchedule = getDefaultBossSchedule();
let bossInfo: BossInfo | null = null;

export function setSchedule(s: BossSchedule) {
  schedule = s;
}

export function setBossInfo(b: BossInfo | null) {
  bossInfo = b;
}

export function getSchedule() {
  return schedule;
}

export function getBossInfo() {
  return bossInfo;
}

async function postOrFindMessage(ch: TextChannel, cfg: GuildConfig) {
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
  const msg = await ch.send({ embeds: [buildCountdown(bossInfo, schedule)] });
  cfg.messageId = msg.id;
}

export async function updateAll(client: Client) {
  const now = Date.now();
  const alive =
    (globalThis as any).__testFlipAlive ?? isBossAlive(now, schedule);
  const embed = buildCountdown(bossInfo, schedule);
  for (const [gid, cfg] of guildConfigs) {
    if (!cfg.channelId) continue;
    try {
      const guild = await client.guilds.fetch(gid).catch(() => null);
      if (!guild) continue;
      const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
      if (!ch?.isTextBased()) continue;
      await postOrFindMessage(ch as TextChannel, cfg);
      if (!cfg.messageId) continue;
      const msg = await (ch as TextChannel).messages
        .fetch(cfg.messageId)
        .catch(() => null);
      if (!msg) {
        cfg.messageId = null;
        continue;
      }
      if (cfg.lastAlive !== null && cfg.lastAlive !== alive) {
        await msg.delete().catch(() => null);
        cfg.messageId = null;
        const newMsg = await (ch as TextChannel).send({ embeds: [embed] });
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

export async function refreshBossInfo() {
  try {
    const { fetchBossInfo } = await import("../bossTimers");
    bossInfo = await fetchBossInfo();
    console.info(`[INFO] ${bossInfo.name} — ${bossInfo.mapName}`);
  } catch (err) {
    console.error("[INFO]", (err as Error).message);
  }
}

export async function refreshSchedule() {
  try {
    const remote = await fetchBossSchedule();

    if (remote && remote.updatedAtMs > schedule.updatedAtMs) {
      schedule = remote;
      console.log("[schedule] Synced from Supabase (newer)");
    } else if (remote) {
      console.log("[schedule] Remote is stale, keeping local");
    } else {
      const defaults = getDefaultBossSchedule();
      if (schedule.updatedAtMs < defaults.updatedAtMs) {
        schedule = defaults;
        console.log("[schedule] No remote data, reset to defaults");
      }
    }
  } catch (err) {
    console.error("[schedule]", (err as Error).message);
  }
}

export function registerCommands(client: Client) {
  client.on("interactionCreate", async (i) => {
    if (!i.isChatInputCommand()) return;
    const { commandName, guild } = i;

    if (commandName === "boss") {
      if (!guild)
        return i.reply({ content: "❌ Server only.", ephemeral: true });
      const cfg = guildConfigs.get(guild.id);
      if (!hasRole(i, cfg?.bossRoles ?? null))
        return i.reply({ content: "❌ No permission.", ephemeral: true });
      await i.deferReply();
      return i.editReply({ embeds: [buildQuick(bossInfo, schedule, cfg?.channelId)] });
    }

    if (commandName === "setup") {
      if (!guild)
        return i.reply({ content: "❌ Server only.", ephemeral: true });
      const member = await guild.members.fetch(i.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      const ch = i.options.getChannel("channel");
      if (!ch?.isTextBased())
        return i.reply({
          content: "❌ Select a text channel.",
          ephemeral: true,
        });
      const me = await guild.members.fetchMe();
      const perms = ch.permissionsFor(me);
      if (
        !perms?.has([
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
        ])
      )
        return i.reply({
          content: `❌ No permission in ${ch}.`,
          ephemeral: true,
        });
      const existing = guildConfigs.get(guild.id);
      guildConfigs.set(guild.id, {
        channelId: ch.id,
        messageId: null,
        bossRoles: existing?.bossRoles ?? null,
        statusRoles: existing?.statusRoles ?? null,
        lastAlive: null,
      });
      console.log(`[setup] ${guild.name} → ${ch.name}`);
      await i.reply({ content: `✅ Countdown in ${ch}!`, ephemeral: true });
      try {
        await updateAll(client);
      } catch (err) {
        console.error("[setup]", (err as Error).message);
      }
      return;
    }

    if (commandName === "status") {
      if (!guild)
        return i.reply({ content: "❌ Server only.", ephemeral: true });
      const cfg = guildConfigs.get(guild.id);
      if (!hasRole(i, cfg?.statusRoles ?? null))
        return i.reply({ content: "❌ No permission.", ephemeral: true });
      if (!cfg)
        return i.reply({ content: "⚠️ Use `/setup` first.", ephemeral: true });
      const ch = await guild.channels.fetch(cfg.channelId).catch(() => null);
      let r = `Countdown: ${ch ? `<#${ch.id}>` : "(not found)"}`;
      if (cfg.bossRoles?.length)
        r += `\n🔒 /boss: ${cfg.bossRoles.map((id) => `<@&${id}>`).join(", ")}`;
      if (cfg.statusRoles?.length)
        r += `\n🔒 /status: ${cfg.statusRoles.map((id) => `<@&${id}>`).join(", ")}`;
      return i.reply({ content: r, ephemeral: true });
    }

    if (commandName === "restrict") {
      if (!guild)
        return i.reply({ content: "❌ Server only.", ephemeral: true });
      const member = await guild.members.fetch(i.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels))
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      const cmd = i.options.getString("command");
      const role = i.options.getRole("role");
      const action = i.options.getString("action");
      if (!cmd || !role || !action)
        return i.reply({ content: "❌ Missing args.", ephemeral: true });
      let cfg = guildConfigs.get(guild.id);
      if (!cfg) {
        cfg = {
          channelId: "",
          messageId: null,
          bossRoles: null,
          statusRoles: null,
          lastAlive: null,
        };
        guildConfigs.set(guild.id, cfg);
      }
      const key =
        cmd === "boss" ? "bossRoles" : cmd === "status" ? "statusRoles" : null;
      if (!key)
        return i.reply({
          content: "❌ Use `boss` or `status`.",
          ephemeral: true,
        });
      const roles = cfg[key] ?? [];
      if (action === "add") {
        if (!roles.includes(role.id)) roles.push(role.id);
        cfg[key] = roles;
      } else if (action === "remove")
        cfg[key] = roles.filter((id) => id !== role.id);
      else if (action === "clear") cfg[key] = null;
      else return i.reply({ content: "❌ Unknown action.", ephemeral: true });
      guildConfigs.set(guild.id, cfg);
      return i.reply({ content: `✅ /${cmd} updated.`, ephemeral: true });
    }
  });
}
