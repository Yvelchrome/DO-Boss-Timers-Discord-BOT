# DO | Boss Timers — Discord Bot

Discord bot that displays a live spawn countdown for the Digital Odyssey bosses.

---

## For Server Admins

### First setup

1. Add the bot to your server
2. **`/timer-setup #channel boss_name`** — pick a text channel and a boss
3. The bot sends a countdown message and keeps it updated every 60s

### Commands

#### `/timer-setup <channel> <boss>` — Set up countdown
Sends a countdown message in the chosen channel and auto-updates it every 60s.

- **Requires:** `Manage Channels` permission
- Bot needs `Send Messages` and `Embed Links` in the channel

#### `/timer-status` — View configuration
Shows the configured boss and countdown channel.

- **Usable by:** everyone (visible for self)
- **Auto-detection:** if someone deletes the countdown message, the bot detects it on next `/timer-status` and removes the boss info. Run `/timer-setup` to restore it.

#### `/timer-remove <boss>` — Delete the message
Removes the countdown message without wiping configuration.

- **Requires:** `Manage Channels` permission
- Config is kept, only the message is deleted
- To restore: `/timer-setup`

#### `/timer-reset` — Wipe everything
Deletes the countdown message AND all server configuration (boss, channel).

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

### Internals

- Config stored in memory per guild (lost on bot server restart)
- Countdown computed client-side: `anchor + N * cycle`
- Boss info fetched from wiki proxy every 2h
- Supabase schedule sync every 60s (falls back to hardcoded defaults on miss)
- Single embed per boss, edited in place every 60s
