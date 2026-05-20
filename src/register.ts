import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { fetchRaidBosses } from "./bossTimers/bosses";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");
const rest = new REST().setToken(DISCORD_TOKEN);

async function register() {
  if (!CLIENT_ID) throw new Error("CLIENT_ID is required");

  const bosses = await fetchRaidBosses();
  const bossChoices =
    bosses.length > 0
      ? bosses.slice(0, 25).map((boss) => ({
          name: boss.monster_name,
          value: boss.monster_id,
        }))
      : undefined;

  const commands = [
    new SlashCommandBuilder()
      .setName("timer-setup")
      .setDescription("Set up the boss timer countdown channel")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Text channel to post the countdown")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("boss")
          .setDescription("Boss name to track")
          .setRequired(true)
          .addChoices(...(bossChoices ?? [])),
      ),
    new SlashCommandBuilder()
      .setName("timer-status")
      .setDescription("Check boss timer setup status for this server"),
    new SlashCommandBuilder()
      .setName("timer-reset")
      .setDescription(
        "Wipe boss timer configuration for this server (admin only)",
      ),
    new SlashCommandBuilder()
      .setName("timer-remove")
      .setDescription("Delete the countdown message for a boss (admin only)")
      .addStringOption((option) =>
        option
          .setName("boss")
          .setDescription("Boss whose countdown to remove")
          .setRequired(true)
          .addChoices(...(bossChoices ?? [])),
      ),
  ].map((command) => command.toJSON());

  try {
    if (GUILD_ID) {
      console.log(`Registering slash commands to guild ${GUILD_ID}...`);
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
        body: commands,
      });
      console.log("Slash commands registered (guild-only - appear instantly)");
    } else {
      console.log("Registering global slash commands...");
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log(
        "Slash commands registered globally (may take up to 1h to appear)",
      );
    }
  } catch (err) {
    console.error("Registration failed:", err);
    process.exit(1);
  }
}
register();
