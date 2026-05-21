import {
  PermissionFlagsBits,
  type Client,
  type TextChannel,
  EmbedBuilder,
} from "discord.js";
import { bossData, bossDisplayName } from "../bossTimers/bosses";
import {
  guildConfigs,
  persistConfig,
  removeGuildConfig,
} from "./config";
import { buildCountdown } from "./embeds";
import { buildNotifyRow, handleNotifyButton } from "./notify";
import { updateAll } from "../update";

export function registerCommands(client: Client) {
  client.on("interactionCreate", async (i) => {
    if (i.isButton()) {
      if (i.customId === "notify_optin" || i.customId === "notify_optout") {
        await handleNotifyButton(i);
      }
      return;
    }

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

      const row = buildNotifyRow(guild.id);
      const msg = await ch.send({
        embeds: [
          buildCountdown(data.bossInfo, data.raidBoss, data.spawnedAtMs),
        ],
        components: row ? [row] : [],
      });

      const prevCfg = guildConfigs.get(guild.id);
      guildConfigs.set(guild.id, {
        notifyRoleId: null,
        notifyMinutes: null,
        lastNotifySpawnTs: null,
        lastNotifyMsgId: null,
        ...prevCfg,
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

    if (commandName === "timer-notify") {
      const sub = i.options.getSubcommand();
      const notifyCfg = guildConfigs.get(guild.id);

      if (sub === "off") {
        const member = await guild.members.fetch(i.user.id);
        if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
          return i.reply({
            content: "❌ Need **Manage Channels**.",
            ephemeral: true,
          });
        }

        if (!notifyCfg) {
          return i.reply({
            content: "⚠️ No configuration found for this server.",
            ephemeral: true,
          });
        }

        if (notifyCfg.lastNotifyMsgId && notifyCfg.channelId) {
          const ch = await guild.channels
            .fetch(notifyCfg.channelId)
            .catch(() => null);
          if (ch?.isTextBased()) {
            await ch.messages
              .delete(notifyCfg.lastNotifyMsgId)
              .catch(() => null);
          }
        }

        notifyCfg.notifyRoleId = null;
        notifyCfg.notifyMinutes = null;
        notifyCfg.lastNotifySpawnTs = null;
        notifyCfg.lastNotifyMsgId = null;
        persistConfig(guild.id);

        if (notifyCfg.channelId && notifyCfg.messageId) {
          const ch = await guild.channels
            .fetch(notifyCfg.channelId)
            .catch(() => null);
          if (ch?.isTextBased()) {
            const msg = await ch.messages
              .fetch(notifyCfg.messageId)
              .catch(() => null);
            if (msg) {
              await msg.edit({ components: [] }).catch(() => null);
            }
          }
        }

        console.log(`[notify] ${guild.name} → notifications disabled`);
        return i.reply({
          content: "✅ Notifications disabled.",
          ephemeral: true,
        });
      }

      const member = await guild.members.fetch(i.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return i.reply({
          content: "❌ Need **Manage Channels**.",
          ephemeral: true,
        });
      }

      const me = await guild.members.fetchMe();
      if (!me.permissions.has(PermissionFlagsBits.MentionEveryone)) {
        return i.reply({
          content: "❌ I need **Mention Everyone** permission to ping roles.",
          ephemeral: true,
        });
      }

      const role = i.options.getRole("role", true);
      const minutes = i.options.getInteger("minutes", true);

      const data = bossData.get(notifyCfg?.bossId ?? "");
      if (data && data.raidBoss.respawn_sec > 0) {
        const maxMinutes = data.raidBoss.respawn_sec / 60;
        if (minutes > maxMinutes) {
          return i.reply({
            content: `❌ **${minutes}min** is longer than the boss respawn time (**${maxMinutes}min**). Max: **${maxMinutes}min**.`,
            ephemeral: true,
          });
        }
      }

      guildConfigs.set(guild.id, {
        channelId: "",
        messageId: null,
        bossId: "",
        lastAlive: null,
        ...notifyCfg,
        notifyRoleId: role.id,
        notifyMinutes: minutes,
        lastNotifySpawnTs: null,
      });
      persistConfig(guild.id);

      if (notifyCfg?.channelId && notifyCfg?.messageId) {
        const ch = await guild.channels
          .fetch(notifyCfg.channelId)
          .catch(() => null);
        if (ch?.isTextBased()) {
          const msg = await ch.messages
            .fetch(notifyCfg.messageId)
            .catch(() => null);
          if (msg) {
            const row = buildNotifyRow(guild.id);
            await msg
              .edit({ components: row ? [row] : [] })
              .catch(() => null);
          }
        }
      }

      console.log(`[notify] ${guild.name} → @${role.name} (${minutes}min)`);
      return i.reply({
        content: `✅ Notifications set: <@&${role.id}> will be pinged **${minutes}min** before spawn.`,
        ephemeral: true,
      });
    }
  });
}
