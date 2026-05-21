# DO | Boss Timers - Discord Bot

Discord bot that displays a live spawn countdown for the Digital Odyssey bosses.

---

Digital Odyssey is a private server for the game DMO (Digimon Master Online).

Server website link: [https://thedigitalodyssey.com/](https://thedigitalodyssey.com/)

Server Discord link: [https://discord.thedigitalodyssey.com/](https://discord.thedigitalodyssey.com/)

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

#### `/timer-notify <role> <minutes>` - Set up notifications
Pings a role X minutes before boss spawn.

- **Requires:** `Manage Channels` permission
- Bot needs `Mention Everyone` permission to ping roles
- Minutes must be ≤ boss respawn time
- Use `/timer-notify off` to disable notifications

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
| `/timer-notify` | Manage Channels |
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

### Internals

- Config stored in local SQLite (persists across restarts)
- Boss timers fetched from [raid-timer API](https://thedigitalodyssey.com/api/raid-timer) every 10sec (Website default behavior)
- Boss info fetched from [wiki API](https://thedigitalodyssey.com/api/wiki) every 2h
- Single embed per boss, edited in place every 10s
