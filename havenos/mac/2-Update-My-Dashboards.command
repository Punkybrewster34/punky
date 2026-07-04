#!/bin/bash
# HavenOS — your weekly routine. Double-click this file after you've put
# your exported CSV files into  havenos/data/inbox

cd "$(dirname "$0")/../.." || exit 1   # repo root
clear
echo "=================================================="
echo "   HAVEN OS  ·  Updating your dashboards"
echo "=================================================="
echo ""

INBOX="havenos/data/inbox"
CSVS=$(ls "$INBOX"/*.csv 2>/dev/null | wc -l | tr -d ' ')
if [ "$CSVS" = "0" ]; then
  echo "!!  No data files found in the inbox."
  echo ""
  echo "    First, drop your exported CSV files into:"
  echo "      $(pwd)/$INBOX"
  echo ""
  echo "    File names must contain 'bookings', 'leads', or 'reviews'."
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
echo "Found $CSVS file(s) in the inbox. Crunching your numbers..."
echo ""

if ! python3 havenos/haven.py monday; then
  echo ""
  echo "!!  Something went wrong reading the data. Check the messages above."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
if ! python3 havenos/haven.py publish; then
  echo "!!  Could not bundle the dashboards."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo "Publishing to your website..."
git add -A
if git diff --cached --quiet; then
  echo "i   Nothing new to publish (data looks the same as last time)."
else
  git commit -m "Update dashboards $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1
  if git push >/dev/null 2>&1; then
    echo "OK  Pushed! Your website updates in about a minute."
  else
    echo "!!  Could not push automatically."
    echo "    Open GitHub Desktop and click 'Push origin' to finish."
  fi
fi

echo ""
echo "=================================================="
echo "DONE.  Open your site and add  /havenos  to see it."
echo "=================================================="
echo ""
read -n 1 -s -r -p "Press any key to close..."
