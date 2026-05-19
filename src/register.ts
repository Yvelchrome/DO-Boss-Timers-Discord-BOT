import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { fetchBosses } from "./bossTimers/bosses";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");
const rest = new REST().setToken(DISCORD_TOKEN);

async function register() {
  if (!CLIENT_ID) throw new Error("CLIENT_ID is required");

  const bosses = await fetchBosses();
  const bossChoices =
    bosses.length > 0
      ? bosses.map((b) => ({ name: b.bossId, value: b.bossId }))
      : undefined;

  const commands = [
    new SlashCommandBuilder()
      .setName("boss")
      .setDescription("Check boss spawn timer")
      .addStringOption((option) =>
        option
          .setName("boss")
          .setDescription("Boss name to check")
          .setRequired(true)
          .addChoices(...(bossChoices ?? [])),
      ),
    new SlashCommandBuilder()
      .setName("setup")
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
      .setName("status")
      .setDescription("Check boss timer setup status for this server"),
    new SlashCommandBuilder()
      .setName("reset")
      .setDescription("Wipe boss timer configuration for this server (admin only)"),
    new SlashCommandBuilder()
      .setName("remove-countdown")
      .setDescription("Delete the countdown message for a boss (admin only)")
      .addStringOption((option) =>
        option
          .setName("boss")
          .setDescription("Boss whose countdown to remove")
          .setRequired(true)
          .addChoices(...(bossChoices ?? [])),
      ),
    new SlashCommandBuilder()
      .setName("restrict")
      .setDescription("Restrict /boss or /status to specific roles (admin only)")
      .addStringOption((option) =>
        option
          .setName("command")
          .setDescription("Which command to restrict")
          .setRequired(true)
          .addChoices(
            { name: "boss", value: "boss" },
          ),
      )
      .addStringOption((option) =>
        option
          .setName("action")
          .setDescription("Allow or disallow a role, or clear all")
          .setRequired(true)
          .addChoices(
            { name: "allow role", value: "add" },
            { name: "disallow role", value: "remove" },
            { name: "clear all restrictions", value: "clear" },
          ),
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role to allow or disallow (not needed for clear)")
          .setRequired(false),
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
