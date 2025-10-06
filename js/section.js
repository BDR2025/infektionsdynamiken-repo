(function(){
  'use strict';

  // ------------------------------
  // DOM references
  // ------------------------------
  const MANIFEST_URL = 'api/manifest.json';
  const tree       = document.getElementById('tree');
  const body       = document.getElementById('previewBody');
  const title      = document.getElementById('previewTitle');
  const dl         = document.getElementById('downloadBtn');
  const printBtn   = document.getElementById('printBtn');
  const ALLOWED    = (window.ALLOWED_ROOT || '').replace(/\/+$/,'');

  const expandBtn   = document.getElementById('expandAll');
  const collapseBtn = document.getElementById('collapseAll');

  // During mass toggle (expand/collapse all) we don't want to auto-open previews
  let BULK_TOGGLE = false;

  // ------------------------------
  // Utils
  // ------------------------------
  function escapeHtml(s){
    return s.replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function ext(path){
    const m = /\.([a-z0-9]+)(?:$|\?)/i.exec(path);
    return m ? m[1].toLowerCase() : '';
  }
  function basename(path){
    const m = /([^\/?#]+)(?:[?#].*)?$/.exec(path);
    return m ? m[1] : path;
  }
  function dirname(path){
    const i = path.lastIndexOf('/');
    return i >= 0 ? path.slice(0, i) : '';
  }
  function joinPath(a, b){
    if (!a) return b.replace(/^\/+/,''); // root join
    if (!b) return a;
    if (b.startsWith('/')) return b.replace(/^\/+/,'');

    const parts = (a + '/' + b).split('/');

    const stack = [];

    for (const p of parts){

      if (p === '' || p === '.') continue;

      if (p === '..'){ stack.pop(); continue; }

      stack.push(p);

    }

    return stack.join('/');

  }

  function setHashPath(p){

    const h = '#preview=' + encodeURIComponent(p);

    if (location.hash !== h) location.hash = h; // triggers hashchange

  }

  function getHashPath(){

    const m = /[#&]preview=([^&]+)/.exec(location.hash);

    return m ? decodeURIComponent(m[1]) : '';

  }



  // ------------------------------

  // Linkify (safe): URLs & repo-relative file paths

  // ------------------------------

  const OPEN_EXTERNAL_IN_NEW_TAB = false;

  const LINK_ATTRS = OPEN_EXTERNAL_IN_NEW_TAB ? ' target="_blank" rel="noopener noreferrer"' : '';



  // file types that we treat as internal preview candidates

  const LINKIFY_FILE_EXT = ['txt','md','markdown','rtf','html','json','js','css','pdf','png','jpg','jpeg','gif','webp','svg'];



  function linkifySafe(raw, baseDir){

    // We first escape the raw, then inject anchors.

    let out = escapeHtml(raw);



    // 1) http(s):// URLs

    out = out.replace(/(https?:\/\/[^\s<>"']+)/g, (m) => {

      const url = m; // already escaped context

      return `<a href="${url}"${LINK_ATTRS}>${url}</a>`;

    });



    // 2) naked domain we know -> https://…

    out = out.replace(/(?:^|\s)(repository\.infektionsdynamiken\.de\/[^\s<>"']+)/g, (m, p1) => {

      const url = 'https://' + p1;

      return m.replace(p1, `<a href="${url}"${LINK_ATTRS}>${p1}</a>`);

    });



    // 3) repo-relative file paths → internal preview links

    out = out.replace(/(^|[\s])((?:\.{0,2}\/)?(?:[\w\-\/]+)\.(?:txt|md|markdown|rtf|html|json|js|css|pdf|png|jpg|jpeg|gif|webp|svg))/gi,

      (all, lead, rel) => {

        const target = resolvePreviewTarget(rel, baseDir);

        return `${lead}<a href="#preview=${encodeURIComponent(target)}" data-preview="${escapeHtml(target)}">${escapeHtml(rel)}</a>`;

      });



    return out;

  }



  function resolvePreviewTarget(href, baseDir){

    // absolute to allowed root

    if (href.startsWith('/')) return href.replace(/^\/+/,'');

    // relative to current file's directory

    return joinPath(baseDir || '', href);

  }



  // ------------------------------

  // Render helpers for text preview

  // ------------------------------

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



  // ------------------------------

  // README handling

  // ------------------------------

  const README_REGEX = /^(?:readme|liesmich|lesemich)(?:[._-][\w-]+)?\.(?:md|markdown|txt|rtf|html)$/i;

  const README_CANDIDATES = [

    'README.md','README.markdown','README.txt','README.rtf','README.html',

    'README_de.md','LIESMICH.md','LESE_MICH.md'

  ];

  const isReadmeName = (name) => README_REGEX.test(name);



  // ------------------------------

  // Manifest access

  // ------------------------------

  let TREE_ROOT = {};       // manifest.tree

  let MANIFEST = null;      // whole manifest (optional)



  function getSubtreeByPath(rootObj, relPath){

    if (!relPath) return rootObj;

    const parts = relPath.split('/').filter(Boolean);

    let node = rootObj;

    for (const p of parts){

      if (!node || typeof node !== 'object') return null;

      node = node[p];

    }

    return node;

  }



  function getNodeByPath(pathRel){

    const dir = dirname(pathRel);

    const name = basename(pathRel);

    const subtree = getSubtreeByPath(TREE_ROOT, dir);

    if (!subtree || typeof subtree !== 'object') return null;

    const node = subtree[name];

    return node && typeof node === 'object' ? node : null;

  }



  function findReadmePathForChildren(nodePath, childrenObj){

    if (!childrenObj || typeof childrenObj !== 'object') return null;

    // 1) preferred list (deterministic selection)

    for (const cand of README_CANDIDATES){

      if (childrenObj[cand] && childrenObj[cand].__type === 'file'){

        return (nodePath ? nodePath + '/' : '') + cand;

      }

    }

    // 2) fallback by regex

    for (const name of Object.keys(childrenObj)){

      if (isReadmeName(name) && childrenObj[name]?.__type === 'file'){

        return (nodePath ? nodePath + '/' : '') + name;

      }

    }

    return null;

  }



  // ------------------------------

  // Tree building

  // ------------------------------

  function buildTree(rootEl, subtree, basePath){

    // clean

    rootEl.textContent = '';



    function addNodes(parent, currentPath, obj){

      const names = Object.keys(obj || {});

      // sort: directories first, then files, alphabetically

      names.sort((a,b)=>{

        const A = obj[a]?.__type === 'file' ? 1 : 0;

        const B = obj[b]?.__type === 'file' ? 1 : 0;

        if (A !== B) return A - B;

        return a.localeCompare(b, 'de', {numeric:true, sensitivity:'base'});

      });



      for (const name of names){

        const node = obj[name];

        const full = currentPath ? (currentPath + '/' + name) : name;



        // skip README files in the tree

        if (node && node.__type === 'file' && isReadmeName(name)){

          continue;

        }



        if (node && node.__type === 'file'){

          const div = document.createElement('div');

          div.className = 'file';

          const a = document.createElement('a');

          a.textContent = name;

          a.href = '#preview=' + encodeURIComponent(full);

          a.dataset.path = full;

          a.addEventListener('click', (e) => {

            e.preventDefault();

            setHashPath(full);

            openPreview(full);

          });

          div.appendChild(a);

          parent.appendChild(div);

        } else {

          // directory

          const det = document.createElement('details');

          const sm  = document.createElement('summary');

          sm.textContent = name;

          sm.dataset.path = full; // folder path



          // On click, let browser toggle first, then if opened → try auto README

          sm.addEventListener('click', () => {

            setTimeout(() => {

              if (det.open) tryAutoLoadReadmeForPath(full);

            }, 0);

          });



          // Also react to keyboard/other toggle sources

          det.addEventListener('toggle', () => {

            if (BULK_TOGGLE) return;

            if (det.open) tryAutoLoadReadmeForPath(full);

          });



          det.appendChild(sm);

          parent.appendChild(det);

          addNodes(det, full, node);

        }

      }

    }



    addNodes(rootEl, basePath, subtree);

  }



  // ------------------------------

  // Active markers

  // ------------------------------

  function clearActive(){

    tree.querySelectorAll('.file-active').forEach(el => el.classList.remove('file-active'));

    tree.querySelectorAll('.folder-active').forEach(el => el.classList.remove('folder-active'));

  }

  function markActiveFile(pathRel){

    clearActive();

    const a = tree.querySelector(`a[data-path="${cssEscape(pathRel)}"]`);

    if (a) a.classList.add('file-active');

    // ensure all ancestor folders open

    openAncestors(pathRel);

  }

  function markActiveFolder(pathRel){

    clearActive();

    const sm = tree.querySelector(`summary[data-path="${cssEscape(pathRel)}"]`);

    if (sm) sm.classList.add('folder-active');

    openAncestors(pathRel);

  }

  function openAncestors(pathRel){

    const parts = pathRel.split('/').filter(Boolean);

    let p = '';

    for (const part of parts){

      p = p ? p + '/' + part : part;

      const sm = tree.querySelector(`summary[data-path="${cssEscape(p)}"]`);

      if (sm){

        const det = sm.parentElement;

        if (det && det.tagName === 'DETAILS') det.open = true;

      }

    }

    // scroll into view a bit later so layout has updated

    setTimeout(()=>{

      const target = tree.querySelector(`a[data-path="${cssEscape(pathRel)}"], summary[data-path="${cssEscape(pathRel)}"]`);

      target?.scrollIntoView({block:'nearest'});

    },0);

  }

  function cssEscape(s){

    // Minimal CSS attribute value escaper for quotes/backslashes

    return String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"');

  }



  // ------------------------------

  // Preview

  // ------------------------------

  let CURRENT_FILE = '';

  let CURRENT_DIR  = '';



  function renderFolderFallback(dirPathRel, childrenObj){

    title.textContent = dirPathRel || 'Ordner';

    const names = Object.keys(childrenObj || {}).filter(n => !(childrenObj[n]?.__type === 'file' && isReadmeName(n)));

    const list = names.length

      ? '<ul style="margin:.25rem 0 .5rem 1rem;">' + names.map(n => `<li>${escapeHtml(n)}</li>`).join('') + '</ul>'

      : '<p>(leer)</p>';

    body.innerHTML =

      '<div class="muted" style="line-height:1.4">' +

        '<p>Kein README in diesem Ordner.</p>' +

        '<p>Inhalt:</p>' + list +

      '</div>';

    dl.setAttribute('href', '#'); // no download for folder

  }



  function tryAutoLoadReadmeForPath(dirPathRel){

    const subtree = getSubtreeByPath(TREE_ROOT, dirPathRel);

    if (!subtree || typeof subtree !== 'object') return false;



    const readmeFullPath = findReadmePathForChildren(dirPathRel, subtree);

    if (readmeFullPath){

      markActiveFolder(dirPathRel);

      setHashPath(readmeFullPath);

      openPreview(readmeFullPath);

      return true;

    }

    // Fallback: show folder info

    markActiveFolder(dirPathRel);

    renderFolderFallback(dirPathRel, subtree);

    return false;

  }



  async function openPreview(pathRel){

    CURRENT_FILE = pathRel;

    CURRENT_DIR  = dirname(pathRel);



    const node = getNodeByPath(pathRel);

    const fileUrl = (node && node.url) ? node.url : pathRel;

    title.textContent = pathRel;

    dl.setAttribute('href', fileUrl);

    dl.setAttribute('download', basename(pathRel));



    const e = ext(pathRel);



    // Images

    if (['png','jpg','jpeg','gif','webp','svg'].includes(e)){

      body.innerHTML = `<img src="${escapeHtml(fileUrl)}" alt="${escapeHtml(pathRel)}" style="max-width:100%;height:auto;display:block;" />`;

      markActiveFile(pathRel);

      return;

    }



    // PDF

    if (e === 'pdf'){

      body.innerHTML = `<object data="${escapeHtml(fileUrl)}" type="application/pdf" style="width:100%;min-height:70vh;">

        <p>PDF kann nicht eingebettet werden. <a href="${escapeHtml(fileUrl)}" target="_blank" rel="noopener">Hier öffnen</a>.</p>

      </object>`;

      markActiveFile(pathRel);

      return;

    }



    // Likely binary not previewable

    if (['zip','7z','rar','bin','exe','dll','wasm'].includes(e)){

      body.innerHTML = `<div class="muted">Datei <code>${escapeHtml(basename(pathRel))}</code> kann nicht als Text angezeigt werden. Bitte über „Download“ öffnen.</div>`;

      markActiveFile(pathRel);

      return;

    }



    // Text-like

    try {

      const res = await fetch(fileUrl, {cache:'no-cache'});

      if (!res.ok) throw new Error('HTTP ' + res.status);

      const txt = await res.text();

      const linked = linkifySafe(txt, CURRENT_DIR);

      body.innerHTML = `<pre style="${PRE_STYLE}"><code style="${CODE_STYLE}">${linked}</code></pre>`;

      markActiveFile(pathRel);

    } catch (err){

      body.innerHTML = `<div class="muted">Konnte Datei nicht laden (${escapeHtml(String(err))}).</div>`;

      markActiveFile(pathRel);

    }

  }



  // ------------------------------

  // Boot

  // ------------------------------

  async function boot(){

    try {

      const res = await fetch(MANIFEST_URL, {cache:'no-cache'});

      if (!res.ok) throw new Error('Manifest HTTP ' + res.status);

      const manifest = await res.json();

      MANIFEST = manifest;

      TREE_ROOT = manifest.tree || {};



      const subtree = getSubtreeByPath(TREE_ROOT, ALLOWED);

      if (!subtree){

        tree.textContent = 'ALLOWED_ROOT nicht im Manifest gefunden.';

        return;

      }



      // Build tree rooted at allowed path

      buildTree(tree, subtree, ALLOWED);



      // Deep link

      const initial = getHashPath();

      if (initial){

        openPreview(initial);

      } else {

        // try to auto-open README at root

        tryAutoLoadReadmeForPath(ALLOWED);

      }



    } catch (e){

      tree.textContent = 'Manifest konnte nicht geladen werden.';

      body.textContent = '';

      console.error(e);

    }

  }



  // ------------------------------

  // Global listeners

  // ------------------------------

  window.addEventListener('hashchange', () => {

    const p = getHashPath();

    if (p) openPreview(p);

  });



  // delegated click for internal preview links produced by linkifySafe()

  document.addEventListener('click', (e) => {

    const a = e.target.closest('a[data-preview]');

    if (!a) return;

    e.preventDefault();

    const p = a.getAttribute('data-preview');

    if (p){ setHashPath(p); openPreview(p); }

  });



  // expand/collapse all with guard

  expandBtn?.addEventListener('click', () => {

    BULK_TOGGLE = true;

    tree.querySelectorAll('details').forEach(d => d.open = true);

    BULK_TOGGLE = false;

  });

  collapseBtn?.addEventListener('click', () => {

    BULK_TOGGLE = true;

    tree.querySelectorAll('details').forEach(d => d.open = false);

    BULK_TOGGLE = false;

  });



  printBtn?.addEventListener('click', () => window.print());



  // Start

  window.addEventListener('DOMContentLoaded', boot);

})();
