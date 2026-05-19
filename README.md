# DO | Boss Timers — Discord Bot

Discord bot that displays a live spawn countdown for the Digital Odyssey bosses.

---

## For Server Admins

### First setup

1. Add the bot to your server
2. **`/setup #channel boss_name`** — pick a text channel and a boss
3. The bot sends a countdown message and keeps it updated every 60s

### Commands

#### `/boss <boss>` — Check a boss
Shows instant boss status: alive or dead, time until next spawn, location, loot.

- **Default access:** admins only (configurable via `/restrict`)

#### `/setup <channel> <boss>` — Set up countdown
Sends a countdown message in the chosen channel and auto-updates it.

- **Requires:** `Manage Channels` permission
- Bot needs `Send Messages` and `Embed Links` in the channel

#### `/status` — View configuration
Shows current server setup.

- **Visible by:** everyone (ephemeral)
- **Everyone sees:** configured boss and countdown channel
- **Admins also see:** access restrictions

**Auto-detection:** if someone deletes the countdown message, the bot detects it on next `/status` and removes the boss info. Admins must re-run `/setup` to restore it.

#### `/restrict <command> <action> [role]` — Restrict `/boss`
Control who can use `/boss`. `/status` is always public.

- **Requires:** `Manage Channels` permission

**Actions:**
| Action | Effect |
|--------|--------|
| `allow role @role` | This role can use `/boss` |
| `disallow role @role` | This role loses access to `/boss` |
| `clear all restrictions` | Reset to default (admins only) |

**Default:** `/boss` is admins only.

#### `/remove-countdown <boss>` — Delete the message
Removes the countdown message without wiping configuration.

- **Requires:** `Manage Channels` permission
- Config is kept, only the message is deleted
- To restore: `/setup`

#### `/reset` — Wipe everything
Deletes the countdown message AND all server configuration (boss, channel, restrictions).

- **Requires:** `Manage Channels` permission
- Irreversible. Everything must be reconfigured.

### Permission table

| Command | Default | After allowing a role |
|---|---|---|
| `/boss` | Admins only | That role can use it |
| `/status` | Everyone (read-only) | Same |
| `/setup` | Manage Channels | Manage Channels |
| `/restrict` | Manage Channels | Manage Channels |
| `/remove-countdown` | Manage Channels | Manage Channels |
| `/reset` | Manage Channels | Manage Channels |

**Admin =** `Manage Channels` permission or server owner.

### FAQ

**The countdown message was deleted, how to restore it?**
Re-run `/setup` with the same channel and boss.

**I restricted `/boss` to a role and now nobody can use it**
Use `/restrict command:boss action:allow role:@role` to allow a role, or `/restrict command:boss action:clear all restrictions` to reset to default (admins only).

**I can't see restrictions in `/status`**
Restrictions are only visible to admins (Manage Channels or server owner).

**The bot stopped responding**
Check the bot still has access to the channel and has `Send Messages` / `Embed Links` permissions.

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
- Single embed per guild, edited in place every 60s
