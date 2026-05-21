import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import type { GuildConfig } from "./discord/config";

function isGuildConfig(obj: unknown): obj is GuildConfig {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const c = obj as Record<string, unknown>;
  return (
    typeof c.channelId === "string" &&
    (c.messageId === null || typeof c.messageId === "string") &&
    typeof c.bossId === "string" &&
    (c.lastAlive === null || typeof c.lastAlive === "boolean") &&
    (c.notifyRoleId === null || typeof c.notifyRoleId === "string") &&
    (c.notifyMinutes === null || typeof c.notifyMinutes === "number") &&
    (c.lastNotifySpawnTs === null || typeof c.lastNotifySpawnTs === "number") &&
    (c.lastNotifyMsgId === null || typeof c.lastNotifyMsgId === "string")
  );
}

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
  const rows: { guild_id: string; config: string }[] = db
    .query("SELECT guild_id, config FROM guild_configs")
    .all();

  const map = new Map<string, GuildConfig>();
  for (const row of rows) {
    const parsed = JSON.parse(row.config);
    if (!isGuildConfig(parsed)) {
      console.warn(`[DB] Invalid config for guild ${row.guild_id}, skipping`);
      continue;
    }
    map.set(row.guild_id, parsed);
  }
  return map;
}

export function saveGuildConfig(guildId: string, config: GuildConfig): void {
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
