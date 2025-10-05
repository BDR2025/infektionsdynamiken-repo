(function(){
  'use strict';

  const MANIFEST_URL = 'api/manifest.json';
  const ALLOWED = (window.ALLOWED_ROOT || '').replace(/\/+$/, '');

  // UI
  const tree       = document.getElementById('tree');
  const body       = document.getElementById('previewBody');
  const title      = document.getElementById('previewTitle');
  const dl         = document.getElementById('downloadBtn');
  const printBtn   = document.getElementById('printBtn');
  document.getElementById('expandAll')?.addEventListener('click', () => tree.querySelectorAll('details').forEach(d=>d.open=true));
  document.getElementById('collapseAll')?.addEventListener('click', () => tree.querySelectorAll('details').forEach(d=>d.open=false));

  // Utils
  const PRE_STYLE  = 'white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%;box-sizing:border-box;margin:0';
  const CODE_STYLE = 'display:block;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.95rem;line-height:1.4;white-space:inherit;overflow-wrap:inherit;word-break:inherit';

  const escapeHtml = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ext        = p => { const m=/\.([a-z0-9]+)(?:$|\?)/i.exec(p||''); return m?m[1].toLowerCase():''; };
  const isImg      = e => ['png','jpg','jpeg','gif','webp','avif','svg'].includes(e);
  const isPdf      = e => e==='pdf';
  const isBin      = e => ['zip','7z','rar','bin','exe','dll','wasm'].includes(e);

  // Manifest-Index: virt -> node {url, origin, ...}
  let MAN = null;
  let TREE_ROOT = {};
  const URL_INDEX = new Map();

  function indexSubtree(obj, prefix){
    Object.keys(obj||{}).forEach(name=>{
      const node = obj[name];
      const full = prefix ? `${prefix}/${name}` : name;
      if(node && node.__type==='file') URL_INDEX.set(full, node);
      else if(node && typeof node==='object') indexSubtree(node, full);
    });
  }
  const urlFor = (virt) => {
    const meta = URL_INDEX.get(virt);
    return (meta && meta.url) ? meta.url : virt; // Repo-Dateien lokal, Engine-Dateien via CDN
  };

  // Pfad-Resolver (für ModuleMap/Kurzpfade)
  function normalize(parts){
    const out=[];
    for(const p of parts){
      if(!p || p=='.') continue;
      if(p==='..') out.pop(); else out.push(p);
    }
    return out;
  }
  function resolveTokenToVirtPath(token, currentVirt){
    // absolute Engine-Kanonik: /uid-e_v1/...  (inkl. /uid/ -> map)
    if(/^\/uid(?:-e_v1)?\//i.test(token)){
      token = token.replace(/^\/uid\//i, '/uid-e_v1/');           // Alias akzeptieren
      // Anker: alles bis zum /uid-e_v1/ der aktuellen Datei
      const idx = currentVirt.toLowerCase().indexOf('/uid-e_v1/');
      if(idx===-1) return null;
      const prefix = currentVirt.slice(0, idx+('/uid-e_v1').length); // z.B. ".../1-2 UID e-minilab-explorer/uid-e_v1"
      const rest   = token.replace(/^\/uid-e_v1\/?/i,'');
      return (prefix + '/' + rest).replace(/^\/+/,'');
    }
    // absolute Repo: /1_architecture/...
    if(/^\/1_architecture\//i.test(token)){
      return token.replace(/^\/+/,'');
    }
    // absolute (andere) – als Repo-virt interpretieren
    if(token.startsWith('/')){
      return token.replace(/^\/+/,'');
    }
    // relativ: bezogen auf Verzeichnis der aktuellen Datei
    const baseParts = currentVirt.split('/'); baseParts.pop();
    const relParts  = token.split('/');
    return normalize([...baseParts, ...relParts]).join('/');
  }

  // Linkify + Kopfzeile „* File:“ + ModuleMap
  function renderAnnotated(text, currentVirt, thisLiveURL){
    const lines = text.split(/\r?\n/);
    // Engine-Anker (Präfix bis /uid-e_v1)
    const engineIdx = currentVirt.toLowerCase().indexOf('/uid-e_v1/');
    const enginePrefix = engineIdx>=0 ? currentVirt.slice(0, engineIdx+('/uid-e_v1').length) : null;

    const tokenRe = /((?:\.\.?\/)?(?:[\w\-().]+\/)*[\w\-().]+\.(?:js|css|mjs|json|md|markdown|txt|html|pdf|png|jpg|jpeg|gif|webp|svg))/g;

    let html = '';
    for(const raw of lines){
      // 1) * File: …  -> anklickbar (öffnet die Live-Datei)
      const mFile = raw.match(/^\s*\*\s*File:\s*(\S+)/i);
      if(mFile){
        const shown = mFile[1].replace(/^\/uid\//i, '/uid-e_v1/'); // Alias zeigen wie Kanon
        const left  = escapeHtml(raw.slice(0, mFile.index)) + escapeHtml(raw.slice(mFile.index, mFile.index + mFile[0].length - mFile[1].length));
        const link  = `<a href="${thisLiveURL}" target="_blank" rel="noopener noreferrer">${escapeHtml(shown)}</a>`;
        html += left + link + '\n';
        continue;
      }

      // 2) sonst: linkify Tokens (relativ/absolut) → Preview-Links
      let esc = escapeHtml(raw);
      esc = esc.replace(tokenRe, (_m)=>{
        const token = _m;            // bereits „esc“ – hier ok, weil RegEx nur ASCII-Symbole nutzt
        const data  = token;         // roher Text (rel/abs)
        return `<a href="#" data-token="${escapeHtml(data)}" title="In der Vorschau öffnen">${escapeHtml(token)}</a>`;
      });

      // 3) http(s):// URLs klickbar (extern)
      esc = esc.replace(/(https?:\/\/[^\s<>'"]+)/g, (m)=>{
        return `<a href="${m}" target="_blank" rel="noopener noreferrer">${escapeHtml(m)}</a>`;
      });

      html += esc + '\n';
    }

    // Delegiertes Klicken: data-token → virtuellen Pfad auflösen → Preview öffnen
    requestAnimationFrame(()=>{
      body.querySelectorAll('a[data-token]').forEach(a=>{
        a.addEventListener('click', (e)=>{
          e.preventDefault();
          const token = a.getAttribute('data-token');
          const virt  = resolveTokenToVirtPath(token, currentVirt);
          if(virt){ setHashPath(virt); openPreview(virt); }
        });
      });
    });

    return html;
  }

  // Tree
  function buildTree(subtree){
    tree.textContent='';
    const root = document.createElement('details');
    root.open = true;
    const sum = document.createElement('summary');
    sum.textContent = ALLOWED || 'repo';
    sum.dataset.path = ALLOWED || '';
    root.appendChild(sum);
    tree.appendChild(root);

    const add = (parent, nodePath, children)=>{
      Object.keys(children).sort().forEach(name=>{
        const node = children[name];
        const full = (nodePath ? nodePath + '/' : '') + name;

        if(node && node.__type==='file'){
          const div = document.createElement('div'); div.className='file';
          const a = document.createElement('a'); a.textContent=name; a.href=full;
          a.addEventListener('click', e=>{ e.preventDefault(); setHashPath(full); openPreview(full); });
          div.appendChild(a); parent.appendChild(div);
        }else{
          const det = document.createElement('details'); const sm=document.createElement('summary');
          sm.textContent = name; sm.dataset.path=full;
          det.appendChild(sm); parent.appendChild(det);
          add(det, full, node);
        }
      });
    };
    add(root, ALLOWED, subtree);
  }

  // Preview
  function markActive(path){
    document.querySelectorAll('.tree a').forEach(a=>a.classList.toggle('file-active', a.getAttribute('href')===path));
    // Ordner aufklappen
    let p = path.split('/'); p.pop();
    const folder = p.join('/');
    Array.from(document.querySelectorAll('.tree summary')).forEach(s=>{
      if(s.dataset.path && folder.startsWith(s.dataset.path)) s.parentElement.open = true;
    });
  }

  async function openPreview(pathVirt){
    title.textContent = 'Lädt…'; body.textContent = 'Bitte warten…';
    const e = ext(pathVirt);
    const liveURL = urlFor(pathVirt);  // Kern: Engine → CDN, Repo → lokal
    dl.setAttribute('href', liveURL);

    try{
      if(isImg(e)){
        title.textContent = pathVirt;
        body.innerHTML = `<img alt="Vorschau" style="max-width:100%;height:auto" src="${liveURL}">`;
        markActive(pathVirt); return;
      }
      if(isPdf(e)){
        title.textContent = pathVirt;
        body.innerHTML = `<object data="${liveURL}" type="application/pdf" width="100%" height="600">PDF nicht einbettbar. <a href="${liveURL}" target="_blank" rel="noopener">Öffnen</a>.</object>`;
        markActive(pathVirt); return;
      }
      if(isBin(e)){
        title.textContent = pathVirt;
        body.innerHTML = `<p>Nicht darstellbarer Dateityp. Bitte über „Download“ laden.</p>`;
        markActive(pathVirt); return;
      }

      const resp = await fetch(liveURL, {cache:'no-cache'});
      if(!resp.ok){ title.textContent='Fehler'; body.textContent='Datei nicht gefunden oder nicht lesbar.'; return; }
      const text = await resp.text();
      title.textContent = pathVirt;
      const html = renderAnnotated(text, pathVirt, liveURL);
      body.innerHTML = `<pre class="readme" style="${PRE_STYLE}"><code style="${CODE_STYLE}">${html}</code></pre>`;
      markActive(pathVirt);
    }catch(err){
      title.textContent='Fehler';
      body.textContent='Beim Laden ist ein Fehler aufgetreten.';
      console.error(err);
    }
  }

  // Hash-Deep-Link
  const getHashPath = () => { const m=(location.hash||'').match(/[#&]preview=([^&]+)/); return m?decodeURIComponent(m[1]):null; };
  const setHashPath = (p) => {
    const enc = encodeURIComponent(p);
    if(location.hash.includes('preview=')) location.hash = location.hash.replace(/preview=[^&]*/, 'preview='+enc);
    else location.hash = (location.hash ? location.hash + '&' : '#') + 'preview='+enc;
  };

  // Delegation (nur für linkify aus „renderAnnotated“, siehe oben)
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a[data-preview]');
    if(!a) return;
    e.preventDefault();
    const token = a.getAttribute('data-preview');
    const virt  = resolveTokenToVirtPath(token, getHashPath() || '');
    if(virt){ setHashPath(virt); openPreview(virt); }
  });

  printBtn?.addEventListener('click', ()=>window.print());

  // Boot
  async function boot(){
    try{
      const r = await fetch(MANIFEST_URL+`?v=${Date.now()}`, {cache:'no-cache'});
      if(!r.ok) throw new Error('manifest.json nicht gefunden');
      MAN = await r.json();
      TREE_ROOT = (MAN.tree && MAN.tree[ALLOWED]) ? MAN.tree[ALLOWED] : {};
      indexSubtree(TREE_ROOT, ALLOWED);
      buildTree(TREE_ROOT);
      const p = getHashPath();
      if(p) openPreview(p);
    }catch(e){
      tree.textContent = 'Manifest konnte nicht geladen werden.';
      console.error(e);
    }
  }
  window.addEventListener('DOMContentLoaded', boot);
})();


