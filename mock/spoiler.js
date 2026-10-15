// Spoiler mode: every money value, percentage and large number on the page is blurred
// for good. There is no reveal toggle. Dates, small counts and labels stay readable,
// except inside [data-spoil="all"] (every digit is blurred) and [data-spoil="none"]
// (nothing is, for tabs whose synthetic numbers are the point).
(function () {
  'use strict';
  // ISO dates, times and years are kept; the other alternatives are blurred.
  const KEEP = String.raw`\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}(?::\d{2})?`;
  const MONEY = String.raw`[-+−]?\$\s?\d[\d,]*(?:\.\d+)?\s?[kKmMbB]?(?:\/mo)?`;
  const PCT = String.raw`[-+−]?\d+(?:\.\d+)?\s?%`;
  const SEP = String.raw`[-+−]?\d{1,3}(?:,\d{3})+(?:\.\d+)?[kKmM]?`;
  const SUFFIX = String.raw`[-+−]?\d+(?:\.\d+)?[kKmM](?![a-zA-Z])`;
  const BIG = String.raw`[-+−]?\d{3,}(?:\.\d+)?`;
  const RE = new RegExp(`(${KEEP})|(${MONEY}|${PCT}|${SEP}|${SUFFIX}|${BIG})`, 'g');
  const RE_ALL = /()([-+−]?\$?\d[\d,.:]*(?:\s?[%kKmMbB](?![a-zA-Z]))?)/g;
  const isYear = s => /^(19|20)\d\d$/.test(s);
  const modeOf = el => (el && el.closest('[data-spoil]')?.dataset.spoil) || 'default';

  function hit(text, mode) {
    if (mode === 'none') return false;
    if (mode === 'all') return /\d/.test(text);
    RE.lastIndex = 0;
    let m;
    while ((m = RE.exec(text))) {
      if (m[2] && !isYear(m[2])) return true;
    }
    return false;
  }

  const SKIP = 'script,style,textarea,input,select,option,[contenteditable],.blur-num,title,.demo-veil';

  function wrapText(node) {
    const text = node.nodeValue;
    if (!text || !/\d/.test(text)) return;
    const mode = modeOf(node.parentElement);
    if (mode === 'none') return;
    const re = mode === 'all' ? RE_ALL : RE;
    re.lastIndex = 0;
    const parts = [];
    let last = 0, m, any = false;
    while ((m = re.exec(text))) {
      if (!m[2] || (mode !== 'all' && isYear(m[2]))) continue;
      if (m.index > last) parts.push(document.createTextNode(text.slice(last, m.index)));
      const span = document.createElement('span');
      span.className = 'blur-num';
      span.textContent = m[0];
      parts.push(span);
      last = m.index + m[0].length;
      any = true;
    }
    if (!any) return;
    if (last < text.length) parts.push(document.createTextNode(text.slice(last)));
    const frag = document.createDocumentFragment();
    parts.forEach(p => frag.appendChild(p));
    node.parentNode.replaceChild(frag, node);
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      const p = root.parentElement;
      if (!p) return;
      if (p.closest('svg')) { const t = p.closest('text'); if (t && hit(t.textContent, modeOf(t))) t.setAttribute('filter', 'url(#sbDemoBlur)'); return; }
      if (!p.closest(SKIP)) wrapText(root);
      return;
    }
    if (root.nodeType !== 1) return;
    if (root.closest && root.closest(SKIP)) return;
    if (root.tagName === 'svg' || root.closest('svg')) {
      const texts = root.tagName === 'text' ? [root] : root.querySelectorAll('text');
      texts.forEach(t => { if (hit(t.textContent, modeOf(t))) t.setAttribute('filter', 'url(#sbDemoBlur)'); else if (!t.classList.contains('blur-txt')) t.removeAttribute('filter'); });
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (n.nodeType === 1) {
          if (n.matches(SKIP)) return NodeFilter.FILTER_REJECT;
          if (n.tagName === 'svg') return NodeFilter.FILTER_ACCEPT;
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const texts = [], svgs = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) (n.nodeType === 1 ? svgs : texts).push(n);
    texts.forEach(t => { if (!t.parentElement.closest('svg')) wrapText(t); });
    svgs.forEach(s => s.querySelectorAll('text').forEach(t => { if (hit(t.textContent, modeOf(t))) t.setAttribute('filter', 'url(#sbDemoBlur)'); }));
  }

  function start() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.setAttribute('aria-hidden', 'true');
    defs.style.position = 'absolute';
    defs.innerHTML = '<filter id="sbDemoBlur" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="3.5"/></filter>';
    document.body.appendChild(defs);
    scan(document.body);
    let queue = new Set(), scheduled = false;
    const flush = () => { scheduled = false; const q = queue; queue = new Set(); q.forEach(n => { if (n.isConnected) scan(n); }); };
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === 'characterData') queue.add(m.target);
        else m.addedNodes.forEach(n => { if (!(n.nodeType === 1 && n.classList.contains('blur-num'))) queue.add(n); });
      }
      if (!scheduled) { scheduled = true; queueMicrotask(flush); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
