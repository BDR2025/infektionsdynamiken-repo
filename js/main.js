(function(){
  const MANIFEST_URL = 'api/manifest.json';
  const tree = document.getElementById('tree');
  const body = document.getElementById('previewBody');
  const title = document.getElementById('previewTitle');
  const dl = document.getElementById('downloadBtn');
  const printBtn = document.getElementById('printBtn');

  const expandBtn = document.getElementById('expandAll');
  const collapseBtn = document.getElementById('collapseAll');

  function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function ext(path){ const m=/\.([a-z0-9]+)(?:$|\?)/i.exec(path); return m?m[1].toLowerCase():''; }
  function isImage(e){ return ['png','jpg','jpeg','gif','webp','avif','svg'].includes(e); }
  function isPdf(e){ return e==='pdf'; }
  function isBinaryLikely(e){ return ['zip','7z','rar','bin','exe','dll','wasm'].includes(e); }

  expandBtn?.addEventListener('click', () => tree.querySelectorAll('details').forEach(d=>d.open=true));
  collapseBtn?.addEventListener('click', () => tree.querySelectorAll('details').forEach(d=>d.open=false));

  function buildTree(struct){
    tree.textContent = '';
    const root = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = 'repo';
    root.open = true;
    root.appendChild(sum);
    tree.appendChild(root);

    function addNodes(parent, nodePath, children){
      Object.keys(children).sort().forEach(name => {
        const node = children[name];
        const full = (nodePath ? nodePath + '/' : '') + name;
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
          det.appendChild(sm);
          parent.appendChild(det);
          addNodes(det, full, node);
        }
      });
    }
    addNodes(root, '', struct);
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
        markActiveLink(path);
        return;
      }
      if(isPdf(e)){
        title.textContent = path;
        body.innerHTML = '<object data="'+path+'" type="application/pdf" width="100%" height="600">PDF kann nicht eingebettet werden. <a href="'+path+'" target="_blank" rel="noopener">Im neuen Tab öffnen</a>.</object>';
        markActiveLink(path);
        return;
      }
      if(isBinaryLikely(e)){
        title.textContent = path;
        body.innerHTML = '<p>Nicht darstellbarer Dateityp. Bitte über den Download-Button laden.</p>';
        markActiveLink(path);
        return;
      }
      const resp = await fetch(path, {cache:'no-cache'});
      if(!resp.ok){ title.textContent='Fehler'; body.textContent='Datei nicht gefunden oder nicht lesbar.'; return; }
      const text = await resp.text();
      title.textContent = path;
      body.innerHTML = '<pre><code>'+escapeHtml(text)+'</code></pre>';
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
  function markActiveLink(path){
    document.querySelectorAll('.tree a').forEach(a => a.classList.remove('file-active'));
    const link = Array.from(document.querySelectorAll('.tree a')).find(a => a.getAttribute('href') === path);
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

  async function boot(){
    try{
      const resp = await fetch(MANIFEST_URL, {cache:'no-cache'});
      if(!resp.ok) throw new Error('Manifest nicht gefunden');
      const man = await resp.json();
      buildTree(man.tree || {});
      const p = getHashPath();
      if(p) openPreview(p);
    }catch(e){
      tree.textContent = 'Manifest konnte nicht geladen werden. Bitte GitHub Action aktivieren oder manifest.json bereitstellen.';
      console.error(e);
    }
  }

  document.getElementById('printBtn')?.addEventListener('click', ()=> window.print());
  window.addEventListener('hashchange', ()=>{ const p=getHashPath(); if(p) openPreview(p); });
  window.addEventListener('DOMContentLoaded', boot);
})();