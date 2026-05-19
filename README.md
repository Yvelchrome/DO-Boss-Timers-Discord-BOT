# DO | Boss Timers — Discord Bot

Discord bot that displays a live spawn countdown for the Digital Odyssey bosses. Works in any server with no per-server config.

## Requirements

- [Bun](https://bun.sh)
- Discord Bot credentials ([Developer Portal](https://discord.com/developers/applications))

## Setup

```bash
bun install
cp .env.example .env   # fill DISCORD_TOKEN + CLIENT_ID
bun run clean          # remove all registered commands
bun run register       # register slash commands
bun run start          # start the bot
```

## Commands

| Command | Permission | Effect |
|---------|-----------|--------|
| `/setup #channel` | Manage Channels | Set countdown channel |
| `/boss` | anyone (restrictable) | Show instant timer |
| `/status` | anyone (restrictable) | Show the countdown channel |
| `/restrict` | Manage Channels | Lock /boss or /status to a role |

## Scripts

| Command | Action |
|---------|--------|
| `bun run dev` | Dev with hot reload |
| `bun run start` | Production start |
| `bun run clean` | Remove all registered commands |
| `bun run register` | Register slash commands |

## Internals

- Config stored in memory per guild (lost on bot server restart)
- Countdown computed client-side: `anchor + N * cycle`
- Boss info fetched from wiki proxy every 2h
- Supabase schedule sync every 60s (falls back to hardcoded defaults on miss)
- Single embed per guild, edited in place every 60s
