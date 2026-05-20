#!/usr/bin/env bash
set -euo pipefail

# Oracle Cloud VM setup for DO Boss Timers Bot
# Run this ONCE after creating the instance.
# Designed for Ubuntu 24.04, user=ubuntu
# Usage: bash setup-vm.sh (as root via cloud-init, or as ubuntu)

REPO_URL="https://github.com/Yvelchrome/DO-Boss-Timers-Discord-BOT.git"
APP_DIR="/home/ubuntu/DO-Boss-Timers-Discord-BOT"
BUN_BIN="/home/ubuntu/.bun/bin/bun"

# Detect if running as root (cloud-init) or as ubuntu
if [ "$(id -u)" -eq 0 ]; then
  SUDO="sudo -u ubuntu"
  BUN_HOME="BUN_INSTALL=/home/ubuntu/.bun"
else
  SUDO=""
  BUN_HOME=""
fi

echo "=== 1. System packages ==="
sudo apt-get update -qq
sudo apt-get install -y -qq unzip curl git

echo "=== 2. Install Bun ==="
if ! $SUDO test -f "$BUN_BIN" 2>/dev/null; then
  $SUDO sh -c 'curl -fsSL https://bun.sh/install | bash'
fi
$SUDO $BUN_BIN --version

echo "=== 3. Clone repo ==="
if [ -d "$APP_DIR" ]; then
  echo "Repo already exists, pulling..."
  cd "$APP_DIR" && $SUDO git pull
else
  $SUDO git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "=== 4. Install dependencies ==="
$SUDO $BUN_BIN install

echo "=== 5. Create .env ==="
if [ ! -f "$APP_DIR/.env" ]; then
  $SUDO tee "$APP_DIR/.env" > /dev/null << 'ENVEOF'
DISCORD_TOKEN=""
CLIENT_ID=""
GUILD_ID="" # Optional: guild ID for instant slash commands
ENVEOF
  echo ".env created — EDIT IT with your tokens: nano $APP_DIR/.env"
else
  echo ".env already exists"
fi

echo "=== 6. Create data directory ==="
$SUDO mkdir -p "$APP_DIR/data"

echo "=== 7. Install systemd service ==="
sudo cp "$APP_DIR/deploy/boss-timer-bot.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable boss-timer-bot

echo ""
echo "======================================"
echo " Setup complete!"
echo ""
echo " NEXT STEPS:"
echo " 1. Edit .env:  sudo -u ubuntu nano $APP_DIR/.env"
echo " 2. Register commands: cd $APP_DIR && sudo -u ubuntu bun run register"
echo " 3. Start bot:  sudo systemctl start boss-timer-bot"
echo " 4. Check logs: sudo journalctl -u boss-timer-bot -f"
echo "======================================"
