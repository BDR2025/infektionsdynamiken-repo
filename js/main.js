// Hash-based preview loader for the repository
(function(){
  const tree = document.getElementById('tree');
  const body = document.getElementById('previewBody');
  const title = document.getElementById('previewTitle');
  const dl = document.getElementById('downloadBtn');
  const printBtn = document.getElementById('printBtn');

  // Expand/Collapse
  const expandBtn = document.getElementById('expandAll');
  const collapseBtn = document.getElementById('collapseAll');
  const allDetails = () => Array.from(document.querySelectorAll('.tree details'));
  expandBtn?.addEventListener('click', () => allDetails().forEach(d => d.open = true));
  collapseBtn?.addEventListener('click', () => allDetails().forEach(d => d.open = false));

  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function ext(path){
    const m = /\.([a-z0-9]+)(?:$|\?)/i.exec(path);
    return m ? m[1].toLowerCase() : '';
  }
  function isTextLike(e){
    return ['txt','md','csv','json','yml','yaml','log','ini','cfg','conf','js','ts','css','html','svg'].includes(e);
  }
  function isImage(e){
    return ['png','jpg','jpeg','gif','webp','avif','svg'].includes(e);
  }
  function isPdf(e){ return e === 'pdf'; }
  function isBinaryLikely(e){
    return ['zip','7z','rar','bin','exe','dll','wasm','pdf'].includes(e) ? (e!=='pdf') : false;
  }
  function openParents(el){
    let p = el.parentElement;
    while(p){
      if(p.tagName === 'DETAILS'){ p.open = true; }
      p = p.parentElement;
    }
  }
  function markActiveLink(path){
    document.querySelectorAll('.tree a').forEach(a => a.classList.remove('file-active'));
    const link = Array.from(document.querySelectorAll('.tree a')).find(a => a.getAttribute('href') === path);
    if(link){ link.classList.add('file-active'); openParents(link); link.scrollIntoView({block:'nearest'}); }
  }
  async function openPreview(path){
    title.textContent = 'Lädt…';
    body.textContent = 'Bitte warten…';
    dl.setAttribute('href', path);

    // If directory path given, try README.* inside it
    if(path.endsWith('/')){
      const candidates = ['README.md','README.txt'];
      for(const c of candidates){
        try{
          const test = await fetch(path + c, {method:'HEAD'});
          if(test.ok){ path = path + c; break; }
        }catch(e){}
      }
    }

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
      // text-like: fetch as text
      const resp = await fetch(path, {cache:'no-cache'});
      if(!resp.ok){
        title.textContent = 'Fehler';
        body.textContent = 'Datei nicht gefunden oder nicht lesbar.';
        return;
      }
      const text = await resp.text();
      title.textContent = path;
      if(e === 'json'){
        try{
          const obj = JSON.parse(text);
          body.innerHTML = '<pre><code>'+escapeHtml(JSON.stringify(obj, null, 2))+'</code></pre>';
        }catch{
          body.innerHTML = '<pre><code>'+escapeHtml(text)+'</code></pre>';
        }
      }else if(e === 'md'){
        // Minimal: keine Markdown-Engine → als Text anzeigen
        body.innerHTML = '<pre><code>'+escapeHtml(text)+'</code></pre>';
      }else{
        body.innerHTML = '<pre><code>'+escapeHtml(text)+'</code></pre>';
      }
      markActiveLink(path);
    }catch(err){
      title.textContent = 'Fehler';
      body.textContent = 'Beim Laden ist ein Fehler aufgetreten.';
      console.error(err);
    }
  }

  function getHashPath(){
    const h = location.hash || '';
    const m = h.match(/[#&]preview=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setHashPath(p){
    const enc = encodeURIComponent(p);
    if(location.hash.includes('preview=')){
      location.hash = location.hash.replace(/preview=[^&]*/, 'preview='+enc);
    }else{
      location.hash = (location.hash ? location.hash + '&' : '#') + 'preview='+enc;
    }
  }

  // Intercept tree clicks
  if(tree){
    tree.addEventListener('click', (e)=>{
      const a = e.target.closest('a');
      if(!a) return;
      const href = a.getAttribute('href');
      if(!href) return;
      // we treat links that end with '/' or with a file extension as preview targets
      e.preventDefault();
      setHashPath(href);
      openPreview(href);
    });
  }

  // Print
  printBtn?.addEventListener('click', ()=> window.print());

  // On load: open from hash if any
  window.addEventListener('DOMContentLoaded', ()=>{
    const p = getHashPath();
    if(p){
      openPreview(p);
    }
  });
  window.addEventListener('hashchange', ()=>{
    const p = getHashPath();
    if(p){
      openPreview(p);
    }
  });
})();