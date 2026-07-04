#!/bin/bash
# HavenOS — First-time setup for Mac. Double-click this file to run it.
# (If macOS says it can't be opened, right-click it and choose "Open".)

cd "$(dirname "$0")/../.." || exit 1   # repo root (this file lives in havenos/mac/)
clear
echo "=================================================="
echo "   HAVEN OS  ·  First-Time Setup"
echo "=================================================="
echo ""

# --- Python 3 -------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "X  Python 3 is not installed yet."
  echo ""
  echo "   Install it (one download, a few clicks):"
  echo "     1. Go to   https://www.python.org/downloads/"
  echo "     2. Click the big yellow 'Download Python' button"
  echo "     3. Open the downloaded file and click through the installer"
  echo "     4. Then double-click this Setup file again."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "OK  Python found: $(python3 --version)"

# --- PyYAML (the one add-on HavenOS needs) --------------------
echo ""
echo "Installing the one add-on HavenOS needs..."
python3 -m pip install --user --quiet --upgrade pip >/dev/null 2>&1
if python3 -m pip install --user --quiet pyyaml >/dev/null 2>&1; then
  echo "OK  Add-on installed."
else
  echo "!!  Could not install the add-on automatically."
  echo "    Run this Setup again, or send this screen to support."
fi

# --- Git (via GitHub Desktop) ---------------------------------
echo ""
if command -v git >/dev/null 2>&1; then
  echo "OK  Git found."
else
  echo "i   Git isn't ready. Open GitHub Desktop once and it will finish setup."
fi

# --- One-time: current Google review count --------------------
echo ""
echo "One quick question so your review tracker is accurate."
read -r -p "How many Google reviews does Haven have RIGHT NOW? (Enter to skip) " REVCOUNT
if [ -n "$REVCOUNT" ]; then
  if python3 havenos/haven.py reviews baseline "$REVCOUNT" >/dev/null 2>&1; then
    echo "OK  Saved: starting from $REVCOUNT reviews."
  fi
fi

# --- Make the weekly script runnable + create the inbox -------
chmod +x "$(dirname "$0")/2-Update-My-Dashboards.command" 2>/dev/null
mkdir -p havenos/data/inbox

echo ""
echo "=================================================="
echo "DONE — setup complete."
echo ""
echo "PUT YOUR EXPORTED CSV FILES HERE each week:"
echo "   $(pwd)/havenos/data/inbox"
echo ""
echo "Then double-click:  2-Update-My-Dashboards.command"
echo "Full guide:         havenos/docs/mac-setup.md"
echo "=================================================="
echo ""
read -n 1 -s -r -p "Press any key to close..."
