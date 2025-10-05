#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Manifest-Generator mit Dual-Source-Overlay:
- Virtueller Root: Repo-Root (.)
- Overlay-Regel: Der komplette Baum des sd_engine-Checkouts erscheint virtuell unter
  "1_architecture/1-2 UID-E ...".
- Für Repo-Dateien (.) werden relative Pfade belassen.
- Für Engine-Dateien wird zusätzlich eine jsDelivr-URL (main-Branch) eingetragen,
  damit Downloads/Öffnen im Browser sauber funktionieren (MIME/CORS).
"""

import os
import re
import json
import fnmatch
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set

ROOT = Path(__file__).resolve().parent.parent
API_DIR = ROOT / "api"
OUT_FILE = API_DIR / "manifest.json"
CONF_FILE = API_DIR / "manifest.config.json"
IGNORE_FILE = ROOT / ".manifestignore"

def natural_key(s: str):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

def load_config() -> dict:
    cfg = {
        "virtual_root": ".",
        "include_top": [],
        "auto_top_regex": r"^\d+[_ -].*$",
        "overlay_rules": [],
        "repo_base_url": "https://repository.infektionsdynamiken.de",
        "engine_cdn_base": "https://cdn.jsdelivr.net/gh/infektionsdynamiken/infektionsdynamiken-engine@main",
        "exclude_dirs": [".git", ".github", "api"],
        "exclude_globs": ["**/node_modules/**", "**/.git/**", "**/.DS_Store"]
    }
    if CONF_FILE.exists():
        with CONF_FILE.open("r", encoding="utf-8") as f:
            try:
                data = json.load(f)
                if isinstance(data, dict):
                    for k, v in data.items():
                        cfg[k] = v
            except Exception:
                pass

    env_roots = os.getenv("INCLUDED_ROOTS", "").strip()
    if env_roots:
        cfg["include_top"] = [p.strip() for p in env_roots.split(",") if p.strip()]

    if IGNORE_FILE.exists():
        lines = [ln.strip() for ln in IGNORE_FILE.read_text(encoding="utf-8").splitlines()]
        globs = [ln for ln in lines if ln and not ln.startswith("#")]
        seen, merged = set(), []
        for g in (cfg["exclude_globs"] + globs):
            if g not in seen:
                seen.add(g); merged.append(g)
        cfg["exclude_globs"] = merged
    return cfg

def is_ignored(relpath: str, name: str, cfg: dict, is_dir: bool) -> bool:
    if name.startswith("."):
        return True
    parts = Path(relpath).parts
    if any(p in set(cfg["exclude_dirs"]) for p in parts):
        return True
    path_for_match = relpath + ("/" if is_dir else "")
    for pat in cfg["exclude_globs"]:
        if fnmatch.fnmatch(path_for_match, pat):
            return True
    return False

class OverlayRouter:
    def __init__(self, rules: List[dict]):
        norm_rules = []
        for r in rules or []:
            vprefix = (r.get("virtual_prefix") or "").strip().strip("/")
            sprefix = (r.get("source_prefix") or "").strip().strip("/")
            carry = bool(r.get("carry_suffix", True))
            origin = (r.get("origin_label") or "engine").strip()
            if not vprefix or not sprefix:
                continue
            vparts = [p for p in vprefix.split("/") if p]
            norm_rules.append((vparts, Path(sprefix), carry, origin))
        self.rules: List[Tuple[List[str], Path, bool, str]] = sorted(norm_rules, key=lambda x: len(x[0]), reverse=True)

    def map(self, virtual_rel: str) -> Optional[Tuple[Path, str]]:
        rel = virtual_rel.strip().strip("/")
        parts = [p for p in rel.split("/") if p]
        for vparts, sprefix, carry, origin in self.rules:
            if len(parts) < len(vparts):
                continue
            if [p.lower() for p in parts[:len(vparts)]] == [p.lower() for p in vparts]:
                if carry:
                    suffix = Path(*parts[len(vparts):]) if len(parts) > len(vparts) else Path()
                    return (sprefix / suffix, origin)
                else:
                    return (sprefix, origin)
        return None

    def children_for(self, parent_virtual_rel: str) -> Set[str]:
        parent = parent_virtual_rel.strip().strip("/")
        parent_parts = [p for p in parent.split("/") if p]
        out: Set[str] = set()
        for vparts, _sp, _carry, _origin in self.rules:
            if len(vparts) <= len(parent_parts):
                continue
            if [p.lower() for p in vparts[:len(parent_parts)]] == [p.lower() for p in parent_parts]:
                out.add(vparts[len(parent_parts)])
        return out

def auto_detect_tops(vroot: Path, rx: re.Pattern) -> List[str]:
    tops = []
    if vroot.exists():
        for name in os.listdir(vroot):
            full = vroot / name
            if full.is_dir() and rx.match(name):
                tops.append(name)
    return sorted(tops, key=natural_key)

def file_url_for_repo(rel_virtual: str, cfg: dict) -> str:
    base = (cfg.get("repo_base_url") or "").rstrip("/")
    return f"{base}/{rel_virtual}"

def file_url_for_engine(src_rel: str, cfg: dict) -> str:
    cdn = (cfg.get("engine_cdn_base") or "").rstrip("/")
    p = Path(src_rel)
    try:
        after = p.relative_to("sd_engine").as_posix()
    except Exception:
        after = p.as_posix()
    return f"{cdn}/{after}"

def build_tree(vroot: Path, virtual_rel: str, cfg: dict, router: OverlayRouter) -> Dict:
    mapped = router.map(virtual_rel)
    if mapped:
        phys_rel, origin_for_dir = mapped
        base_dir = ROOT / phys_rel
    else:
        base_dir = (vroot / virtual_rel) if virtual_rel else vroot
        origin_for_dir = "repo"

    try:
        entries = sorted(os.listdir(base_dir), key=natural_key)
    except FileNotFoundError:
        entries = []

    names: Set[str] = set(entries)
    for virt_child in router.children_for(virtual_rel):
        names.add(virt_child)

    node: Dict = {}
    for name in sorted(names, key=natural_key):
        virt_child_rel = f"{virtual_rel}/{name}".strip("/")
        child_map = router.map(virt_child_rel)
        if child_map:
            child_phys_rel, origin = child_map
            physical_path = ROOT / child_phys_rel
        else:
            physical_path = (vroot / virt_child_rel)
            origin = "repo"

        if physical_path.is_dir():
            if is_ignored(virt_child_rel, name, cfg, True):
                continue
            node[name] = build_tree(vroot, virt_child_rel, cfg, router)
        else:
            if is_ignored(virt_child_rel, name, cfg, False):
                continue
            try:
                src_rel = str(physical_path.relative_to(ROOT).as_posix())
            except Exception:
                src_rel = physical_path.as_posix()

            url = file_url_for_engine(src_rel, cfg) if origin == "engine" else file_url_for_repo(virt_child_rel, cfg)

            node[name] = {
                "__type": "file",
                "origin": origin,
                "virt": virt_child_rel,
                "src": src_rel,
                "url": url
            }
    return node

def main() -> None:
    cfg = load_config()
    vroot = ROOT / cfg.get("virtual_root", ".")
    if not vroot.exists():
        raise SystemExit(f"Virtual root '{vroot}' nicht gefunden.")

    router = OverlayRouter(cfg.get("overlay_rules") or [])
    include = cfg.get("include_top") or []
    if include:
        tops = sorted(include, key=natural_key)
    else:
        rx = re.compile(cfg.get("auto_top_regex") or r"^\d+[_ -].*$")
        tops = auto_detect_tops(vroot, rx)

    tree: Dict[str, Dict] = {}
    for top in tops:
        tree[top] = build_tree(vroot, top, cfg, router)

    manifest = { "generated": int(time.time()), "tree": tree }
    API_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False)

    print(f"Wrote {OUT_FILE}")

if __name__ == "__main__":
    main()

