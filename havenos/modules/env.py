"""Tiny .env loader — no python-dotenv dependency. Reads KEY=VALUE
lines from havenos/.env; real environment variables win."""
import os

from . import config


def get(key, default=""):
    if key in os.environ:
        return os.environ[key]
    path = os.path.join(config.ROOT, ".env")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                if k.strip() == key:
                    return v.strip().strip('"').strip("'")
    return default
