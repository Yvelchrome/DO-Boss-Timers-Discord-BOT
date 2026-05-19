import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import type { GuildConfig } from "./discord/config";

const DB_PATH = "data/bot.db";

if (!existsSync("data")) {
  mkdirSync("data", { recursive: true });
}

const db = new Database(DB_PATH);

db.run(`
  CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id TEXT PRIMARY KEY,
    config TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

export function loadGuildConfigs(): Map<string, GuildConfig> {
  const rows = db
    .query("SELECT guild_id, config FROM guild_configs")
    .all() as { guild_id: string; config: string }[];

  const map = new Map<string, GuildConfig>();
  for (const row of rows) {
    map.set(row.guild_id, JSON.parse(row.config) as GuildConfig);
  }
  return map;
}

export function saveGuildConfig(
  guildId: string,
  config: GuildConfig,
): void {
  db.run(
    "INSERT OR REPLACE INTO guild_configs (guild_id, config, updated_at) VALUES (?, ?, datetime('now'))",
    [guildId, JSON.stringify(config)],
  );
}

export function deleteGuildConfig(guildId: string): void {
  db.run("DELETE FROM guild_configs WHERE guild_id = ?", [guildId]);
}

export function closeDb(): void {
  db.close();
}
