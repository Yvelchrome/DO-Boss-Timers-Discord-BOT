import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import { initConfigs, closeDb } from "./discord/config";
import {
  registerCommands,
  updateAll,
  refreshAllBosses,
  refreshTimers,
} from "./discord/commands";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.login(DISCORD_TOKEN);
client.once("clientReady", async () => {
  try {
    initConfigs();
    console.info(`[BOT] ${client.user?.tag}`);

    client.user?.setActivity("Feedback ? @yvelchrome", {
      type: ActivityType.Watching,
    });

    await refreshAllBosses();
    await updateAll(client);

    setInterval(async () => {
      await refreshTimers();
      await updateAll(client);
    }, 10_000);
    setInterval(refreshAllBosses, 2 * 60 * 60_000);
  } catch (err) {
    console.error("[BOT] Startup failed:", (err as Error).message);
  }
});
registerCommands(client);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  closeDb();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("exit", () => {
  if (!shuttingDown) closeDb();
});
