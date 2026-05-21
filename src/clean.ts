import { Routes } from "discord.js";
import { createRestClient } from "./api";

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const rest = createRestClient();

async function clean() {
  if (!CLIENT_ID) throw new Error("CLIENT_ID is required");

  try {
    console.log("Clearing global commands...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log("Global commands cleared");

    if (GUILD_ID) {
      console.log(`Clearing guild commands for ${GUILD_ID}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: [],
      });
      console.log("Guild commands cleared");
    }

    console.log(
      "\nAll commands removed. Run `bun run register` to re-register.",
    );
  } catch (err) {
    console.error("Clean failed:", err);
    process.exit(1);
  }
}
clean();
