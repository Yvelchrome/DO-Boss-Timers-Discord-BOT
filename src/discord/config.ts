import type { ChatInputCommandInteraction, GuildMember } from "discord.js";

export type GuildConfig = {
  channelId: string;
  messageId: string | null;
  bossName: string;
  bossRoles: string[] | null;
  statusRoles: string[] | null;
  lastAlive: boolean | null;
};

export const guildConfigs = new Map<string, GuildConfig>();

export function hasRole(
  interaction: ChatInputCommandInteraction,
  roleIds: string[] | null,
): boolean {
  if (!roleIds?.length) return true;
  return (interaction.member as GuildMember).roles.cache.some((r) =>
    roleIds.includes(r.id),
  );
}

export function titleCase(v: string): string {
  const c = v.replace(/[_-]+/g, " ").trim();
  return c ? c.replace(/\b\w/g, (x) => x.toUpperCase()) : v;
}
