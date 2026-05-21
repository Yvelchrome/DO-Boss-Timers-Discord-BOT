import { REST } from "discord.js";

const API_BASE = "https://thedigitalodyssey.com/api";
export const RAID_TIMER_API = `${API_BASE}/raid-timer`;
export const WIKI_API = `${API_BASE}/wiki`;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

export function createRestClient(): REST {
  if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");
  return new REST().setToken(DISCORD_TOKEN);
}
