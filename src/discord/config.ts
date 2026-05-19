import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import {
  loadGuildConfigs,
  saveGuildConfig,
  deleteGuildConfig,
  closeDb,
} from "../db";

export type GuildConfig = {
  channelId: string;
  messageId: string | null;
  bossName: string;
  bossRoles: string[] | null;
  statusRoles: string[] | null;
  lastAlive: boolean | null;
};

export const guildConfigs = new Map<string, GuildConfig>();

export function initConfigs(): void {
  const loaded = loadGuildConfigs();
  guildConfigs.clear();
  for (const [id, cfg] of loaded) {
    guildConfigs.set(id, cfg);
  }
}

export function persistConfig(guildId: string): void {
  const cfg = guildConfigs.get(guildId);
  if (cfg) saveGuildConfig(guildId, cfg);
}

export function removeGuildConfig(guildId: string): void {
  guildConfigs.delete(guildId);
  deleteGuildConfig(guildId);
}

export { closeDb };

function isAdmin(member: GuildMember): boolean {
  const guild = member.guild;
  if (guild.ownerId === member.id) return true;
  return member.permissions.has(PermissionFlagsBits.ManageChannels);
}

export function hasRole(
  interaction: ChatInputCommandInteraction,
  roleIds: string[] | null,
): boolean {
  if (roleIds === null) {
    const guild = interaction.guild;
    if (!guild) return false;
    return isAdmin(interaction.member as GuildMember);
  }

  if (roleIds.length === 0) {
    const guild = interaction.guild;
    if (!guild) return false;
    return isAdmin(interaction.member as GuildMember);
  }

  return (interaction.member as GuildMember).roles.cache.some((r) =>
    roleIds.includes(r.id),
  );
}

export function titleCase(v: string): string {
  const c = v.replace(/[_-]+/g, " ").trim();
  return c ? c.replace(/\b\w/g, (x) => x.toUpperCase()) : v;
}
