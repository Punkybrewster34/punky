"""Config loader. Everything tunable lives in config.yaml."""
import os
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, "config.yaml")
DATA_DIR = os.path.join(ROOT, "data")
INBOX_DIR = os.path.join(DATA_DIR, "inbox")
SAMPLES_DIR = os.path.join(DATA_DIR, "samples")
DASHBOARDS_DIR = os.path.join(ROOT, "dashboards")
DB_PATH = os.path.join(DATA_DIR, "haven.db")

_cache = None


def load(path=None):
    global _cache
    if path is None and _cache is not None:
        return _cache
    with open(path or CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    if path is None:
        _cache = cfg
    return cfg


def column_map(name):
    """Return {logical_field: [candidate headers...]} for an import type."""
    return load()["column_maps"][name]


def channel_spend(month_key):
    """Monthly ad spend dict for 'YYYY-MM', empty dict if not configured."""
    spend = load().get("channel_spend") or {}
    return {str(k).lower(): float(v) for k, v in (spend.get(month_key) or {}).items()}
