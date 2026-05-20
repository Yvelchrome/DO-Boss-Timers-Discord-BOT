import { loadGuildConfigs, saveGuildConfig, deleteGuildConfig, closeDb } from "../db";

export type GuildConfig = {
  channelId: string;
  messageId: string | null;
  bossId: string;
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

export function titleCase(v: string): string {
  const c = v.replace(/[_-]+/g, " ").trim();
  return c ? c.replace(/\b\w/g, (x) => x.toUpperCase()) : v;
}
