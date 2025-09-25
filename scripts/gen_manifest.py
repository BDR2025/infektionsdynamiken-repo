#!/usr/bin/env python3
import os
import json
import time

# Repo-Root relativ zu diesem Skript bestimmen (robust gegen CWD-Änderungen)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Standard-Top-Level-Ordner (deine neue Struktur)
# Achtung: Schreibweise exakt wie im Repo (hier mit "3_leraning")
DEFAULT_TOP = {'1_architecture', '2_publications', '3_leraning'}

# Optional per Umgebungsvariable überschreiben, z.B.:
# INCLUDED_ROOTS="1_architecture,2_publications,3_leraning"
_env = os.getenv('INCLUDED_ROOTS', '').strip()
if _env:
    INCLUDE_TOP = {p.strip() for p in _env.split(',') if p.strip()}
else:
    INCLUDE_TOP = DEFAULT_TOP


def build_tree(path: str, rel: str = '') -> dict:
    node = {}
    try:
        entries = sorted(os.listdir(path))
    except FileNotFoundError:
        return node

    for name in entries:
        # Versteckte Dateien/Ordner überspringen
        if name.startswith('.'):
            continue

        full = os.path.join(path, name)
        relpath = (rel + '/' + name).lstrip('/')

        if os.path.isdir(full):
            # Auf der obersten Ebene nur die zugelassenen Top-Ordner zulassen
            if rel == '' and name not in INCLUDE_TOP:
                continue
            node[name] = build_tree(full, relpath)
        else:
            # Nur Dateien aufnehmen, wenn sie unter einem erlaubten Top-Ordner liegen
            top = relpath.split('/', 1)[0]
            if top in INCLUDE_TOP:
                node[name] = {'__type': 'file'}
    return node


def main() -> None:
    tree = build_tree(ROOT, '')
    manifest = {'generated': int(time.time()), 'tree': tree}

    out = os.path.join(ROOT, 'api', 'manifest.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        # bewusst ohne Einrückung wie zuvor (Downstream-Kompatibilität)
        json.dump(manifest, f, ensure_ascii=False)

    print('Wrote', out)


if __name__ == '__main__':
    main()
