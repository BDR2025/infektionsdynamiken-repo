#!/usr/bin/env python3
import os, json, sys, time

# Generate a nested tree of directories/files for static hosting
# Excludes dotfiles and the api/manifest.json itself
ROOT = os.path.abspath(os.path.dirname(__file__) + '/..')

EXCLUDE_DIRS = {'.git', '.github', 'api', 'css', 'js', 'assets'}
# include engines, publications, learning by default
INCLUDE_TOP = {'engines','publications','learning'}

def should_skip_dir(path, name):
    if name.startswith('.'): return True
    if os.path.relpath(path, ROOT) == '.':
        # top-level: only include chosen directories
        return name not in INCLUDE_TOP
    return False

def build_tree(base):
    tree = {}
    for name in sorted(os.listdir(base)):
        if name.startswith('.'): continue
        full = os.path.join(base, name)
        if os.path.isdir(full):
            rel_parent = os.path.relpath(base, ROOT)
            if should_skip_dir(base, name): continue
            tree[name] = build_tree(full)
        else:
            # skip our own manifest if any
            rel = os.path.relpath(full, ROOT).replace('\\','/')
            if rel == 'api/manifest.json': continue
            tree[name] = {'__type':'file'}
    return tree

def main():
    tree = build_tree(ROOT)
    manifest = {'generated': int(time.time()), 'tree': tree}
    out = os.path.join(ROOT, 'api', 'manifest.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False)
    print('Wrote', out)

if __name__ == '__main__':
    main()
