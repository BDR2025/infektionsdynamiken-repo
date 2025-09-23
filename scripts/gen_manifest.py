#!/usr/bin/env python3
import os, json, time

ROOT = os.path.abspath(os.path.dirname(__file__) + '/..')
INCLUDE_TOP = {'engines','publications','learning'}

def build_tree(path, rel=''):
    node = {}
    try:
        entries = sorted(os.listdir(path))
    except FileNotFoundError:
        return node
    for name in entries:
        if name.startswith('.'):
            continue
        full = os.path.join(path, name)
        relpath = (rel + '/' + name).lstrip('/')
        if os.path.isdir(full):
            if rel == '' and name not in INCLUDE_TOP:
                continue
            node[name] = build_tree(full, relpath)
        else:
            top = relpath.split('/',1)[0]
            if top in INCLUDE_TOP:
                node[name] = {'__type':'file'}
    return node

def main():
    tree = build_tree(ROOT, '')
    manifest = {'generated': int(time.time()), 'tree': tree}
    out = os.path.join(ROOT, 'api', 'manifest.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False)
    print('Wrote', out)

if __name__ == '__main__':
    main()
