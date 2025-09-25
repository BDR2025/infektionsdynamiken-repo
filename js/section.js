(function(){
  const MANIFEST_URL = 'api/manifest.json';
  const tree  = document.getElementById('tree');
  const body  = document.getElementById('previewBody');
  const title = document.getElementById('previewTitle');
  const dl    = document.getElementById('downloadBtn');
  const printBtn = document.getElementById('printBtn');
  const ALLOWED = (window.ALLOWED_ROOT || '').replace(/\/+$/,'');

  const expandBtn = document.getElementById('expandAll');
  const collapseBtn = document.getElementById('collapseAll');
  expandBtn?.addEventListener('click', () => tree.querySelectorAll('details').forEach(d=>d.open=true));
  collapseBtn?.addEventListener('click', () => tree.querySelectorAll('details').forEach(d=>d.open=false));

  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function ext(path){ const m=/\.([a-z0-9]+)(?:$|\?)/i.exec(path); return m?m[1].toLowerCase():''; }
  function isImage(e){ return ['png','jpg','jpeg','gif','webp','avif','svg'].includes(e); }
  function isPdf(e){ return e==='pdf'; }
  function isBinaryLikely(e){ return ['zip','7z','rar','bin','exe','dll','wasm'].includes(e); }

  // Text-Preview: harte Umbrüche (inline, damit es sicher greift)
  const PRE_STYLE = [
    'white-space: pre-wrap',
    'overflow-wrap: anywhere',
    'word-break: break-word',
    'max-width: 100%',
    'box-sizing: border-box',
    'margin: 0'
  ].join(';');
  const CODE_STYLE = [
    'display: block',
    'font-family: ui-monospace, Menlo, Consolas, monospace',
    'font-size: 0.95rem',
    'line-height: 1.4',
    'white-space: inherit',
    'overflow-wrap: inherit',
    'word-break: inherit'
  ].join(';');

  // ---------------- README-Handhabung ----------------
  const README_REGEX = /^readme\.(?:md|markdown|txt|rtf|html)$/i;
  const README_CANDIDATES = ['README.md','README.markdown','README.txt','README.rtf','README.html'];

  // globaler Manifest-Zugriff
  let MAN = null;
  let TREE_ROOT = {};

  function getSubtreeByPath(rootObj, relPath){
    if(!relPath) return rootObj;
    const parts = relPath.split('/').filter(Boolean);
    let node = rootObj;
    for(const p of parts){
      if(!node || typeof node !== 'object') return null;
      node = node[p];
    }
    return node;
  }

  function findReadmePathForChildren(nodePath, childrenObj){
    if(!childrenObj || typeof childrenObj !== 'object') return null;

    // 1) Bevorzugte Kandidaten (deterministisch)
    for(const cand of README_CANDIDATES){
      if(childrenObj[cand] && childrenObj[cand].__type === 'file'){
        return (nodePath ? nodePath + '/' : '') + cand;
      }
    }
    // 2) Fallback: irgendein README.*
    for(const name of Object.keys(childrenObj)){
      if(README_REGEX.test(name) && childrenObj[name]?.__type === 'file'){
        return (nodePath ? nodePath + '/' : '') + name;
      }
    }
    return null;
  }

  // ---------------- Aktive Zustände (Datei/Ordner) ----------------
  function clearActiveStates(){
    document.querySelectorAll('.tree a').forEach(a => a.classList.remove('file-active'));
    document.querySelectorAll('.tree summary').forEach(s => s.classList.remove('folder-active'));
  }

  function markActiveFolder(path){
    clearActiveStates();
    const sum = Array.from(document.querySelectorAll('.tree summary'))
      .find(s => s.dataset.path === path);
    if(sum){
      sum.classList.add('folder-active');
      const det = sum.parentElement;
      if(det && det.tagName === 'DETAILS') det.open = true;
      sum.scrollIntoView({block:'nearest'});
    }
  }

  function markActiveLink(path){
    clearActiveStates();
    const link = Array.from(document.querySelectorAll('.tree a'))
      .find(a => a.getAttribute('href') === path);
    if(link){
      link.classList.add('file-active');
      let p = link.parentElement;
      while(p){
        if(p.tagName === 'DETAILS'){ p.open = true; }
        p = p.parentElement;
      }
      link.scrollIntoView({block:'nearest'});
    }
  }

  function tryAutoLoadReadmeForPath(dirPathRel){
    // dirPathRel ist relativ zum Repo-Root, z.B. "1_architecture" oder "1_architecture/1-1 UID-I (...)"
    const base = ALLOWED ? ALLOWED : '';
    const relUnderAllowed = dirPathRel.startsWith(base) ? dirPathRel.slice(base.length).replace(/^\/+/,'') : dirPathRel;
    const subtree = getSubtreeByPath(TREE_ROOT, relUnderAllowed);
    if(!subtree) return false;

    const readmeFullPath = findReadmePathForChildren(dirPathRel, subtree);
    if(readmeFullPath){
      openPreview(readmeFullPath);
      markActiveFolder(dirPathRel); // Ordner sichtbar markieren
      return true;
    }
    // selbst wenn kein README existiert: Ordner markieren
    markActiveFolder(dirPathRel);
    return false;
  }

  // ---------------- Tree-Rendering ----------------
  function buildTree(subtree){
    tree.textContent = '';
    const root = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = ALLOWED || 'repo';
    sum.dataset.path = ALLOWED || '';
    root.open = true;
    root.appendChild(sum);
    tree.appendChild(root);

    function addNodes(parent, nodePath, children){
      Object.keys(children).sort().forEach(name => {
        const node = children[name];
        const full = (nodePath ? nodePath + '/' : '') + name;

        // README.* NICHT im Tree anzeigen (wir laden es automatisch in der Preview)
        if (node && node.__type === 'file' && README_REGEX.test(name)) {
          return;
        }

        if(node && node.__type === 'file'){
          const div = document.createElement('div');
          div.className = 'file';
          const a = document.createElement('a');
          a.textContent = name;
          a.href = full;
          a.addEventListener('click', e => { e.preventDefault(); setHashPath(full); openPreview(full); });
          div.appendChild(a);
          parent.appendChild(div);
        }else{
          const det = document.createElement('details');
          const sm = document.createElement('summary');
          sm.textContent = name;
          sm.dataset.path = full; // Ordnerpfad merken
          sm.addEventListener('click', () => {
            // Nach dem Aufklappen automatisch README des Ordners in der Preview anzeigen (falls vorhanden)
            tryAutoLoadReadmeForPath(full);
          });
          det.appendChild(sm);
          parent.appendChild(det);
          addNodes(det, full, node);
        }
      });
    }
    addNodes(root, ALLOWED, subtree);
  }

  async function openPreview(path){
    title.textContent = 'Lädt…';
    body.textContent = 'Bitte warten…';
    dl.setAttribute('href', path);
    const e = ext(path);
    try{
      if(isImage(e)){
        title.textContent = path;
        body.innerHTML = '<img alt="Vorschau" style="max-width:100%;height:auto" src="'+path+'">';
        markActiveLink(path); return;
      }
      if(isPdf(e)){
        title.textContent = path;
        body.innerHTML = '<object data="'+path+'" type="application/pdf" width="100%" height="600">PDF kann nicht eingebettet werden. <a href="'+path+'" target="_blank" rel="noopener">Im neuen Tab öffnen</a>.</object>';
        markActiveLink(path); return;
      }
      if(isBinaryLikely(e)){
        title.textContent = path;
        body.innerHTML = '<p>Nicht darstellbarer Dateityp. Bitte über den Download-Button laden.</p>';
        markActiveLink(path); return;
      }
      const resp = await fetch(path, {cache:'no-cache'});
      if(!resp.ok){ title.textContent='Fehler'; body.textContent='Datei nicht gefunden oder nicht lesbar.'; return; }
      const text = await resp.text();
      title.textContent = path;
      body.innerHTML = '<pre class="readme" style="'+PRE_STYLE+'"><code style="'+CODE_STYLE+'">'+escapeHtml(text)+'</code></pre>';
      markActiveLink(path);
    }catch(err){
      title.textContent = 'Fehler';
      body.textContent = 'Beim Laden ist ein Fehler aufgetreten.';
      console.error(err);
    }
  }

  function getHashPath(){ const h=location.hash||''; const m=h.match(/[#&]preview=([^&]+)/); return m?decodeURIComponent(m[1]):null; }
  function setHashPath(p){
    const enc = encodeURIComponent(p);
    if(location.hash.includes('preview=')){
      location.hash = location.hash.replace(/preview=[^&]*/, 'preview='+enc);
    }else{
      location.hash = (location.hash ? location.hash + '&' : '#') + 'preview='+enc;
    }
  }

  async function boot(){
    try{
      const resp = await fetch(MANIFEST_URL + `?v=${Date.now()}`, {cache:'no-cache'});
      if(!resp.ok) throw new Error('Manifest nicht gefunden');
      MAN = await resp.json();

      // Wurzel (nur der erlaubte Teilbaum)
      TREE_ROOT = (MAN.tree && MAN.tree[ALLOWED]) ? MAN.tree[ALLOWED] : {};
      buildTree(TREE_ROOT);

      const p = getHashPath();
      if(p){
        openPreview(p);
      }else{
        // Kein Deep-Link: README des Root-Ordners automatisch anzeigen (falls vorhanden)
        tryAutoLoadReadmeForPath(ALLOWED);
      }
    }catch(e){
      tree.textContent = 'Manifest konnte nicht geladen werden. Bitte GitHub Action aktivieren oder manifest.json bereitstellen.';
      console.error(e);
    }
  }

  printBtn?.addEventListener('click', ()=> window.print());
  window.addEventListener('hashchange', ()=>{ const p=getHashPath(); if(p) openPreview(p); });
  window.addEventListener('DOMContentLoaded', boot);
})();
