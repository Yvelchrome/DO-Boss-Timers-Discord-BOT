import { type Client } from "discord.js";
import { handleNotifyButton } from "./notify";
import { handleTimerSetup } from "./commands/setup";
import { handleTimerStatus } from "./commands/status";
import { handleTimerReset } from "./commands/reset";
import { handleTimerRemove } from "./commands/remove";
import { handleTimerNotify } from "./commands/notify";

export function registerCommands(client: Client) {
  client.on("interactionCreate", async (i): Promise<void> => {
    if (i.isButton()) {
      if (i.customId === "notify_optin" || i.customId === "notify_optout") {
        await handleNotifyButton(i);
      }
      return;
    }

    if (!i.isChatInputCommand()) return;

    if (!i.guild) {
      void i.reply({ content: "❌ Server only.", ephemeral: true });
      return;
    }

    const { commandName } = i;

    switch (commandName) {
      case "timer-setup":
        await handleTimerSetup(i, client);
        break;
      case "timer-status":
        await handleTimerStatus(i, client);
        break;
      case "timer-reset":
        await handleTimerReset(i, client);
        break;
      case "timer-remove":
        await handleTimerRemove(i, client);
        break;
      case "timer-notify":
        await handleTimerNotify(i, client);
        break;
      default:
        // Unknown command - silently ignore
        break;
    }
  });
}
