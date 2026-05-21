# DO | Boss Timers - Discord Bot

Discord bot that displays a live spawn countdown for the Digital Odyssey bosses.

---

## For Server Admins

### First setup

1. Add the bot to your server
2. **`/timer-setup <channel> <boss>`** - pick a text channel and a boss
3. The bot sends a countdown message and keeps it updated every 10s

### Commands

#### `/timer-setup <channel> <boss>` - Set up countdown
Sends a countdown message in the chosen channel and auto-updates it every 10s.

- **Requires:** `Manage Channels` permission
- Bot needs `Send Messages` and `Embed Links` in the channel

#### `/timer-status` - View configuration
Shows the configured boss and countdown channel.

- **Usable by:** everyone (visible for self)
- **Auto-detection:** if someone deletes the countdown message, the bot detects it on next `/timer-status` and removes the boss info. Run `/timer-setup` to restore it.

#### `/timer-remove <boss>` - Delete the message
Removes the countdown message without wiping configuration.

- **Requires:** `Manage Channels` permission
- Config is kept, only the message is deleted
- To restore: `/timer-setup`

#### `/timer-reset` - Wipe everything
Deletes the countdown messages AND all server configuration (boss, channel).

- **Requires:** `Manage Channels` permission
- Irreversible. Everything must be reconfigured.

### Permission table

| Command | Required permission |
|---|---|
| `/timer-setup` | Manage Channels |
| `/timer-status` | Everyone |
| `/timer-remove` | Manage Channels |
| `/timer-reset` | Manage Channels |


---

## For Developers

### Requirements

- [Bun](https://bun.sh)
- Discord Bot credentials ([Developer Portal](https://discord.com/developers/applications))

### Setup

```bash
bun install
cp .env.example .env   # fill DISCORD_TOKEN + CLIENT_ID
bun run clean          # remove all registered commands
bun run register       # register slash commands
bun run start          # start the bot
```

### Scripts

| Command | Action |
|---|---|
| `bun run dev` | Dev with hot reload |
| `bun run start` | Production start |
| `bun run clean` | Remove all registered commands |
| `bun run register` | Register slash commands |

### Deployment (Oracle Cloud Always Free)

1. Create an [Oracle Cloud account](https://signup.cloud.oracle.com/) (credit card required for verification, 0€ charged)
2. Create a VM instance: Ubuntu 22.04/24.04, ARM (Ampere A1) — free tier gives up to 4 OCPU + 24 GB RAM
3. SSH into the instance
4. Run the setup script:

```bash
# Edit deploy/setup-vm.sh first: set REPO_URL to your git remote
# Then copy and run on the VM:
bash deploy/setup-vm.sh
```

5. Fill in your tokens:
```bash
nano .env   # DISCORD TOKEN + CLIENT_ID
```

6. Start the bot:
```bash
sudo systemctl start boss-timer-bot
sudo journalctl -u boss-timer-bot -f   # check logs
```

The bot runs via **systemd** — auto-starts on VM reboot, auto-restarts on crash.

### Internals

- Config stored in local SQLite (persists across restarts)
- Boss timers fetched from [raid-timer API](https://thedigitalodyssey.com/api/raid-timer) every 10sec (Website default behavior)
- Boss info fetched from [wiki API](https://thedigitalodyssey.com/api/wiki) every 2h
- Single embed per boss, edited in place every 10s
