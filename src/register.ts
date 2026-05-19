import { REST, Routes, SlashCommandBuilder } from "discord.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is required");
const rest = new REST().setToken(DISCORD_TOKEN);

const commands = [
  new SlashCommandBuilder()
    .setName("boss")
    .setDescription("Check boss spawn timer"),
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
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check boss timer setup status for this server"),
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
          { name: "status", value: "status" },
        ),
    )
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Role to add/remove")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Add, remove, or clear role restriction")
        .setRequired(true)
        .addChoices(
          { name: "add", value: "add" },
          { name: "remove", value: "remove" },
          { name: "clear", value: "clear" },
        ),
    ),
].map((command) => command.toJSON());

async function register() {
  if (!CLIENT_ID) throw new Error("CLIENT_ID is required");

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
