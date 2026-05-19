import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import {
  registerCommands,
  updateAll,
  refreshAllBosses,
  refreshSchedules,
  refreshBossInfos,
} from "./discord/commands";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.login(DISCORD_TOKEN);
client.once("clientReady", async () => {
  console.info(`[BOT] ${client.user?.tag}`);

  client.user?.setActivity("Any bugs ? @yvelchrome", {
    type: ActivityType.Watching,
  });

  await refreshAllBosses();
  await updateAll(client);
  setInterval(() => updateAll(client), 60_000);
  setInterval(refreshSchedules, 60_000);
  setInterval(refreshBossInfos, 2 * 60 * 60_000);

  if (process.env.TEST_MODE === "1") {
    console.log("[test] Flipping alive/dead every 10s");
    let flipAlive = false;
    setInterval(() => {
      flipAlive = !flipAlive;
      (globalThis as any).__testFlipAlive = flipAlive;
      updateAll(client);
    }, 10_000);
  }
});
registerCommands(client);
