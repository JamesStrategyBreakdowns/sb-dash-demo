(() => {
  const POLL_MS = 15e3;
  const SAVE_DEBOUNCE_MS = 900;
  const STACK_DEPTH = 3;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const UNDO_MS = 8e3;
  const FLY_MS = REDUCED ? 160 : 750;
  const SECTION_META = [ {
    key: 'description',
    label: 'Description',
    hint: '3 sentences max'
  }, {
    key: 'poll',
    label: 'Poll'
  }, {
    key: 'rabbitHole',
    label: 'Rabbit Hole'
  }, {
    key: 'xPost',
    label: 'X post',
    limit: 280
  }, {
    key: 'liPost',
    label: 'LinkedIn post',
    limit: 3e3
  } ];
  const STATUS_SHORT = {
    '1️⃣ Pending Review': 'Pending review',
    '💬 Revisions Underway': 'Revisions',
    Idea: 'Idea'
  };
  const ACTION_COPY = {
    right: {
      verb: 'Sent to migrate',
      stamp: 'MIGRATE',
      done: 'migrated'
    },
    left: {
      verb: 'Archived',
      stamp: 'ARCHIVE',
      done: 'archived'
    },
    up: {
      verb: 'Moved to the back',
      stamp: 'LATER',
      done: 'deferred'
    }
  };
  const D = {
    open: false,
    loaded: false,
    cards: new Map,
    order: [],
    parked: [],
    deck: 'all',
    els: new Map,
    history: [],
    tally: {
      right: 0,
      left: 0,
      up: 0
    },
    pollTimer: null,
    lastFetch: null,
    fetchError: null,
    pending: new Map,
    jobTimer: null
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, (c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])));
  const $ = (sel, root = document) => root.querySelector(sel);
  async function api(method, url, body) {
    const r = await fetch(url, {
      method: method,
      headers: body ? {
        'Content-Type': 'application/json'
      } : {},
      body: body ? JSON.stringify(body) : undefined
    });
    const j = await r.json().catch((() => ({})));
    if (!r.ok) throw Object.assign(new Error(j.error || `HTTP ${r.status}`), {
      code: j.code || null
    });
    return j;
  }
  function fieldValue(entry, key) {
    if (entry.dirty.has(key)) return entry.draft[key];
    const c = entry.server;
    if (key === 'name') return c.name;
    if (key === 'subject') return c.subject;
    return c.sections[key.slice(4)].text;
  }
  async function refresh({silent: silent} = {}) {
    try {
      const startedAt = Date.now();
      const {cards: cards, fetchedAt: fetchedAt} = await api('GET', '/api/dailies');
      D.fetchError = null;
      D.fetchCode = null;
      D.lastFetch = fetchedAt;
      merge(cards, startedAt);
      D.loaded = true;
    } catch (e) {
      D.fetchError = e.message;
      D.fetchCode = e.code || null;
      if (!silent) console.warn('Daily Deck:', e.message);
    }
    updateBadge();
    if (D.open) {
      renderChrome();
      layout();
    }
  }
  function merge(cards, startedAt = Date.now()) {
    const seen = new Set;
    const acted = new Set(D.history.filter((h => h.dir !== 'up')).map((h => h.id)));
    for (const c of cards) {
      seen.add(c.id);
      const entry = D.cards.get(c.id);
      if (!entry) {
        D.cards.set(c.id, {
          server: c,
          draft: {},
          dirty: new Set,
          timers: {},
          queue: Promise.resolve(),
          saving: 0,
          error: null
        });
        if (!acted.has(c.id) && !D.pending.has(c.id)) D.order.push(c.id);
        continue;
      }
      if (entry.lastWriteAt && startedAt < entry.lastWriteAt) continue;
      entry.server = c;
      if (!D.order.includes(c.id) && !acted.has(c.id) && !D.pending.has(c.id)) D.order.push(c.id);
      syncFieldsToDom(c.id, true);
      vSync(c.id);
    }
    D.order = D.order.filter((id => seen.has(id) || D.cards.get(id)?.dirty.size || D.cards.get(id)?.v?.dirty));
    D.parked = D.parked.filter((id => seen.has(id) && !acted.has(id) && !D.pending.has(id)));
    partitionDeck();
  }
  const inDeck = id => {
    if (D.deck === 'all') return true;
    const done = !!D.cards.get(id)?.server.firstEdit;
    return D.deck === 'warm' ? done : !done;
  };
  function partitionDeck() {
    const all = [ ...new Set([ ...D.order, ...D.parked ]) ];
    const keep = D.order[0] && (D.cards.get(D.order[0])?.dirty.size || D.cards.get(D.order[0])?.v?.dirty) ? D.order[0] : null;
    D.order = all.filter((id => id === keep || inDeck(id)));
    D.parked = all.filter((id => id !== keep && !inDeck(id)));
  }
  function setDeck(deck) {
    if (D.deck === deck) return;
    D.deck = deck;
    try {
      localStorage.setItem('dd-deck', deck);
    } catch {}
    hideLink();
    partitionDeck();
    layout();
  }
  try {
    D.deck = localStorage.getItem('dd-deck') || 'all';
  } catch {}
  function deckCounts() {
    const all = [ ...new Set([ ...D.order, ...D.parked ]) ];
    const warm = all.filter((id => D.cards.get(id)?.server.firstEdit)).length;
    return {
      cold: all.length - warm,
      warm: warm,
      all: all.length
    };
  }
  function scheduleSave(id, key, immediate) {
    const entry = D.cards.get(id);
    clearTimeout(entry.timers[key]);
    if (immediate) return enqueueSave(id, key);
    entry.timers[key] = setTimeout((() => enqueueSave(id, key)), SAVE_DEBOUNCE_MS);
  }
  function enqueueSave(id, key) {
    const entry = D.cards.get(id);
    clearTimeout(entry.timers[key]);
    entry.queue = entry.queue.then((() => saveNow(id, key))).catch((() => {}));
    return entry.queue;
  }
  async function saveNow(id, key) {
    const entry = D.cards.get(id);
    if (!entry.dirty.has(key)) return;
    const value = entry.draft[key];
    const serverVal = key === 'name' ? entry.server.name : key === 'subject' ? entry.server.subject : entry.server.sections[key.slice(4)].text;
    if (value === serverVal) {
      entry.dirty.delete(key);
      return;
    }
    entry.saving++;
    entry.error = null;
    paintSaveState(id);
    try {
      const {card: card} = key.startsWith('sec:') ? await api('PUT', `/api/dailies/${id}/sections/${key.slice(4)}`, {
        text: value,
        prev: serverVal
      }) : await api('PATCH', `/api/dailies/${id}/fields`, {
        [key]: value,
        prev: serverVal
      });
      entry.server = card;
      entry.lastWriteAt = Date.now();
      if (entry.draft[key] === value) entry.dirty.delete(key);
      syncFieldsToDom(id, false);
    } catch (e) {
      entry.error = e.message;
      toast(`Couldn't save to Notion: ${e.message}`, {
        tone: 'error'
      });
    } finally {
      entry.saving--;
      paintSaveState(id);
    }
  }
  function flush(id) {
    const entry = D.cards.get(id);
    if (!entry) return Promise.resolve();
    for (const key of [ ...entry.dirty ]) enqueueSave(id, key);
    if (entry.v?.dirty) vEnqueue(id);
    return entry.queue;
  }
  function parsePoll(text) {
    const lines = text.split('\n').filter((l => l.trim() !== ''));
    const firstOpt = lines.findIndex((l => /^[-*•] /.test(l)));
    if (firstOpt < 1) return null;
    const q = lines.slice(0, firstOpt);
    const opts = lines.slice(firstOpt);
    if (!opts.every((l => /^[-*•] /.test(l))) || opts.length < 2) return null;
    const question = unwrapMd(q.join('\n'));
    const options = opts.map((l => unwrapMd(l.replace(/^[-*•] /, ''))));
    return {
      question: question.text,
      qWrap: question.wrap,
      options: options.map((o => o.text)),
      optWraps: options.map((o => o.wrap))
    };
  }
  function unwrapMd(t) {
    const m = String(t).match(/^\s*(\*\*|\*)(.+)\1\s*$/);
    return m ? {
      text: m[2].replace(/\*\*/g, ''),
      wrap: m[1]
    } : {
      text: String(t).replace(/\*\*/g, ''),
      wrap: ''
    };
  }
  const serializePoll = (question, options, qWrap = '', optWraps = []) => {
    const w = (t, m) => t.trim() && m ? m + t.trim() + m : t.trim();
    return [ w(question, qWrap), ...options.map(((o, i) => [ o, optWraps[i] || '' ])).filter((([o]) => o.trim())).map((([o, m]) => '- ' + w(o, m))) ].filter(Boolean).join('\n');
  };
  function mdInline(s) {
    return esc(s).replace(/\[([^\]\n]+)\]\(((?:https?:|mailto:)[^)\s]+)\)/g, ((m, t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`)).replace(/\*\*([^*]+(?:\*(?!\*)[^*]*)*)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>').replace(/\u2028/g, '<br>');
  }
  function mdHtml(text) {
    if (!text.trim()) return '<p class="dd-md-empty">Empty - click to write</p>';
    let html = '', list = null;
    for (const line of text.split('\n')) {
      const bullet = line.match(/^\s*[-*•] (.*)$/), num = line.match(/^\s*\d+[.)] (.*)$/);
      const kind = bullet ? 'ul' : num ? 'ol' : null;
      if (list && kind !== list) {
        html += `</${list}>`;
        list = null;
      }
      if (kind) {
        if (!list) {
          html += `<${kind}>`;
          list = kind;
        }
        html += `<li>${mdInline((bullet || num)[1])}</li>`;
      } else if (line.startsWith('> ')) html += `<blockquote>${mdInline(line.slice(2))}</blockquote>`; else html += line.trim() ? `<p>${mdInline(line)}</p>` : '<p class="dd-md-gap"><br></p>';
    }
    return html + (list ? `</${list}>` : '');
  }
  const pollOptHtml = (v, wrap = '') => `<li><input class="dd-input dd-poll-opt" value="${esc(v)}" placeholder="Option" data-poll-opt data-wrap="${esc(wrap || '')}"><button type="button" class="dd-poll-del" data-poll-del aria-label="Remove option">&times;</button></li>`;
  const FOLD = {
    li: {
      mobile: {
        chars: 140,
        lines: 3
      },
      desktop: {
        chars: 210,
        lines: 5
      }
    },
    x: {
      chars: 280
    }
  };
  let liDevice = 'mobile';
  try {
    liDevice = localStorage.getItem('ddLiDevice') || 'mobile';
  } catch {}
  const REPLY_RE = /^\s*\*{0,2}\s*(reply|self[- ]comment|first comment)\s*(?::\s*\*{0,2}|\*{0,2}\s*:)\s*/i;
  function splitReply(text) {
    const lines = String(text || '').split('\n');
    const i = lines.findIndex((l => REPLY_RE.test(l)));
    if (i < 0) return {
      post: String(text || '').trim(),
      reply: '',
      label: null
    };
    const m = lines[i].match(REPLY_RE);
    const label = m[1].replace(/^./, (c => c.toUpperCase()));
    const reply = [ lines[i].replace(REPLY_RE, ''), ...lines.slice(i + 1) ].join('\n').trim();
    return {
      post: lines.slice(0, i).join('\n').trim(),
      reply: reply,
      label: label
    };
  }
  const plainText = s => {
    const lines = String(s || '').replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*|\*|`/g, '').replace(/^\s*[-*•] /gm, '• ').split('\n').map((l => l.trimEnd())).filter((l => l.trim()));
    return lines.map(((l, i) => (i && !(l.startsWith('• ') && lines[i - 1].startsWith('• ')) ? '\n\n' : i ? '\n' : '') + l)).join('').replace(/\u2028/g, '\n');
  };
  function paintPreview(md, value) {
    const key = md.dataset.mdFor;
    if (key !== 'sec:xPost' && key !== 'sec:liPost') {
      md.innerHTML = mdHtml(value);
      return;
    }
    const isX = key === 'sec:xPost';
    const {post: post, reply: reply} = splitReply(value);
    const replyEl = md.closest('[data-section]').querySelector('[data-reply]');
    if (replyEl) {
      replyEl.hidden = !reply;
      replyEl.querySelector('[data-reply-text]').innerHTML = mdHtml(reply);
    }
    const text = plainText(post);
    if (!text.trim()) {
      md.innerHTML = mdHtml('');
      return;
    }
    renderFold(md, text, isX);
  }
  function renderFold(md, text, isX, moreAttr = 'data-more') {
    if (md.dataset.expanded === '1') {
      md.innerHTML = `<div class="dd-feedtext">${esc(text)}</div>`;
      return;
    }
    if (isX) {
      const over = text.length > FOLD.x.chars;
      let cut = FOLD.x.chars;
      const sp = text.lastIndexOf(' ', cut);
      if (over && sp > cut - 20) cut = sp;
      md.innerHTML = `<div class="dd-feedtext">${esc(over ? text.slice(0, cut).trimEnd() + '…' : text)}</div>` + (over ? `<button type="button" class="dd-more dd-more-x" ${moreAttr}>Show more</button>` : '');
      return;
    }
    const rule = FOLD.li[liDevice] || FOLD.li.mobile;
    const more = `<button type="button" class="dd-more dd-more-li" ${moreAttr}>…see more</button>`;
    const box = document.createElement('div');
    box.className = 'dd-feedtext';
    md.innerHTML = '';
    md.appendChild(box);
    const lh = parseFloat(getComputedStyle(box).lineHeight) || 22;
    const fits = n => {
      box.innerHTML = esc(text.slice(0, n).trimEnd()) + (n < text.length ? more : '');
      return box.scrollHeight <= lh * rule.lines + 2;
    };
    box.innerHTML = esc(text);
    if (text.length <= rule.chars && box.scrollHeight <= lh * rule.lines + 2) return;
    let lo = 0, hi = Math.min(text.length, rule.chars);
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(mid)) lo = mid; else hi = mid - 1;
    }
    let cut = lo;
    const sp = text.lastIndexOf(' ', cut);
    if (cut < text.length && sp > cut - 20 && sp > 0) cut = sp;
    fits(cut);
  }
  function repaintSocial(el) {
    el.querySelectorAll('[data-md-for="sec:xPost"], [data-md-for="sec:liPost"]').forEach((md => paintPreview(md, md.nextElementSibling.value)));
  }
  function mdField(key, sec, value, cls = '') {
    const tag = sec.locked ? '<span class="dd-tag">Has images or embeds - edit in Notion</span>' : sec.missing ? '<span class="dd-tag">Not on the Notion page yet - typing here adds it</span>' : '';
    const social = key === 'xPost' || key === 'liPost';
    const editable = sec.locked ? 'data-locked' : social ? 'tabindex="0"' : 'contenteditable="true" spellcheck="true"';
    return `${tag}<div class="dd-md ${cls}" data-md-for="sec:${key}" ${editable}>${mdHtml(value)}</div>\n      <textarea class="dd-md-src" hidden data-field="sec:${key}" ${sec.locked ? 'readonly' : ''}>${esc(value)}</textarea>`;
  }
  function pollBlock(sec, value) {
    const parsed = sec.locked ? null : parsePoll(value);
    if (!parsed && value.trim()) return `<div class="dd-section" data-section="poll">${mdField('poll', sec, value)}</div>`;
    const p = parsed || {
      question: '',
      options: [ '', '' ]
    };
    return `<div class="dd-section dd-poll" data-section="poll" data-poll>\n      <textarea class="dd-input dd-poll-q" rows="1" placeholder="Poll question" data-poll-q data-wrap="${esc(p.qWrap || '')}">${esc(p.question)}</textarea>\n      <ol class="dd-poll-opts">${p.options.map(((o, i) => pollOptHtml(o, (p.optWraps || [])[i]))).join('')}</ol>\n      <button type="button" class="dd-poll-add" data-poll-add>+ Add option</button>\n    </div>`;
  }
  function brandLogo(domain, svg, size) {
    return `<span class="dd-brand-fallback" style="width:${size}px;height:${size}px">${svg}</span>`;
  }
  const X_LOGO = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58l11.1 14.47Z"/></svg>';
  const LI_LOGO = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.83v1.5h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13v5.43h-4v-4.82c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.9h-4v-11Z"/></svg>';
  const svg = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    reply: svg('<path d="M4 12a8 7 0 0 1 8-7h0a8 7 0 0 1 0 14H8l-4 3v-5.5A7 7 0 0 1 4 12Z"/>'),
    repost: svg('<path d="M7 4 4 7l3 3"/><path d="M4 7h11a4 4 0 0 1 4 4v1"/><path d="m17 20 3-3-3-3"/><path d="M20 17H9a4 4 0 0 1-4-4v-1"/>'),
    heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
    views: svg('<path d="M5 20V12M10 20V6M15 20v-9M20 20V9"/>'),
    share: svg('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 14v5h14v-5"/>'),
    thumb: svg('<path d="M7 11v9H4v-9h3Z"/><path d="M7 11l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/>'),
    send: svg('<path d="M21 3 3 10.5l7 3 3 7L21 3Z"/><path d="m10 13.5 4.5-4.5"/>')
  };
  const V_ROWS = [ {
    group: 'Newsletter'
  }, {
    f: 'title',
    label: 'Article title',
    single: true
  }, {
    f: 'subjects',
    label: 'Subject lines',
    hint: 'tick any 4 for the A/B test'
  }, {
    f: 'preview',
    label: 'Preview text',
    single: true
  }, {
    f: 'caption',
    label: 'Caption',
    md: true
  }, {
    f: 'poll',
    label: 'Poll',
    md: true
  }, {
    f: 'rabbitHole',
    label: 'Rabbit Hole',
    md: true,
    when: d => !d.rhLinks
  }, {
    f: 'rhSource',
    label: 'Data source',
    md: true,
    when: d => !!d.rhLinks
  }, {
    f: 'rhLinks',
    label: 'Rabbit Hole',
    md: true,
    when: d => !!d.rhLinks
  }, {
    group: 'LinkedIn'
  }, {
    f: 'liPost',
    label: 'LinkedIn caption',
    md: true,
    limit: 3e3
  }, {
    f: 'liComments',
    label: 'Self-comments',
    hint: 'tick as many as you want',
    md: true
  }, {
    group: 'X'
  }, {
    f: 'xPost',
    label: 'X post',
    md: true,
    limit: 280
  }, {
    f: 'xComments',
    label: 'Self-comments',
    hint: 'tick as many as you want',
    md: true
  } ];
  const clone = x => JSON.parse(JSON.stringify(x));
  const vText = (d, f, v, i) => f === 'liComments' ? d.liComments[v][i].text : f === 'rhLinks' ? d.rhLinks[i].text[v] : Array.isArray(d[f][v]) ? d[f][v][i] : d[f][v];
  function vSet(d, f, v, i, text) {
    if (f === 'slug') d.slug = text; else if (f === 'rhLinks') d.rhLinks[i].text[v] = text; else if (f === 'liComments') d.liComments[v][i].text = text; else if (Array.isArray(d[f][v])) d[f][v][i] = text; else d[f][v] = text;
  }
  function vPicked(d, f, v, i) {
    const p = d.picks;
    if (f === 'subjects') return p.subjects.some((([a, b]) => a === v && b === i));
    if (f === 'xComments' || f === 'liComments') return p[f].some((([a, b]) => a === v && b === i));
    if (f === 'rhLinks') return p.rhLinks.some((([k, b]) => k === i && b === v));
    return p[f] === v;
  }
  const vPlain = s => String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|\*|`/g, '').replace(/\u2028/g, '\n');
  const PFP = cls => `<img class="dd-pfp${cls ? ' ' + cls : ''}" src="icon-192.png" alt="">`;
  function vSocialWrap(f, editable, img) {
    if (f === 'liPost' || f === 'xPost') {
      const li = f === 'liPost';
      return `<div class="dd-post dd-vpost dd-post-${li ? 'li' : 'x'}"${li ? ` data-device="${liDevice}"` : ''}>\n        <header>${PFP()}<div><strong>Strategy Breakdowns</strong><em>${li ? 'Newsletter · now' : 'X post · now'}</em></div>${brandLogo(li ? 'li' : 'x', li ? LI_LOGO : X_LOGO, 24)}</header>\n        <div class="dd-md dd-vfold" data-vfold title="Click to edit"></div>\n        ${editable}\n        ${img ? `<div class="dd-post-media"><img src="${esc(img)}" alt="" draggable="false"></div>` : ''}\n        ${li ? `<div class="dd-libar" aria-hidden="true"><span>${ICON.thumb}Like</span><span>${ICON.reply}Comment</span><span>${ICON.repost}Repost</span><span>${ICON.send}Send</span></div>` : `<div class="dd-xbar" aria-hidden="true">${ICON.reply}${ICON.repost}${ICON.heart}${ICON.views}${ICON.share}</div>`}\n      </div>`;
    }
    if (f === 'liComments') {
      return `<div class="dd-reply dd-reply-li dd-vreply">${PFP('dd-pfp-sm')}<div class="dd-reply-body"><div class="dd-comment">\n        <div class="dd-comment-head"><strong>Strategy Breakdowns</strong><span class="dd-author">Author</span><time>now</time></div>\n        <div class="dd-comment-sub">Newsletter</div>${editable}</div>\n        <div class="dd-comment-actions" aria-hidden="true"><span>Like</span><i>·</i><span>Reply</span></div></div></div>`;
    }
    if (f === 'xComments') {
      return `<div class="dd-reply dd-reply-x dd-vreply"><div class="dd-thread">${PFP()}</div><div class="dd-reply-body">\n        <div class="dd-reply-head"><strong>Strategy Breakdowns</strong><span>· now</span></div>${editable}\n        <div class="dd-xbar dd-xbar-sm" aria-hidden="true">${ICON.reply}${ICON.repost}${ICON.heart}${ICON.views}${ICON.share}</div></div></div>`;
    }
    return editable;
  }
  function vCell(d, f, v, i, row, img) {
    const text = vText(d, f, v, i);
    const on = vPicked(d, f, v, i);
    const at = `data-f="${f}" data-v="${v}"${i != null ? ` data-i="${i}"` : ''}`;
    const post = f === 'liPost' || f === 'xPost';
    const body = row.md ? vSocialWrap(f, `<div class="dd-vtext" data-vedit contenteditable="true" spellcheck="true" ${post ? 'hidden ' : ''}${at}>${mdHtml(text)}</div>`, img) : `<textarea class="dd-vinput" rows="1" data-vedit ${at}>${esc(text)}</textarea>`;
    const count = row.limit ? `<span class="dd-vcount" data-vcount ${at}></span>` : '';
    let extra = '';
    if (f === 'liComments') {
      const c = d.liComments[v][i];
      extra = c.image ? `<div class="dd-vimg"><a href="${esc(c.image.sourceUrl || c.image.url)}" target="_blank" rel="noopener"><img src="${esc(c.image.url)}" alt="${esc(c.image.alt)}" loading="lazy" draggable="false"></a>\n            <label class="dd-vimgpick"><input type="checkbox" data-vimg ${at} ${c.withImage ? 'checked' : ''}> With image <span>${esc(c.image.source || '')}</span></label></div>` : '<div class="dd-vimg dd-vimg-none">No image found for this one</div>';
    }
    return `<div class="dd-vcell${on ? ' on' : ''}" ${at}>\n      <label class="dd-vpick" title="Use this one"><input type="checkbox" data-vpick ${at} ${on ? 'checked' : ''}><span></span></label>\n      <div class="dd-vbody">${body}${extra}${count}</div>\n    </div>`;
  }
  function vGridHtml(d, img) {
    const head = `<div class="dd-vhead"><div></div>${d.angles.map(((a, v) => `<div class="dd-vangle"><b>v${v + 1}</b>${a.name ? ` · ${esc(a.name)}` : ''}${a.hook ? `<small>${esc(a.hook)}</small>` : ''}</div>`)).join('')}</div>`;
    const rows = V_ROWS.filter((row => !row.when || row.when(d))).map((row => {
      if (row.group === 'LinkedIn') return `<div class="dd-vgroup dd-vgroup-social">${brandLogo('li', LI_LOGO, 22)}LinkedIn<span class="dd-socials-off-only">&amp; ${brandLogo('x', X_LOGO, 22)}X</span><button type="button" class="dd-socials-toggle" data-socials-toggle title="Socials Ready (Daily) in Notion"><i></i><span class="on">Ready to publish</span><span class="off">Not ready - skipped for now</span></button><div class="dd-device" role="group" aria-label="LinkedIn preview size"><button type="button" data-li-device="mobile">Mobile</button><button type="button" data-li-device="desktop">Desktop</button></div></div>`;
      if (row.group === 'X') return `<div class="dd-vgroup dd-vgroup-social dd-vgroup-x">${brandLogo('x', X_LOGO, 22)}X</div>`;
      if (row.group) return `<div class="dd-vgroup">${row.group}</div>`;
      if (row.f === 'rhLinks') {
        return d.rhLinks.map(((l, i) => {
          let host = '';
          try {
            host = new URL(l.url).hostname.replace(/^www\./, '');
          } catch {}
          const head = i === 0 ? `${row.label}<small data-vhint="rhLinks">${rhHint(d)}</small>` : '';
          return `<div class="dd-vrow dd-vrow-link" data-vrow="rhLinks" data-i="${i}"><div class="dd-vlabel">${head}<span class="dd-vlink">Link ${i + 1}${host ? ` · <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(host)}</a>` : ''}</span></div>${[ 0, 1, 2 ].map((v => `<div class="dd-vcol">${vCell(d, 'rhLinks', v, i, row)}</div>`)).join('')}</div>`;
        })).join('');
      }
      const n = row.f === 'subjects' ? 4 : row.f === 'xComments' || row.f === 'liComments' ? 3 : null;
      const cols = [ 0, 1, 2 ].map((v => `<div class="dd-vcol">${n ? Array.from({
        length: n
      }, ((_, i) => vCell(d, row.f, v, i, row))).join('') : vCell(d, row.f, v, null, row, img)}</div>`)).join('');
      return `<div class="dd-vrow" data-vrow="${row.f}"><div class="dd-vlabel">${row.label}${row.hint ? `<small data-vhint="${row.f}">${row.hint}</small>` : ''}</div>${cols}</div>`;
    })).join('');
    return head + rows;
  }
  const rhHint = d => `${d.picks.rhLinks.length} of 3 ticked - the best 3 of 6, 1 version each`;
  function vTopHtml(d) {
    const slots = d.picks.subjects.map((([v, i], k) => `<div class="dd-vslot">\n        <span class="dd-vslot-tag">${'ABCD'[k]}${k === 0 ? '<i>control</i>' : ''}</span>\n        <textarea class="dd-vinput" rows="1" data-vedit data-f="subjects" data-v="${v}" data-i="${i}" aria-label="Subject line ${'ABCD'[k]}">${esc(d.subjects[v][i])}</textarea>\n        <span class="dd-vfrom">v${v + 1}</span></div>`)).join('');
    const short = 4 - d.picks.subjects.length;
    return `<div class="dd-inbox dd-vinbox" data-vtop>\n      <img class="dd-avatar" src="logo.png" alt="">\n      <div class="dd-inbox-main">\n        <div class="dd-inbox-from"><strong>Strategy Breakdowns</strong><span>Inbox</span></div>\n        <div class="dd-vtitle" data-vtitle>${esc(d.title[d.picks.title])}</div>\n        ${slots}\n        ${short > 0 ? `<div class="dd-vwarn">${short} more subject line${short > 1 ? 's' : ''} to tick for a 4-way A/B test</div>` : ''}\n        <div class="dd-vslot dd-vslot-preview"><span class="dd-vslot-tag">Preview</span>\n          <textarea class="dd-vinput" rows="1" data-vedit data-f="preview" data-v="${d.picks.preview}" aria-label="Preview text">${esc(d.preview[d.picks.preview])}</textarea><span class="dd-vfrom">v${d.picks.preview + 1}</span></div>\n        <div class="dd-slug dd-vslug">Read online: sbdash.demo/p/<input class="dd-vslug-in" data-vedit data-f="slug" value="${esc(d.slug)}" spellcheck="false" aria-label="Read online slug"></div>\n      </div>\n    </div>`;
  }
  function vPaint(el, entry) {
    const d = entry.v.data;
    const top = $('[data-vtop]', el);
    if (top) {
      const n = document.createElement('div');
      n.innerHTML = vTopHtml(d);
      top.replaceWith(n.firstElementChild);
    }
    const grid = $('[data-vgrid]', el);
    if (grid) grid.innerHTML = vGridHtml(d, entry.server.image);
    vPaintCounts(el, entry);
    vPaintFolds(el);
    requestAnimationFrame((() => el.querySelectorAll('.dd-vinput').forEach((t => {
      if (t.tagName === 'TEXTAREA') autosize(t);
    }))));
  }
  function vPaintCounts(el, entry) {
    const d = entry.v.data;
    el.querySelectorAll('[data-vcount]').forEach((n => {
      const row = V_ROWS.find((r => r.f === n.dataset.f));
      const len = vPlain(vText(d, n.dataset.f, +n.dataset.v, n.dataset.i != null ? +n.dataset.i : null)).length;
      n.textContent = `${len.toLocaleString()} / ${row.limit.toLocaleString()}`;
      n.classList.toggle('over', len > row.limit);
    }));
  }
  function vRepaintPicks(el, entry) {
    const d = entry.v.data;
    el.querySelectorAll('.dd-vcell').forEach((c => {
      const on = vPicked(d, c.dataset.f, +c.dataset.v, c.dataset.i != null ? +c.dataset.i : null);
      c.classList.toggle('on', on);
      const box = c.querySelector('[data-vpick]');
      if (box) box.checked = on;
    }));
    const hint = el.querySelector('[data-vhint="rhLinks"]');
    if (hint && d.rhLinks) hint.textContent = rhHint(d);
    const top = $('[data-vtop]', el);
    if (top && !top.contains(document.activeElement)) {
      const n = document.createElement('div');
      n.innerHTML = vTopHtml(d);
      top.replaceWith(n.firstElementChild);
      requestAnimationFrame((() => el.querySelectorAll('[data-vtop] textarea').forEach(autosize)));
    }
  }
  function vScheduleSave(id, immediate) {
    const entry = D.cards.get(id);
    entry.v.dirty = true;
    paintSaveState(id);
    clearTimeout(entry.v.timer);
    if (immediate) return vEnqueue(id);
    entry.v.timer = setTimeout((() => vEnqueue(id)), SAVE_DEBOUNCE_MS);
  }
  function vEnqueue(id) {
    const entry = D.cards.get(id);
    clearTimeout(entry.v.timer);
    entry.queue = entry.queue.then((() => vSaveNow(id))).catch((() => {}));
    return entry.queue;
  }
  async function vSaveNow(id) {
    const entry = D.cards.get(id);
    if (!entry.v?.dirty) return;
    const sent = clone(entry.v.data);
    entry.v.seq = (entry.v.seq || 0) + 1;
    const seq = entry.v.seq;
    entry.saving++;
    entry.error = null;
    paintSaveState(id);
    try {
      const {card: card} = await api('PUT', `/api/dailies/${id}/versions`, {
        data: sent,
        prev: entry.server.versions
      });
      entry.server = card;
      entry.lastWriteAt = Date.now();
      if (entry.v.seq === seq && JSON.stringify(entry.v.data) === JSON.stringify(sent)) {
        entry.v.dirty = false;
        if (card.versions) entry.v.data = clone(card.versions);
      }
    } catch (e) {
      entry.error = e.message;
      toast(`Couldn't save to Notion: ${e.message}`, {
        tone: 'error'
      });
    } finally {
      entry.saving--;
      paintSaveState(id);
    }
  }
  function vPaintFolds(root) {
    root.querySelectorAll('.dd-vpost').forEach((post => {
      const fold = post.querySelector('[data-vfold]');
      const edit = post.querySelector('[data-vedit]');
      if (!fold || !edit || !edit.hidden) return;
      if (post.classList.contains('dd-post-li')) post.dataset.device = liDevice;
      const text = plainText(domToMd(edit));
      if (!text.trim()) {
        fold.innerHTML = '<p class="dd-md-empty">Empty - click to write</p>';
        return;
      }
      renderFold(fold, text, post.classList.contains('dd-post-x'), 'data-vmore');
    }));
  }
  function wireVersions(el, id) {
    const entry = D.cards.get(id);
    requestAnimationFrame((() => vPaintFolds(el)));
    el.addEventListener('click', (e => {
      const more = e.target.closest('[data-vmore]');
      if (more) {
        const fold = more.closest('[data-vfold]');
        fold.dataset.expanded = '1';
        vPaintFolds(fold.closest('.dd-vpost').parentElement);
        return;
      }
      const fold = e.target.closest('[data-vfold]');
      if (fold && !e.target.closest('a')) {
        const edit = fold.closest('.dd-vpost').querySelector('[data-vedit]');
        fold.hidden = true;
        edit.hidden = false;
        edit.focus();
        placeCaret(edit, null);
      }
    }));
    const foldBack = edit => setTimeout((() => {
      const post = edit.closest('.dd-vpost');
      if (!post || document.activeElement === edit) return;
      edit.hidden = true;
      const fold = post.querySelector('[data-vfold]');
      fold.hidden = false;
      delete fold.dataset.expanded;
      vPaintFolds(post.parentElement);
    }), 10);
    el.addEventListener('pointerdown', (e => {
      el.querySelectorAll('.dd-vpost [data-vedit]:not([hidden])').forEach((edit => {
        if (edit.closest('.dd-vpost').contains(e.target)) return;
        edit.blur();
        foldBack(edit);
      }));
    }));
    el.addEventListener('focusout', (e => {
      const edit = e.target.closest?.('.dd-vpost [data-vedit]');
      if (edit) foldBack(edit);
    }));
    const cellOf = t => ({
      f: t.dataset.f,
      v: +t.dataset.v,
      i: t.dataset.i != null ? +t.dataset.i : null
    });
    const mirror = (src, f, v, i, text) => {
      el.querySelectorAll(`[data-vedit][data-f="${f}"][data-v="${v}"]${i != null ? `[data-i="${i}"]` : ''}`).forEach((n => {
        if (n === src) return;
        if (n.tagName === 'TEXTAREA' || n.tagName === 'INPUT') {
          n.value = text;
          if (n.tagName === 'TEXTAREA') autosize(n);
        } else if (!n.isContentEditable) n.innerHTML = mdHtml(text);
      }));
      if (f === 'title' && entry.v.data.picks.title === v) {
        const t = $('[data-vtitle]', el);
        if (t) t.textContent = text;
      }
    };
    el.addEventListener('input', (e => {
      const t = e.target.closest('[data-vedit]');
      if (!t) return;
      const {f: f, v: v, i: i} = cellOf(t);
      let text = t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' ? t.value : domToMd(t);
      if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') text = text.replace(/\n/g, ' ');
      vSet(entry.v.data, f, v, i, text);
      mirror(t, f, v, i, text);
      vPaintCounts(el, entry);
      vScheduleSave(id);
    }));
    el.addEventListener('focusin', (e => {
      const t = e.target.closest('.dd-vtext');
      if (!t) return;
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch {}
      if (t.querySelector('.dd-md-empty')) t.innerHTML = '<p><br></p>';
    }));
    el.addEventListener('focusout', (e => {
      const t = e.target.closest('.dd-vtext');
      if (t) {
        const {f: f, v: v, i: i} = cellOf(t);
        setTimeout((() => {
          if (document.activeElement !== t && !document.activeElement?.closest?.('.dd-linkpop')) t.innerHTML = mdHtml(vText(entry.v.data, f, v, i));
        }), 0);
      }
      if (e.target.closest('[data-vedit]') && entry.v.dirty) vScheduleSave(id, true);
    }));
    el.addEventListener('keydown', (e => {
      if (e.key === 'Enter' && !e.shiftKey && e.target.matches('.dd-vinput')) {
        e.preventDefault();
        e.target.blur();
      }
      const cell = e.target.closest?.('.dd-vtext');
      const fmt = {
        b: 'bold',
        i: 'italic',
        u: 'underline'
      }[e.key.toLowerCase()];
      if (cell && fmt && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        document.execCommand(fmt);
        cell.dispatchEvent(new Event('input', {
          bubbles: true
        }));
      }
    }));
    el.addEventListener('paste', (e => {
      if (!e.target.closest?.('.dd-vtext')) return;
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    }));
    el.addEventListener('change', (e => {
      const box = e.target;
      const d = entry.v.data;
      if (box.matches('[data-vimg]')) {
        const {v: v, i: i} = cellOf(box);
        d.liComments[v][i].withImage = box.checked;
        return vScheduleSave(id, true);
      }
      if (!box.matches('[data-vpick]')) return;
      const {f: f, v: v, i: i} = cellOf(box);
      if (f === 'subjects') {
        const k = d.picks.subjects.findIndex((([a, b]) => a === v && b === i));
        if (k >= 0) d.picks.subjects.splice(k, 1); else if (d.picks.subjects.length >= 4) {
          box.checked = false;
          toast('4 subject lines are already ticked - untick one first');
          return;
        } else d.picks.subjects.push([ v, i ]);
      } else if (f === 'rhLinks') {
        const k = d.picks.rhLinks.findIndex((([a]) => a === i));
        if (k >= 0 && d.picks.rhLinks[k][1] === v) d.picks.rhLinks.splice(k, 1); else if (k >= 0) d.picks.rhLinks[k][1] = v; else if (d.picks.rhLinks.length >= 3) {
          box.checked = false;
          toast('3 links are already ticked - untick one first');
          return;
        } else {
          d.picks.rhLinks.push([ i, v ]);
          d.picks.rhLinks.sort(((a, b) => a[0] - b[0]));
        }
      } else if (f === 'xComments' || f === 'liComments') {
        const k = d.picks[f].findIndex((([a, b]) => a === v && b === i));
        if (k >= 0) d.picks[f].splice(k, 1); else d.picks[f].push([ v, i ]);
      } else d.picks[f] = v;
      vRepaintPicks(el, entry);
      vScheduleSave(id, true);
    }));
    vPaintCounts(el, entry);
  }
  function vSync(id) {
    const el = D.els.get(id);
    const entry = D.cards.get(id);
    if (!el || !entry?.v || !entry.server.versions || entry.v.dirty || entry.saving) return;
    if (JSON.stringify(entry.server.versions) === JSON.stringify(entry.v.data)) return;
    if (el.querySelector('.dd-vgrid, [data-vtop]')?.contains(document.activeElement) || el.contains(document.activeElement) && document.activeElement.closest('[data-vedit]')) return;
    entry.v.data = clone(entry.server.versions);
    vPaint(el, entry);
  }
  function versionsCardHtml(entry) {
    const c = entry.server;
    const d = entry.v.data;
    const graphic = c.image ? `<img src="${esc(c.image)}" alt="" draggable="false" decoding="async">` : '<div class="dd-noimg">No graphic on the page</div>';
    return `<div class="dd-scroll">\n        <div class="dd-vwrap">\n          <div class="dd-vintro">\n            ${vTopHtml(d)}\n            <figure class="dd-graphic dd-vgraphic" data-drag>${graphic}</figure>\n          </div>\n          <div class="dd-vgrid" data-vgrid>${vGridHtml(d, c.image)}</div>\n        </div>\n      </div>`;
  }
  const GV = {
    id: null,
    el: null,
    frames: [],
    pick: 0,
    restoring: false,
    base: []
  };
  const G_N = 3;
  const gKey = id => `dd-gdraft:${id}`;
  function ensureGraphicView() {
    if (GV.el) return GV.el;
    const el = document.createElement('div');
    el.className = 'dd-gview';
    el.hidden = true;
    el.innerHTML = `\n      <div class="dd-gview-stage" data-gstage>${Array.from({
      length: G_N
    }, ((_, k) => `\n        <div class="dd-gview-col" data-gcol="${k}">\n          <label class="dd-gview-pick"><input type="checkbox" data-gpick="${k}"><span></span>Use #${k + 1}</label>\n          <div class="dd-gview-frame" data-gframe="${k}"></div>\n        </div>`)).join('')}</div>\n      <form class="dd-gview-bar" data-gform>\n        <div class="dd-gview-hint" data-ghint></div>\n        <div class="dd-compose-row">\n          <textarea class="dd-compose-text" rows="1" data-gnote placeholder="Tell Claude how to change the graphic (it regenerates it). Text edits on the graphic just need Save."></textarea>\n          <button type="button" class="dd-gview-save" data-gsave>Save</button>\n          <button type="submit" class="dd-compose-send" data-gapply disabled>Send to Claude</button>\n          <button type="button" class="dd-gview-close" data-gclose>Close</button>\n        </div>\n      </form>`;
    ($('#ddOverlay') || document.body).appendChild(el);
    el.querySelector('[data-gclose]').addEventListener('click', closeGraphicView);
    el.querySelector('[data-gnote]').addEventListener('input', (e => {
      autosize(e.target);
      paintGraphicView();
      saveGraphicDraft();
    }));
    el.querySelector('[data-gnote]').addEventListener('keydown', (e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        applyGraphicView();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeGraphicView();
      }
    }));
    el.addEventListener('change', (e => {
      const k = e.target.dataset?.gpick;
      if (k == null) return;
      GV.pick = +k;
      paintGraphicView();
      saveGraphicDraft(true);
    }));
    el.querySelector('[data-gform]').addEventListener('submit', (e => {
      e.preventDefault();
      applyGraphicView();
    }));
    el.querySelector('[data-gsave]').addEventListener('click', (() => {
      saveGraphicDraft(true);
      const n = gChanged(GV.frames[GV.pick] || {
        edits: new Map
      }).length;
      toast(`Saved · #${GV.pick + 1}${n ? ` with ${n} edit${n > 1 ? 's' : ''}` : ''}`, {
        tone: 'good'
      });
      const card = D.els.get(GV.id);
      if (card) renderCardPreview(card, GV.id);
    }));
    el.addEventListener('click', (e => {
      if (e.target === el || e.target.matches('[data-gstage], [data-gcol]')) closeGraphicView();
    }));
    window.addEventListener('resize', (() => {
      if (!el.hidden) fitGraphic();
    }));
    GV.el = el;
    return el;
  }
  const gNorm = t => String(t || '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const gChanged = f => [ ...f.edits.values() ].filter((x => x.after !== x.before));
  function paintGraphicView() {
    const n = gChanged(GV.frames[GV.pick] || {
      edits: new Map
    }).length;
    const note = GV.el.querySelector('[data-gnote]').value.trim();
    GV.el.querySelector('[data-gapply]').disabled = !note;
    GV.el.querySelector('[data-gapply]').title = note ? `Claude regenerates #${GV.pick + 1} from your note${n ? ` and keeps your ${n} edit${n > 1 ? 's' : ''}` : ''}` : 'Write a note for Claude first';
    GV.el.querySelectorAll('[data-gpick]').forEach((b => {
      b.checked = +b.dataset.gpick === GV.pick;
      b.closest('[data-gcol]').classList.toggle('on', b.checked);
    }));
  }
  function fitGraphic() {
    const stage = GV.el.querySelector('[data-gstage]');
    const gap = 16, head = 34;
    const s = Math.min((stage.clientWidth - 32 - gap * (G_N - 1)) / (1080 * G_N), (stage.clientHeight - 24 - head) / 1350, 1);
    GV.el.querySelectorAll('[data-gframe]').forEach((box => {
      box.style.width = `${1080 * s}px`;
      box.style.height = `${1350 * s}px`;
      const iframe = box.querySelector('iframe');
      if (iframe) iframe.style.transform = `scale(${s})`;
    }));
  }
  function loadGraphicDraft(id) {
    const entry = D.cards.get(id);
    const remote = (entry?.v?.data ? entry.v.data.graphicDraft : entry?.server?.versions?.graphicDraft) || null;
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(gKey(id)) || 'null');
    } catch {}
    if (!remote) return local;
    if (!local) return remote;
    return (local.savedAt || 0) > (remote.savedAt || 0) ? local : remote;
  }
  function saveGraphicDraft(now) {
    const id = GV.id;
    const entry = D.cards.get(id);
    if (!entry || GV.restoring) return;
    const edits = Array.from({
      length: G_N
    }, ((_, k) => {
      const f = GV.frames[k];
      return f?.loaded ? Object.fromEntries(gChanged(f).map((x => [ x.node.dataset.gid, {
        before: x.before,
        after: x.after
      } ]))) : {
        ...GV.base[k] || {}
      };
    }));
    const note = GV.el.querySelector('[data-gnote]').value;
    const empty = !note.trim() && edits.every((e => !Object.keys(e).length)) && GV.pick === 0;
    const draft = empty ? null : {
      pick: GV.pick,
      note: note,
      savedAt: Date.now(),
      edits: edits
    };
    try {
      if (draft) localStorage.setItem(gKey(id), JSON.stringify(draft)); else localStorage.removeItem(gKey(id));
    } catch {}
    if (entry.v?.data) {
      const had = !!entry.v.data.graphicDraft;
      if (draft) entry.v.data.graphicDraft = draft; else delete entry.v.data.graphicDraft;
      if (draft || had) vScheduleSave(id, now);
    }
    const hint = GV.el.querySelector('[data-ghint]');
  }
  async function openGraphicView(id) {
    const entry = D.cards.get(id);
    if (!entry) return;
    const el = ensureGraphicView();
    GV.id = id;
    const draft = loadGraphicDraft(id);
    GV.pick = draft?.pick ?? 0;
    GV.frames = Array.from({
      length: G_N
    }, (() => ({
      edits: new Map,
      loaded: false
    })));
    GV.base = draft?.edits || [];
    el.querySelector('[data-gnote]').value = draft?.note || '';
    const hint = el.querySelector('[data-ghint]');
    el.querySelectorAll('[data-gframe]').forEach((box => {
      box.innerHTML = entry.server.image ? `<img src="${esc(entry.server.image)}" alt="">` : '';
    }));
    hint.textContent = 'Loading the editable versions…';
    el.hidden = false;
    requestAnimationFrame((() => {
      el.classList.add('open');
      fitGraphic();
      autosize(el.querySelector('[data-gnote]'));
    }));
    paintGraphicView();
    const lost = [];
    try {
      await Promise.all(Array.from({
        length: G_N
      }, (async (_, k) => {
        const r = await fetch(`/api/dailies/${id}/graphic-html?v=${k}`);
        if (!r.ok) throw new Error((await r.json().catch((() => ({})))).error || `HTTP ${r.status}`);
        const html = await r.text();
        if (GV.id !== id || el.hidden) return;
        const box = el.querySelector(`[data-gframe="${k}"]`);
        const iframe = document.createElement('iframe');
        iframe.className = 'dd-gview-iframe';
        iframe.setAttribute('sandbox', 'allow-same-origin');
        await new Promise((res => {
          iframe.addEventListener('load', (() => {
            setupGraphicEditing(iframe, GV.frames[k]);
            lost.push(...restoreGraphicEdits(iframe, GV.frames[k], draft?.edits?.[k] || {}, k));
            GV.frames[k].loaded = true;
            res();
          }), {
            once: true
          });
          iframe.srcdoc = html;
          box.innerHTML = '';
          box.appendChild(iframe);
          fitGraphic();
        }));
      })));
      if (GV.id !== id) return;
      if (lost.length) {
        const n = el.querySelector('[data-gnote]');
        n.value = [ n.value.trim(), 'Earlier edits that no longer match the graphic:', ...lost ].filter(Boolean).join('\n');
        autosize(n);
        saveGraphicDraft(true);
      }
      paintGraphicView();
      hint.textContent = draft ? 'Your saved edits are back. Click any text to change it and tick the version you are building. Everything saves as you go.' : 'Click any text on any version to change it and tick the one you are building - it saves as you go. Send to Claude only to regenerate from a note.';
    } catch (e) {
      hint.textContent = `Text editing isn't available for this graphic (${e.message}). Describe the change in the box instead.`;
      fitGraphic();
    }
  }
  function gSetText(node, text) {
    if (node.closest('svg')) {
      const tsp = node.querySelectorAll('tspan');
      if (tsp.length === 1) tsp[0].textContent = text; else node.textContent = text;
    } else node.innerText = text;
  }
  function restoreGraphicEdits(iframe, frame, edits, k) {
    const doc = iframe.contentDocument;
    const lost = [];
    GV.restoring = true;
    for (const [gid, x] of Object.entries(edits)) {
      let node = doc.querySelector(`[data-gid="${gid}"]`);
      if (!node || node.dataset.gorig !== x.before) node = [ ...doc.querySelectorAll('[data-gid]') ].find((n => n.dataset.gorig === x.before)) || null;
      if (!node) {
        lost.push(`#${k + 1}: "${x.before}" -> "${x.after}"`);
        continue;
      }
      gSetText(node, x.after);
      frame.edits.set(node.dataset.gid, {
        before: node.dataset.gorig,
        after: x.after,
        node: node
      });
    }
    GV.restoring = false;
    return lost;
  }
  function setupGraphicEditing(iframe, frame) {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const style = doc.createElement('style');
    style.textContent = `[data-gid]{cursor:text;outline:none;border-radius:3px}\n      [data-gid]:hover{box-shadow:0 0 0 2px rgba(177,158,248,.9)}\n      [data-gid]:focus{box-shadow:0 0 0 3px #F2C94C;background:rgba(255,241,201,.6)}\n      .gv-svg-input{position:absolute;z-index:99;font:inherit;padding:2px 6px;border:3px solid #F2C94C;border-radius:6px;background:#FFF8E1}`;
    doc.head.appendChild(style);
    let n = 0;
    const record = (node, before, after) => {
      const k = node.dataset.gid;
      const prev = frame.edits.get(k);
      frame.edits.set(k, {
        before: prev ? prev.before : before,
        after: after,
        node: node
      });
      paintGraphicView();
      saveGraphicDraft();
    };
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.closest('svg') || [ 'SCRIPT', 'STYLE', 'IMG' ].includes(node.tagName)) continue;
      if (node.parentElement?.closest('[data-gid]')) continue;
      const own = [ ...node.childNodes ].some((c => c.nodeType === 3 && c.nodeValue.trim()));
      if (!own) continue;
      node.dataset.gid = `h${n++}`;
      if (doc.defaultView.getComputedStyle(node).whiteSpace.startsWith('normal')) {
        const tw = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const texts = [];
        for (let t = tw.nextNode(); t; t = tw.nextNode()) {
          t.nodeValue = t.nodeValue.replace(/\s+/g, ' ');
          texts.push(t);
        }
        if (texts.length) {
          texts[0].nodeValue = texts[0].nodeValue.trimStart();
          texts.at(-1).nodeValue = texts.at(-1).nodeValue.trimEnd();
        }
      }
      node.setAttribute('contenteditable', 'plaintext-only');
      node.dataset.gorig = gNorm(node.innerText);
      node.addEventListener('input', (() => record(node, node.dataset.gorig, gNorm(node.innerText))));
      node.addEventListener('keydown', (e => {
        if (e.key === 'Escape') node.blur();
      }));
    }
    doc.querySelectorAll('svg text').forEach((t => {
      t.dataset.gid = `s${n++}`;
      t.dataset.gorig = gNorm(t.textContent);
      t.style.cursor = 'text';
      t.addEventListener('click', (() => {
        const r = t.getBoundingClientRect();
        const input = doc.createElement('input');
        input.className = 'gv-svg-input';
        input.value = t.textContent;
        Object.assign(input.style, {
          left: `${r.left + doc.defaultView.scrollX - 6}px`,
          top: `${r.top + doc.defaultView.scrollY - 4}px`,
          minWidth: `${Math.max(r.width + 24, 80)}px`,
          fontSize: `${Math.max(r.height * .8, 14)}px`
        });
        doc.body.appendChild(input);
        input.focus();
        input.select();
        let done = false;
        const finish = keep => {
          if (done) return;
          done = true;
          if (keep && input.value !== t.textContent) {
            gSetText(t, input.value);
            record(t, t.dataset.gorig, gNorm(input.value));
          }
          input.remove();
        };
        input.addEventListener('keydown', (e => {
          if (e.key === 'Enter') finish(true);
          if (e.key === 'Escape') finish(false);
        }));
        input.addEventListener('blur', (() => finish(true)));
      }));
    }));
    doc.addEventListener('click', (e => {
      if (e.target.closest('a')) e.preventDefault();
    }), true);
  }
  function closeGraphicView() {
    if (!GV.el || GV.el.hidden) return;
    GV.el.querySelectorAll('iframe').forEach((f => f.contentDocument?.activeElement?.blur?.()));
    saveGraphicDraft(true);
    GV.el.classList.remove('open');
    GV.el.hidden = true;
    GV.el.querySelectorAll('[data-gframe]').forEach((b => {
      b.innerHTML = '';
    }));
    const closedId = GV.id;
    GV.id = null;
    GV.frames = [];
    const card = D.els.get(closedId);
    if (card) renderCardPreview(card, closedId);
  }
  function applyGraphicView() {
    const id = GV.id;
    const entry = D.cards.get(id);
    if (!entry) return;
    const edits = gChanged(GV.frames[GV.pick] || {
      edits: new Map
    });
    const note = GV.el.querySelector('[data-gnote]').value.trim();
    if (!note) return;
    if (D.order[0] !== id) {
      toast('Bring that card to the top to send it');
      return;
    }
    const parts = [];
    if (edits.length) {
      parts.push(`Edit the graphic. The editor changed this text directly on the infographic${G_N > 1 ? ` (they are building version #${GV.pick + 1} of the ${G_N} shown side by side)` : ''} - apply each change exactly, character for character, and leave everything else on the graphic as it is:`);
      edits.forEach(((x, k) => parts.push(`${k + 1}. "${x.before}" -> "${x.after}"`)));
    }
    if (note) parts.push(edits.length ? `\nEditor's note: ${note}` : note);
    closeGraphicView();
    entry.compose = parts.join('\n').slice(0, 3900);
    entry.graphicSend = true;
    sendFeedback(id);
  }
  async function renderCardPreview(el, id) {
    const draft = loadGraphicDraft(id);
    const edits = draft?.edits?.[draft.pick] || {};
    const want = draft && (draft.pick || Object.keys(edits).length) ? `${draft.pick}:${JSON.stringify(edits)}` : '';
    for (const fig of el.querySelectorAll('figure.dd-graphic')) {
      if ((fig.dataset.preview || '') === want) continue;
      fig.dataset.preview = want;
      fig.querySelector('.dd-gprev')?.remove();
      fig.classList.remove('dd-gprev-on');
      if (!want) continue;
      try {
        const r = await fetch(`/api/dailies/${id}/graphic-html?v=${draft.pick}`);
        if (!r.ok || fig.dataset.preview !== want) continue;
        const html = await r.text();
        const box = document.createElement('div');
        box.className = 'dd-gprev';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin');
        iframe.setAttribute('tabindex', '-1');
        iframe.addEventListener('load', (() => {
          const doc = iframe.contentDocument;
          const scratch = {
            edits: new Map
          };
          setupGraphicEditing(iframe, scratch);
          GV.restoring = true;
          for (const [gid, x] of Object.entries(edits)) {
            let node = doc.querySelector(`[data-gid="${gid}"]`);
            if (!node || node.dataset.gorig !== x.before) node = [ ...doc.querySelectorAll('[data-gid]') ].find((n => n.dataset.gorig === x.before)) || null;
            if (node) gSetText(node, x.after);
          }
          GV.restoring = false;
          doc.querySelectorAll('[contenteditable]').forEach((n => n.removeAttribute('contenteditable')));
          const fit = () => {
            iframe.style.transform = `scale(${box.clientWidth / 1080})`;
          };
          fit();
          new ResizeObserver(fit).observe(box);
          fig.classList.add('dd-gprev-on');
        }), {
          once: true
        });
        iframe.srcdoc = html;
        box.appendChild(iframe);
        const tag = document.createElement('span');
        tag.className = 'dd-gprev-tag';
        tag.textContent = `#${draft.pick + 1}${Object.keys(edits).length ? ' · edited' : ''}`;
        box.appendChild(tag);
        fig.appendChild(box);
      } catch {}
    }
  }
  let emailTemplate = null;
  const EV = {
    el: null,
    id: null
  };
  function ensureEmailView() {
    if (EV.el) return EV.el;
    const el = document.createElement('div');
    el.className = 'dd-eview';
    el.hidden = true;
    el.innerHTML = `<div class="dd-eview-bar"><strong>Email preview</strong><span data-ev-note></span><button type="button" class="dd-gview-close" data-ev-close>Close</button></div>\n      <div class="dd-eview-scroll" data-ev-scroll><div class="dd-eview-col" data-ev-col></div></div>`;
    ($('#ddOverlay') || document.body).appendChild(el);
    el.querySelector('[data-ev-close]').addEventListener('click', closeEmailView);
    el.addEventListener('click', (e => {
      if (e.target.matches('[data-ev-scroll]')) closeEmailView();
    }));
    EV.el = el;
    return el;
  }
  function closeEmailView() {
    if (!EV.el || EV.el.hidden) return;
    EV.el.hidden = true;
    EV.el.querySelector('[data-ev-col]').innerHTML = '';
    EV.id = null;
  }
  const emailInline = s => esc(s).replace(/\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#222222;text-decoration:underline;">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>').replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
  function fillEmail(doc, c, d) {
    const findP = start => [ ...doc.querySelectorAll('p, h3') ].find((n => n.textContent.trim().startsWith(start)));
    const row = n => n?.closest('tr');
    doc.title = c.name || 'Daily';
    const intro = findP('[OPTIONAL INTRO');
    if (intro) {
      const box = intro.closest('td[style*="border-width"]');
      (box?.closest('table')?.closest('tr') || row(intro))?.remove();
    }
    const gp = findP('[INSERT INFOGRAPHIC');
    if (gp) {
      const box = doc.createElement('div');
      box.className = 'ev-graphic';
      box.style.cssText = 'position:relative;width:100%;aspect-ratio:1080/1350;overflow:hidden;border-radius:4px;background:#FFFAF3;';
      gp.replaceWith(box);
      mountEmailGraphic(box, c);
    }
    const caps = [ ...doc.querySelectorAll('p') ].filter((n => /^\[caption line/.test(n.textContent.trim())));
    if (caps.length) {
      const lines = String(c.sections.description.text || '').split('\n').filter((l => l.trim()));
      lines.forEach((l => {
        const p = caps[0].cloneNode(false);
        p.innerHTML = emailInline(l);
        caps[0].before(p);
      }));
      caps.forEach((n => n.remove()));
    }
    const pp = findP('[POLL');
    if (pp) {
      const poll = parsePoll(String(c.sections.poll.text || ''));
      const wrap = doc.createElement('div');
      wrap.style.fontFamily = doc.defaultView.getComputedStyle(pp).fontFamily;
      wrap.style.color = doc.defaultView.getComputedStyle(pp).color;
      wrap.innerHTML = poll ? `<p style="margin:0 0 12px;font-weight:700;">${esc(poll.question)}</p>${poll.options.map((o => `<div style="border:1px solid #222222;border-radius:8px;padding:10px 14px;margin:0 0 8px;text-align:center;font-size:15px;">${esc(o)}</div>`)).join('')}` : `<p style="color:#999">No poll on this Daily.</p>`;
      pp.replaceWith(wrap);
    }
    const rh = findP('Mini Rabbit Hole');
    if (rh) {
      rh.innerHTML = '<b>Rabbit Hole</b>';
      const ul = row(rh)?.nextElementSibling?.querySelector('ul');
      const tpl = ul?.querySelector('li');
      if (ul && tpl) {
        const items = String(c.sections.rabbitHole.text || '').split('\n').map((l => l.replace(/^\s*[-*•]\s+/, '').trim())).filter(Boolean);
        ul.innerHTML = '';
        items.forEach((t => {
          const li = tpl.cloneNode(true);
          li.querySelector('p').innerHTML = emailInline(t);
          ul.appendChild(li);
        }));
      }
    }
    doc.querySelectorAll('a[href]').forEach((a => {
      a.target = '_blank';
      a.rel = 'noopener';
    }));
  }
  async function mountEmailGraphic(box, c) {
    const draft = loadGraphicDraft(c.id);
    const pick = draft?.pick || 0;
    const edits = draft?.edits?.[pick] || {};
    const doc = box.ownerDocument;
    const useLive = pick || Object.keys(edits).length;
    if (!useLive) {
      if (c.image) box.innerHTML = `<img src="${esc(c.image)}" alt="" style="display:block;width:100%;height:auto;">`;
      box.style.aspectRatio = 'auto';
      return;
    }
    try {
      const r = await fetch(`/api/dailies/${c.id}/graphic-html?v=${pick}`);
      if (!r.ok) throw new Error;
      const html = await r.text();
      const iframe = doc.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-same-origin');
      iframe.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1350px;border:0;transform-origin:0 0;';
      iframe.addEventListener('load', (() => {
        const g = iframe.contentDocument;
        const scratch = {
          edits: new Map
        };
        setupGraphicEditing(iframe, scratch);
        GV.restoring = true;
        for (const [gid, x] of Object.entries(edits)) {
          let node = g.querySelector(`[data-gid="${gid}"]`);
          if (!node || node.dataset.gorig !== x.before) node = [ ...g.querySelectorAll('[data-gid]') ].find((n => n.dataset.gorig === x.before)) || null;
          if (node) gSetText(node, x.after);
        }
        GV.restoring = false;
        g.querySelectorAll('[contenteditable]').forEach((n => n.removeAttribute('contenteditable')));
        iframe.style.transform = `scale(${box.clientWidth / 1080})`;
      }), {
        once: true
      });
      iframe.srcdoc = html;
      box.appendChild(iframe);
    } catch {
      if (c.image) {
        box.innerHTML = `<img src="${esc(c.image)}" alt="" style="display:block;width:100%;height:auto;">`;
        box.style.aspectRatio = 'auto';
      }
    }
  }
  function emailSocialHtml(c) {
    const split = text => {
      const parts = String(text || '').split(/\n?\*\*(?:Reply|Self-comment)(?: \d+)?:\*\*\s*/);
      return {
        post: parts[0].trim(),
        replies: parts.slice(1).map((t => t.replace(/\nComment image:.*$/s, '').trim())).filter(Boolean)
      };
    };
    const x = split(c.sections.xPost.text), li = split(c.sections.liPost.text);
    const media = c.image ? `<div class="dd-post-media"><img src="${esc(c.image)}" alt="" draggable="false"></div>` : '';
    return `<div class="dd-eview-social">\n      <div class="dd-post dd-post-li" data-device="${liDevice}">\n        <header>${PFP()}<div><strong>Strategy Breakdowns</strong><em>Newsletter · now</em></div>${brandLogo('li', LI_LOGO, 30)}</header>\n        <div class="dd-md" data-ev-fold="li" data-text="${esc(plainText(li.post))}"></div>${media}\n        <div class="dd-libar" aria-hidden="true"><span>${ICON.thumb}Like</span><span>${ICON.reply}Comment</span><span>${ICON.repost}Repost</span><span>${ICON.send}Send</span></div>\n        ${li.replies.map((r => `<div class="dd-reply dd-reply-li">${PFP('dd-pfp-sm')}<div class="dd-reply-body"><div class="dd-comment"><div class="dd-comment-head"><strong>Strategy Breakdowns</strong><span class="dd-author">Author</span><time>now</time></div><div class="dd-comment-sub">Newsletter</div><div class="dd-md dd-reply-text">${mdHtml(r)}</div></div><div class="dd-comment-actions" aria-hidden="true"><span>Like</span><i>·</i><span>Reply</span></div></div></div>`)).join('')}\n      </div>\n      <div class="dd-post dd-post-x">\n        <header>${PFP()}<div><strong>Strategy Breakdowns</strong><em>X post · now</em></div>${brandLogo('x', X_LOGO, 30)}</header>\n        <div class="dd-md" data-ev-fold="x" data-text="${esc(plainText(x.post))}"></div>${media}\n        <div class="dd-xbar" aria-hidden="true">${ICON.reply}${ICON.repost}${ICON.heart}${ICON.views}${ICON.share}</div>\n        ${x.replies.map((r => `<div class="dd-reply dd-reply-x"><div class="dd-thread">${PFP()}</div><div class="dd-reply-body"><div class="dd-reply-head"><strong>Strategy Breakdowns</strong><span>· now</span></div><div class="dd-md dd-reply-text">${mdHtml(r)}</div><div class="dd-xbar dd-xbar-sm" aria-hidden="true">${ICON.reply}${ICON.repost}${ICON.heart}${ICON.views}${ICON.share}</div></div></div>`)).join('')}\n      </div>\n    </div>`;
  }
  async function openEmailPreview(id) {
    const entry = D.cards.get(id);
    if (!entry) return;
    const el = ensureEmailView();
    EV.id = id;
    const col = el.querySelector('[data-ev-col]');
    col.innerHTML = '<p class="dd-eview-loading">Saving your picks and building the email…</p>';
    el.hidden = false;
    try {
      await flush(id);
      const c = entry.server;
      if (EV.id !== id) return;
      emailTemplate ||= await (await fetch('daily-email-template.html')).text();
      const d = c.versions;
      const subjects = d ? d.picks.subjects.map((([v, i]) => d.subjects[v][i])) : [ c.subject || c.name ];
      const preview = d ? d.preview[d.picks.preview] : '';
      el.querySelector('[data-ev-note]').textContent = c.socialsReady ? 'Email, then the LinkedIn and X posts' : 'Email only - LinkedIn and X are marked not ready';
      col.innerHTML = `<div class="dd-eview-inbox">\n          <img class="dd-avatar" src="logo.png" alt="">\n          <div><div class="dd-eview-from"><strong>Strategy Breakdowns</strong><span>${subjects.length > 1 ? `A/B test · ${subjects.length} subject lines` : 'Inbox'}</span></div>\n          ${subjects.map(((t, k) => `<div class="dd-eview-subj"><b>${'ABCD'[k]}</b><span>${esc(t)}</span>${k === 0 && subjects.length > 1 ? '<i>control</i>' : ''}</div>`)).join('')}\n          ${preview ? `<div class="dd-eview-prev">${esc(preview)}</div>` : ''}</div>\n        </div>\n        <iframe class="dd-eview-email" data-ev-email title="Email preview"></iframe>\n        ${c.socialsReady ? emailSocialHtml(c) : ''}`;
      const frame = col.querySelector('[data-ev-email]');
      frame.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox');
      frame.addEventListener('load', (() => {
        const doc = frame.contentDocument;
        fillEmail(doc, c, d);
        const fit = () => {
          frame.style.height = doc.documentElement.scrollHeight + 'px';
        };
        fit();
        doc.querySelectorAll('img').forEach((i => i.addEventListener('load', fit)));
        setTimeout(fit, 800);
        setTimeout(fit, 2600);
      }), {
        once: true
      });
      frame.srcdoc = emailTemplate;
      col.querySelectorAll('[data-ev-fold]').forEach((md => renderFold(md, md.dataset.text, md.dataset.evFold === 'x', 'data-ev-more')));
      col.addEventListener('click', (e => {
        const more = e.target.closest('[data-ev-more]');
        if (!more) return;
        const md = more.closest('[data-ev-fold]');
        md.dataset.expanded = '1';
        renderFold(md, md.dataset.text, md.dataset.evFold === 'x', 'data-ev-more');
      }));
    } catch (e) {
      col.innerHTML = `<p class="dd-eview-loading">Couldn't build the preview: ${esc(e.message)}</p>`;
    }
  }
  function wireGraphicClick(el, id) {
    el.querySelectorAll('figure.dd-graphic').forEach((fig => {
      let down = null;
      fig.addEventListener('pointerdown', (e => {
        down = {
          x: e.clientX,
          y: e.clientY
        };
      }));
      fig.addEventListener('click', (e => {
        if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
        if (el.dataset.depth !== '0') return;
        openGraphicView(id);
      }));
      fig.title = 'Open the graphic full screen to edit it';
    }));
  }
  function buildCard(id) {
    const entry = D.cards.get(id);
    if (entry.server.versions && !entry.v?.dirty) entry.v = {
      ...entry.v || {},
      data: clone(entry.server.versions),
      dirty: false
    };
    const versioned = !!(entry.server.versions && entry.v);
    const c = entry.server;
    const S = c.sections;
    const v = k => fieldValue(entry, 'sec:' + k);
    const graphic = c.image ? `<img src="${esc(c.image)}" alt="" draggable="false" decoding="async">` : '<div class="dd-noimg">No graphic on the page</div>';
    const el = document.createElement('article');
    el.className = 'dd-card';
    el.dataset.id = id;
    el.innerHTML = `\n      <div class="dd-cardbar" data-drag>\n        <span class="dd-lights" aria-hidden="true"><i></i><i></i><i></i></span>\n        ${c.company ? `<span class="dd-chip">${esc(c.company)}</span>` : ''}\n        ${c.sponsored ? '<span class="dd-chip dd-chip-sponsor">Sponsored</span>' : ''}\n        ${(() => {
      const gap = SECTION_META.filter((m => c.sections[m.key].missing || !c.sections[m.key].text.trim())).map((m => m.label));
      return gap.length ? `<span class="dd-chip dd-chip-warn" title="The pipeline left these out. &quot;ok now rebuild everything&quot; writes them.">Incomplete: ${esc(gap.join(', '))}</span>` : '';
    })()}\n        <span class="dd-save" data-save></span>\n        <button type="button" class="dd-previewbtn" data-email-preview title="See the email as readers will get it, with every ticked pick">Preview email</button>\n        <button type="button" class="dd-firstedit" data-firstedit-toggle title="1st Edit Complete (Daily) in Notion: tick it once you have been through this Daily"><i></i>1st edit complete</button>\n        <a class="dd-notion" href="${esc(c.url)}" target="_blank" rel="noopener">Open in Notion</a>\n      </div>\n      ${composeHtml(entry)}\n      ${versioned ? versionsCardHtml(entry) : `<div class="dd-scroll">\n        <div class="dd-cols">\n          <div class="dd-mail">\n            <div class="dd-inbox">\n              <img class="dd-avatar" src="logo.png" alt="">\n              <div class="dd-inbox-main">\n                <div class="dd-inbox-from"><strong>Strategy Breakdowns</strong><span>Inbox</span></div>\n                <textarea class="dd-input dd-subject" rows="1" data-field="subject" placeholder="${esc(c.name)}" aria-label="Subject line">${esc(fieldValue(entry, 'subject'))}</textarea>\n                <div class="dd-slug" data-slug></div>\n              </div>\n            </div>\n            <div class="dd-paper">\n              <img class="dd-wordmark" src="brand/wordmark.png" alt="Strategy Breakdowns" draggable="false">\n              <div class="dd-adslot">2 sponsor slots, filled at migration</div>\n              <figure class="dd-graphic" data-drag>${graphic}</figure>\n              <div class="dd-section dd-caption" data-section="description">${mdField('description', S.description, v('description'))}</div>\n              <div class="dd-share">\n                <span>Send this chart to someone</span>\n                <div>${brandLogo('x', X_LOGO, 44)}${brandLogo('li', LI_LOGO, 44)}</div>\n              </div>\n              <hr>\n              ${pollBlock(S.poll, v('poll'))}\n              <hr>\n              <div class="dd-section" data-section="rabbitHole">\n                <h3>Rabbit Hole</h3>\n                ${mdField('rabbitHole', S.rabbitHole, v('rabbitHole'))}\n              </div>\n              <footer class="dd-mailfoot"><b>Strategy Breakdowns</b></footer>\n            </div>\n          </div>\n          <aside class="dd-social">\n            <div class="dd-socials-bar">${brandLogo('li', LI_LOGO, 20)}${brandLogo('x', X_LOGO, 20)}<span>LinkedIn &amp; X</span><button type="button" class="dd-socials-toggle" data-socials-toggle title="Socials Ready (Daily) in Notion"><i></i><span class="on">Ready to publish</span><span class="off">Not ready - skipped for now</span></button></div>\n            <div class="dd-post dd-post-x" data-section="xPost">\n              <header><img class="dd-pfp" src="icon-192.png" alt="Strategy Breakdowns"><div><strong>Strategy Breakdowns</strong><em>X post · now</em></div>${brandLogo('x', X_LOGO, 30)}</header>\n              ${mdField('xPost', S.xPost, v('xPost'))}\n              ${c.image ? `<div class="dd-post-media"><img src="${esc(c.image)}" alt="" draggable="false"></div>` : ''}\n              <div class="dd-post-foot"><span class="dd-count" data-count-for="sec:xPost"></span></div>\n              <div class="dd-xbar" aria-hidden="true">${ICON.reply}${ICON.repost}${ICON.heart}${ICON.views}${ICON.share}</div>\n              <div class="dd-reply dd-reply-x" data-reply hidden>\n                <div class="dd-thread"><img class="dd-pfp" src="icon-192.png" alt=""></div>\n                <div class="dd-reply-body">\n                  <div class="dd-reply-head"><strong>Strategy Breakdowns</strong><span>· now</span></div>\n                  <div class="dd-md dd-reply-text" data-reply-text tabindex="0" data-placeholder="Write the reply"></div>\n                  <div class="dd-xbar dd-xbar-sm" aria-hidden="true">${ICON.reply}${ICON.repost}${ICON.heart}${ICON.views}${ICON.share}</div>\n                </div>\n              </div>\n            </div>\n            <div class="dd-post dd-post-li" data-section="liPost">\n              <header><img class="dd-pfp" src="icon-192.png" alt="Strategy Breakdowns"><div><strong>Strategy Breakdowns</strong><em>Newsletter · now</em></div>${brandLogo('li', LI_LOGO, 30)}</header>\n              <div class="dd-device" role="group" aria-label="LinkedIn preview size"><button type="button" data-li-device="mobile">Mobile</button><button type="button" data-li-device="desktop">Desktop</button></div>\n              ${mdField('liPost', S.liPost, v('liPost'))}\n              ${c.image ? `<div class="dd-post-media"><img src="${esc(c.image)}" alt="" draggable="false"></div>` : ''}\n              <div class="dd-libar" aria-hidden="true"><span>${ICON.thumb}Like</span><span>${ICON.reply}Comment</span><span>${ICON.repost}Repost</span><span>${ICON.send}Send</span></div>\n              <div class="dd-reply dd-reply-li" data-reply hidden>\n                <img class="dd-pfp dd-pfp-sm" src="icon-192.png" alt="">\n                <div class="dd-reply-body">\n                  <div class="dd-comment">\n                    <div class="dd-comment-head"><strong>Strategy Breakdowns</strong><span class="dd-author">Author</span><time>now</time></div>\n                    <div class="dd-comment-sub">Newsletter</div>\n                    <div class="dd-md dd-reply-text" data-reply-text tabindex="0" data-placeholder="Write the comment"></div>\n                  </div>\n                  <div class="dd-comment-actions" aria-hidden="true"><span>Like</span><i>·</i><span>Reply</span></div>\n                </div>\n              </div>\n            </div>\n          </aside>\n        </div>\n      </div>`}\n      <div class="dd-stamp dd-stamp-right">MIGRATE</div>\n      <div class="dd-stamp dd-stamp-left">ARCHIVE</div>\n      <div class="dd-stamp dd-stamp-up">LATER</div>`;
    if (versioned) el.classList.add('dd-versioned');
    el.classList.toggle('dd-socials-off', !entry.server.socialsReady);
    el.classList.toggle('dd-firstedit-on', !!entry.server.firstEdit);
    wireCard(el, id);
    if (versioned) wireVersions(el, id);
    wireGraphicClick(el, id);
    renderCardPreview(el, id);
    return el;
  }
  function wireCard(el, id) {
    const entry = D.cards.get(id);
    el.addEventListener('click', (e => {
      if (e.target.closest('[data-email-preview]')) {
        e.preventDefault();
        openEmailPreview(id);
      }
    }));
    const flags = {
      socialsReady: {
        sel: '[data-socials-toggle]',
        paint: on => el.classList.toggle('dd-socials-off', !on),
        after: on => {
          if (on) requestAnimationFrame((() => {
            vPaintFolds(el);
            repaintSocial(el);
          }));
        }
      },
      firstEdit: {
        sel: '[data-firstedit-toggle]',
        paint: on => el.classList.toggle('dd-firstedit-on', on),
        after: on => {
          const leaves = D.deck === 'cold' && on || D.deck === 'warm' && !on;
          if (leaves && D.order[0] === id) {
            flush(id);
            D.order.shift();
            D.parked.push(id);
            if (el) {
              clearTints(el);
              flyOut(el, on ? 'right' : 'up', {
                dx: on ? 40 : 0,
                dy: on ? 0 : -30
              });
            }
            layout();
            toast(on ? `To the warm deck · ${entry.server.name}` : `Back to the cold deck · ${entry.server.name}`, {
              tone: 'good',
              action: {
                label: 'Undo',
                run: () => {
                  const btn = D.els.get(id)?.querySelector('[data-firstedit-toggle]');
                  D.parked = D.parked.filter((x => x !== id));
                  D.order.unshift(id);
                  layout();
                  (D.els.get(id)?.querySelector('[data-firstedit-toggle]') || btn)?.click();
                }
              }
            });
          } else if (on) toast(`1st edit complete · ${entry.server.name}`, {
            tone: 'good'
          });
          renderSide();
          renderChrome();
        }
      }
    };
    el.addEventListener('click', (async e => {
      const key = Object.keys(flags).find((k => e.target.closest(flags[k].sel)));
      if (!key) return;
      e.preventDefault();
      const f = flags[key];
      const next = !entry.server[key];
      entry.server[key] = next;
      f.paint(next);
      f.after(next);
      try {
        const {card: card} = await api('PATCH', `/api/dailies/${id}/fields`, {
          [key]: next
        });
        entry.server[key] = card[key];
        f.paint(!!card[key]);
      } catch (err) {
        entry.server[key] = !next;
        f.paint(!next);
        renderSide();
        toast(`Couldn't save that to Notion: ${err.message}`, {
          tone: 'error'
        });
      }
    }));
    const onInput = (key, value) => {
      entry.draft[key] = value;
      entry.dirty.add(key);
      paintSaveState(id);
      scheduleSave(id, key);
    };
    const compose = $('[data-compose]', el);
    const composeText = $('[data-compose-text]', el);
    const paintCompose = () => {
      const empty = !composeText.value.trim();
      compose.querySelector('[data-compose-send]').disabled = empty;
      compose.querySelector('[data-compose-archive]').disabled = empty;
    };
    compose.addEventListener('submit', (e => {
      e.preventDefault();
      sendFeedback(id);
    }));
    compose.querySelector('[data-compose-archive]').addEventListener('click', (() => archiveWithReason(id)));
    composeText.addEventListener('input', (() => {
      entry.compose = composeText.value;
      if (entry.feedback && entry.feedback.tone === 'good') {
        entry.feedback = null;
        $('[data-compose-reply]', el)?.remove();
      }
      paintCompose();
    }));
    composeText.addEventListener('keydown', (e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        e.shiftKey ? archiveWithReason(id) : sendFeedback(id);
      }
    }));
    el.addEventListener('input', (e => {
      const t = e.target;
      if (t.matches('textarea')) autosize(t);
      if (t.matches('[data-compose-text]')) return;
      const live = t.closest && t.closest('.dd-md.dd-live, .dd-md[contenteditable="true"]');
      if (live) {
        const sec = live.closest('[data-section]');
        const md = sec.querySelector('.dd-md:not(.dd-reply-text)');
        const ta = md.nextElementSibling;
        ta.value = md.classList.contains('dd-live') ? socialValue(sec) : domToMd(md);
        onInput(ta.dataset.field, ta.value);
      } else if (t.dataset.field) onInput(t.dataset.field, t.value); else if (t.closest('[data-poll]')) onInput('sec:poll', readPoll(el));
      paintCounts(el);
    }));
    el.addEventListener('focusout', (e => {
      const t = e.target;
      if (t.matches('.dd-md')) {
        const sec = t.closest('[data-section]');
        setTimeout((() => {
          if (sec.contains(document.activeElement)) return;
          if (document.activeElement?.closest?.('.dd-linkpop')) return;
          const md = sec.querySelector('.dd-md:not(.dd-reply-text)');
          const ta = md.nextElementSibling;
          sec.querySelectorAll('.dd-live').forEach((n => {
            n.classList.remove('dd-live');
            n.removeAttribute('contenteditable');
          }));
          sec.classList.remove('dd-editing');
          delete md.dataset.expanded;
          paintPreview(md, ta.value);
          if (entry.dirty.has(ta.dataset.field)) scheduleSave(id, ta.dataset.field, true);
        }), 0);
        return;
      }
      const key = t.dataset.field || (t.closest('[data-poll]') ? 'sec:poll' : null);
      if (key && entry.dirty.has(key)) scheduleSave(id, key, true);
    }));
    el.addEventListener('paste', (e => {
      if (!e.target.closest || !e.target.closest('.dd-md[contenteditable="true"]')) return;
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    }));
    el.addEventListener('keydown', (e => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const t = e.target;
      if (t.matches('[data-poll-opt]')) {
        e.preventDefault();
        t.closest('li').insertAdjacentHTML('afterend', pollOptHtml(''));
        t.closest('li').nextElementSibling.querySelector('input').focus();
      } else if (t.matches('[data-field="subject"], [data-field="name"], [data-poll-q]')) {
        e.preventDefault();
        t.blur();
      }
    }));
    const editSocial = (sec, focusReply, at) => {
      const md = sec.querySelector('.dd-md:not(.dd-reply-text)');
      if (!md || md.hasAttribute('data-locked') || md.classList.contains('dd-live')) return;
      const ta = md.nextElementSibling;
      const {post: post, reply: reply, label: label} = splitReply(ta.value);
      sec.dataset.replyLabel = label || (md.dataset.mdFor === 'sec:xPost' ? 'Reply' : 'Self-comment');
      md.classList.add('dd-live');
      md.setAttribute('contenteditable', PLAIN);
      md.textContent = plainText(post);
      const replyEl = sec.querySelector('[data-reply]');
      const replyText = sec.querySelector('[data-reply-text]');
      if (replyEl && replyText) {
        replyEl.hidden = false;
        replyText.classList.add('dd-live');
        replyText.setAttribute('contenteditable', PLAIN);
        replyText.textContent = plainText(reply);
      }
      sec.classList.add('dd-editing');
      const target = focusReply && replyText ? replyText : md;
      target.focus();
      placeCaret(target, at);
    };
    el.addEventListener('focusin', (e => {
      const t = e.target;
      if (t.matches('.dd-md[tabindex]') && !t.classList.contains('dd-live')) editSocial(t.closest('[data-section]'), t.matches('[data-reply-text]'));
      if (t.matches('.dd-md[contenteditable="true"]')) {
        try {
          document.execCommand('defaultParagraphSeparator', false, 'p');
        } catch {}
        if (t.querySelector('.dd-md-empty')) t.innerHTML = '<p><br></p>';
      }
    }));
    el.addEventListener('click', (e => {
      const moreBtn = e.target.closest('[data-more]');
      if (moreBtn) {
        const md = moreBtn.closest('.dd-md');
        md.dataset.expanded = '1';
        paintPreview(md, md.nextElementSibling.value);
        return;
      }
      const dev = e.target.closest('[data-li-device]');
      if (dev) {
        liDevice = dev.dataset.liDevice;
        try {
          localStorage.setItem('ddLiDevice', liDevice);
        } catch {}
        document.querySelectorAll('.dd-card').forEach((c => {
          paintDevice(c);
          repaintSocial(c);
          vPaintFolds(c);
        }));
        return;
      }
      const socialMd = e.target.closest('[data-md-for="sec:xPost"], [data-md-for="sec:liPost"], [data-reply-text]');
      if (socialMd && !socialMd.classList.contains('dd-live') && !e.target.closest('a')) {
        editSocial(socialMd.closest('[data-section]'), socialMd.matches('[data-reply-text]'), {
          x: e.clientX,
          y: e.clientY
        });
        return;
      }
      const add = e.target.closest('[data-poll-add]');
      const del = e.target.closest('[data-poll-del]');
      if (add) {
        const ol = add.previousElementSibling;
        ol.insertAdjacentHTML('beforeend', pollOptHtml(''));
        ol.lastElementChild.querySelector('input').focus();
      } else if (del) {
        del.closest('li').remove();
        onInput('sec:poll', readPoll(el));
        scheduleSave(id, 'sec:poll', true);
      }
    }));
    attachDrag(el, id);
    paintCompose();
    requestAnimationFrame((() => {
      el.querySelectorAll('textarea').forEach(autosize);
      paintDevice(el);
      repaintSocial(el);
      paintCounts(el);
      paintSaveState(id);
    }));
  }
  const PLAIN = (() => {
    const d = document.createElement('div');
    d.contentEditable = 'plaintext-only';
    return d.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true';
  })();
  function domToMd(root) {
    const inline = node => [ ...node.childNodes ].map((n => {
      if (n.nodeType === 3) return n.nodeValue.replace(/\n/g, ' ');
      if (n.nodeType !== 1) return '';
      const tag = n.tagName, inner = inline(n);
      if (tag === 'BR') return '\u2028';
      if (!inner.trim()) return inner;
      if (tag === 'STRONG' || tag === 'B') return `**${inner}**`;
      if (tag === 'EM' || tag === 'I') return `*${inner}*`;
      if (tag === 'CODE') return '`' + inner + '`';
      if (tag === 'U') return `<u>${inner}</u>`;
      if (tag === 'A' && n.getAttribute('href')) return `[${inner}](${n.getAttribute('href')})`;
      return inner;
    })).join('');
    const tidy = t => t.replace(/\u2028+$/, '').replace(/\u00a0/g, ' ');
    const lines = [];
    for (const n of root.childNodes) {
      if (n.nodeType === 3) {
        if (n.nodeValue.trim()) lines.push(tidy(n.nodeValue));
        continue;
      }
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'UL' || n.tagName === 'OL') {
        n.querySelectorAll(':scope > li').forEach((li => lines.push((n.tagName === 'UL' ? '- ' : '1. ') + tidy(inline(li)))));
      } else if (n.tagName === 'BLOCKQUOTE') lines.push('> ' + tidy(inline(n))); else if (!n.classList.contains('dd-md-empty')) {
        const t = tidy(inline(n));
        lines.push(t.trim() ? t : '');
      }
    }
    return lines.join('\n').replace(/\n+$/, '');
  }
  function socialValue(sec) {
    const toMd = t => String(t || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').trim().split(/\n[ \t]*\n+/).map((par => par.split('\n').map((l => l.trimEnd())).join('\u2028'))).join('\n');
    const md = sec.querySelector('.dd-md:not(.dd-reply-text)');
    const replyText = sec.querySelector('[data-reply-text]');
    const post = toMd(md.innerText);
    const reply = replyText ? toMd(replyText.innerText) : '';
    return reply ? `${post}\n**${sec.dataset.replyLabel || 'Reply'}:** ${reply}` : post;
  }
  function placeCaret(target, at) {
    let range = null;
    if (at) {
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(at.x, at.y); else if (document.caretPositionFromPoint) {
        const p = document.caretPositionFromPoint(at.x, at.y);
        if (p) {
          range = document.createRange();
          range.setStart(p.offsetNode, p.offset);
        }
      }
      if (range && !target.contains(range.startContainer)) range = null;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  const slugify = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  function paintDevice(el) {
    el.querySelectorAll('[data-li-device]').forEach((b => b.setAttribute('aria-pressed', String(b.dataset.liDevice === liDevice))));
    el.querySelectorAll('.dd-post-li').forEach((li => {
      li.dataset.device = liDevice;
    }));
  }
  function readPoll(el) {
    const qEl = $('[data-poll-q]', el);
    const optEls = [ ...el.querySelectorAll('[data-poll-opt]') ];
    return serializePoll(qEl.value, optEls.map((i => i.value)), qEl.dataset.wrap || '', optEls.map((i => i.dataset.wrap || '')));
  }
  function autosize(t) {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  }
  const visibleLen = s => s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*|\*|`/g, '').length;
  function paintCounts(el) {
    el.querySelectorAll('[data-count-for]').forEach((n => {
      const meta = SECTION_META.find((m => 'sec:' + m.key === n.dataset.countFor));
      const ta = el.querySelector(`[data-field="${n.dataset.countFor}"]`);
      if (!ta || !meta) return;
      const social = meta.key === 'xPost' || meta.key === 'liPost';
      const len = social ? plainText(splitReply(ta.value).post).length : visibleLen(ta.value);
      n.textContent = `${len.toLocaleString()} / ${meta.limit.toLocaleString()}`;
      n.classList.toggle('over', len > meta.limit);
    }));
    const slugEl = el.querySelector('[data-slug]');
    const card = D.cards.get(el.dataset.id);
    if (slugEl && card) slugEl.textContent = 'sbdash.demo/p/' + slugify(fieldValue(card, 'name'));
  }
  function paintSaveState(id) {
    const el = D.els.get(id);
    const entry = D.cards.get(id);
    if (!el || !entry) return;
    const n = $('[data-save]', el);
    let text = 'Synced with Notion', cls = 'ok';
    if (entry.saving) {
      text = 'Saving…';
      cls = 'busy';
    } else if (entry.error) {
      text = 'Save failed - retrying on next edit';
      cls = 'err';
    } else if (entry.dirty.size || entry.v?.dirty) {
      text = 'Editing…';
      cls = 'busy';
    }
    n.textContent = text;
    n.className = 'dd-save ' + cls;
  }
  function syncFieldsToDom(id, flashChanges) {
    const el = D.els.get(id);
    const entry = D.cards.get(id);
    if (!el || !entry) return;
    const focused = document.activeElement;
    const set = (node, val) => {
      if (!node || node === focused || node.value === val) return;
      node.value = val;
      if (node.matches('textarea')) autosize(node);
      if (node.matches('.dd-md-src')) {
        const sec = node.closest('[data-section]');
        if (sec && sec.contains(document.activeElement)) return;
        paintPreview(node.previousElementSibling, val);
      }
      if (flashChanges) {
        node.classList.remove('dd-flash');
        void node.offsetWidth;
        node.classList.add('dd-flash');
      }
    };
    for (const key of [ 'subject', 'name', ...SECTION_META.map((m => 'sec:' + m.key)) ]) {
      if (entry.dirty.has(key)) continue;
      const val = fieldValue(entry, key);
      if (key === 'sec:poll') {
        const box = $('[data-poll]', el);
        if (box && box.contains(focused)) continue;
        const parsed = parsePoll(val);
        if (box && parsed && readPoll(el) !== serializePoll(parsed.question, parsed.options, parsed.qWrap, parsed.optWraps)) {
          set($('[data-poll-q]', el), parsed.question);
          $('[data-poll-q]', el).dataset.wrap = parsed.qWrap || '';
          $('.dd-poll-opts', el).innerHTML = parsed.options.map(((o, i) => pollOptHtml(o, parsed.optWraps[i]))).join('');
          if (flashChanges) box.classList.add('dd-flash');
        }
        continue;
      }
      set(el.querySelector(`[data-field="${key}"]`), val);
    }
    const chip = $('.dd-chip-status', el);
    if (chip) chip.textContent = STATUS_SHORT[entry.server.status] || entry.server.status || '';
    paintCounts(el);
  }
  const SESSION = Math.random().toString(36).slice(2, 10);
  const VIEW = {
    id: null,
    since: 0
  };
  function beacon(id, body) {
    const data = JSON.stringify({
      ...body,
      session: SESSION
    });
    try {
      if (navigator.sendBeacon?.(`/api/dailies/${id}/telemetry`, new Blob([ data ], {
        type: 'application/json'
      }))) return;
    } catch {}
    fetch(`/api/dailies/${id}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data,
      keepalive: true
    }).catch((() => {}));
  }
  function endView() {
    if (VIEW.id && VIEW.since) beacon(VIEW.id, {
      kind: 'view',
      ms: Date.now() - VIEW.since
    });
    VIEW.id = null;
    VIEW.since = 0;
  }
  function trackView() {
    const top = D.open && !document.hidden ? D.order[0] || null : null;
    if (top === VIEW.id) return;
    endView();
    if (top) {
      VIEW.id = top;
      VIEW.since = Date.now();
    }
  }
  document.addEventListener('visibilitychange', trackView);
  window.addEventListener('pagehide', endView);
  function layout() {
    trackView();
    const stage = $('#ddStage');
    if (!stage) return;
    const top = D.order.slice(0, STACK_DEPTH);
    for (const [id, el] of D.els) {
      if (!top.includes(id)) {
        el.remove();
        D.els.delete(id);
      }
    }
    top.forEach(((id, depth) => {
      let el = D.els.get(id);
      if (!el) {
        el = buildCard(id);
        el.classList.add('dd-enter');
        D.els.set(id, el);
        stage.appendChild(el);
        requestAnimationFrame((() => requestAnimationFrame((() => el.classList.remove('dd-enter')))));
      }
      el.dataset.depth = String(depth);
      el.inert = depth !== 0;
      if (el.classList.contains('dd-from-pile')) return;
      el.style.zIndex = String(10 - depth);
      if (!el.classList.contains('dd-dragging')) el.style.transform = '';
    }));
    D.order.slice(STACK_DEPTH, STACK_DEPTH + 3).forEach((id => {
      const src = D.cards.get(id)?.server.image;
      if (src) {
        const i = new Image;
        i.src = src;
      }
    }));
    renderChrome();
    updateBadge();
  }
  function attachDrag(el, id) {
    const handle = el;
    let start = null, raf = 0, last = null, samples = [];
    const interactive = t => t.closest('input, textarea, button, a, select, label, [contenteditable], [data-vedit], [data-vfold]');
    handle.addEventListener('pointerdown', (e => {
      if (el.dataset.depth !== '0' || e.button !== 0 || interactive(e.target)) return;
      if (e.pointerType !== 'mouse' && !e.target.closest('[data-drag]')) return;
      start = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        moved: false,
        pointerId: e.pointerId
      };
      samples = [ {
        x: e.clientX,
        y: e.clientY,
        t: start.t
      } ];
    }));
    handle.addEventListener('pointermove', (e => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 6) return;
      if (!start.moved) {
        start.moved = true;
        try {
          el.setPointerCapture(start.pointerId);
        } catch {}
        el.classList.add('dd-dragging');
        document.activeElement?.blur?.();
      }
      last = {
        dx: dx,
        dy: dy
      };
      samples.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now()
      });
      if (samples.length > 6) samples.shift();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame((() => paintDrag(el, dx, dy)));
    }));
    const end = e => {
      if (!start) return;
      const wasMoved = start.moved;
      start = null;
      cancelAnimationFrame(raf);
      if (!wasMoved) return;
      const a = samples[0], b = samples[samples.length - 1];
      const dt = Math.max(1, b.t - a.t);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
      const {dx: dx, dy: dy} = last || {
        dx: 0,
        dy: 0
      };
      const w = el.offsetWidth;
      let dir = null;
      if (-dy > 110 && -dy > Math.abs(dx) * 1.1 || vy < -.7 && -dy > 40 && Math.abs(vy) > Math.abs(vx)) dir = 'up'; else if (dx > w * .25 || vx > .6 && dx > 40) dir = 'right'; else if (dx < -w * .25 || vx < -.6 && dx < -40) dir = 'left';
      el.classList.remove('dd-dragging');
      if (dir) commit(dir, {
        from: {
          dx: dx,
          dy: dy
        },
        velocity: {
          vx: vx,
          vy: vy
        }
      }); else springBack(el);
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
  function paintDrag(el, dx, dy) {
    const rot = dx / 22;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${rot}deg)`;
    const w = el.offsetWidth;
    const vertical = -dy > Math.abs(dx);
    const pr = vertical ? 0 : Math.max(0, Math.min(1, dx / (w * .25)));
    const pl = vertical ? 0 : Math.max(0, Math.min(1, -dx / (w * .25)));
    const pu = vertical ? Math.max(0, Math.min(1, -dy / 110)) : 0;
    el.style.setProperty('--p-right', pr);
    el.style.setProperty('--p-left', pl);
    el.style.setProperty('--p-up', pu);
    const ov = $('#ddOverlay');
    ov.style.setProperty('--tint-right', pr * .5);
    ov.style.setProperty('--tint-left', pl * .5);
    ov.style.setProperty('--tint-up', pu * .5);
    const next = D.els.get(D.order[1]);
    if (next) next.style.setProperty('--lift', Math.min(1, Math.max(pr, pl, pu)));
  }
  function clearTints(el) {
    [ '--p-right', '--p-left', '--p-up' ].forEach((p => el.style.removeProperty(p)));
    const ov = $('#ddOverlay');
    [ '--tint-right', '--tint-left', '--tint-up' ].forEach((p => ov.style.removeProperty(p)));
    const next = D.els.get(D.order[1]);
    if (next) next.style.removeProperty('--lift');
  }
  function springBack(el) {
    el.classList.add('dd-spring');
    el.style.transform = '';
    clearTints(el);
    setTimeout((() => el.classList.remove('dd-spring')), 860);
  }
  function flyOut(el, dir, from, velocity) {
    D.els.forEach(((v, k) => {
      if (v === el) D.els.delete(k);
    }));
    el.inert = true;
    el.classList.remove('dd-dragging');
    el.classList.add('dd-flying', 'dd-fly-' + dir);
    const vw = window.innerWidth, vh = window.innerHeight;
    const fx = from?.dx || 0, fy = from?.dy || 0;
    let tx, ty, rot;
    if (dir === 'up') {
      tx = fx * 1.4;
      ty = -vh * 1.1;
      rot = fx / 30;
    } else {
      const sign = dir === 'right' ? 1 : -1;
      tx = sign * (vw * .75 + el.offsetWidth * .6);
      ty = fy + (velocity?.vy || 0) * 220 + 40;
      rot = sign * 22;
    }
    const speed = Math.hypot(velocity?.vx || 0, velocity?.vy || 0);
    const ms = Math.round(Math.max(REDUCED ? 140 : 420, FLY_MS - speed * 140));
    el.style.transition = `transform ${ms}ms cubic-bezier(.2,.75,.25,1), opacity ${ms}ms ease-in`;
    el.style.setProperty(`--p-${dir}`, 1);
    requestAnimationFrame((() => {
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg)`;
      el.style.opacity = '0';
    }));
    setTimeout((() => el.remove()), ms + 40);
  }
  function commit(dir, {from: from, velocity: velocity, reason: reason, slotIssueId: slotIssueId} = {}) {
    hideLink();
    const id = D.order[0];
    if (!id) return;
    const entry = D.cards.get(id);
    const el = D.els.get(id);
    if (dir === 'right' && !slotIssueId) {
      if (el) {
        clearTints(el);
        el.style.transform = '';
      }
      openSlotModal(id);
      return;
    }
    if (el) {
      clearTints(el);
      flyOut(el, dir, from, velocity);
    }
    const index = 0;
    D.order.shift();
    if (dir === 'up') D.order.push(id);
    const prev = {
      status: entry.server.status,
      migrate: entry.server.migrate
    };
    const h = {
      id: id,
      dir: dir,
      index: index,
      prev: prev,
      reason: reason,
      done: null,
      slotIssueId: slotIssueId || null
    };
    D.history.push(h);
    D.tally[dir]++;
    layout();
    const title = entry.server.name;
    const undoBtn = {
      label: 'Undo',
      run: undo
    };
    if (dir === 'up') beacon(id, {
      kind: 'defer'
    });
    if (dir === 'up') {
      toast(`${ACTION_COPY.up.verb} · ${title}`, {
        action: undoBtn,
        countdown: UNDO_MS
      });
      return;
    }
    h.done = flush(id).then((() => slotIssueId ? api('POST', '/api/daily-calendar/slot', {
      pageId: id,
      issueId: slotIssueId
    }) : api('POST', `/api/dailies/${id}/action`, {
      action: dir === 'right' ? 'migrate' : 'archive',
      ...reason ? {
        reason: reason
      } : {}
    }))).then((({card: card}) => {
      entry.server = card;
      CAL.data = null;
    })).catch((err => {
      D.history = D.history.filter((x => x !== h));
      D.tally[dir]--;
      D.order.unshift(id);
      layout();
      toast(`Couldn't update Notion - card is back on top. ${err.message}`, {
        tone: 'error'
      });
      throw err;
    }));
    toast(dir === 'right' ? `Slotted · the beehiiv draft builds in a few minutes` : `${ACTION_COPY.left.verb}${reason ? ' with your reason' : ''} · ${title}`, {
      action: undoBtn,
      tone: dir === 'right' ? 'good' : 'bad',
      countdown: UNDO_MS
    });
  }
  async function undo() {
    const h = D.history.pop();
    if (!h) return;
    const entry = D.cards.get(h.id);
    D.tally[h.dir]--;
    D.order = D.order.filter((x => x !== h.id));
    D.order.unshift(h.id);
    if (h.reason && !entry.compose) entry.compose = h.reason;
    const stage = $('#ddStage');
    const el = buildCard(h.id);
    el.classList.add('dd-return', 'dd-from-' + h.dir);
    D.els.set(h.id, el);
    stage.appendChild(el);
    layout();
    requestAnimationFrame((() => requestAnimationFrame((() => el.classList.remove('dd-from-' + h.dir)))));
    setTimeout((() => el.classList.remove('dd-return')), 800);
    if (h.dir === 'up') {
      toast('Undone');
      return;
    }
    try {
      await (h.done || Promise.resolve()).catch((() => {}));
      const {card: card} = h.slotIssueId ? await api('POST', '/api/daily-calendar/unslot', {
        pageId: h.id
      }) : await api('POST', `/api/dailies/${h.id}/action`, {
        action: 'restore',
        previous: h.prev
      });
      entry.server = card;
      syncFieldsToDom(h.id, false);
      toast(`Undone - back to ${STATUS_SHORT[h.prev.status] || h.prev.status}`);
    } catch (e) {
      toast(`Undo didn't reach Notion: ${e.message}`, {
        tone: 'error'
      });
    }
  }
  const SHRINK_MS = REDUCED ? 160 : 720;
  const RETURN_MS = REDUCED ? 160 : 950;
  const JOB_POLL_MS = 2e3;
  const STAGE_COPY = {
    reading: 'Reading the card',
    thinking: 'Claude is on it',
    writing: 'Saving to Notion',
    graphic: 'Re-rendering the graphic'
  };
  function composeHtml(entry) {
    const fb = entry.feedback;
    return `\n      <form class="dd-compose" data-compose>\n        ${fb ? `<div class="dd-compose-reply ${fb.tone}" data-compose-reply><b>${fb.tone === 'good' ? 'Done' : fb.tone === 'ask' ? 'Claude asks' : "Didn't land"}</b><span>${esc(fb.text)}</span></div>` : ''}\n        <div class="dd-compose-row">\n          <span class="dd-compose-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" fill="currentColor"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" fill="currentColor"/></svg></span>\n          <textarea class="dd-compose-text" rows="1" data-compose-text aria-label="Feedback for Claude" placeholder="Tell Claude what to change - say which piece: the graphic, X post, LinkedIn post, poll, subject line…">${esc(entry.compose || '')}</textarea>\n          <button type="submit" class="dd-compose-send" data-compose-send disabled title="Send the note to Claude to rewrite this card">Send <kbd>⌘↵</kbd></button>\n          <button type="button" class="dd-compose-archive" data-compose-archive disabled title="Archive this card, with the note saved as the reason">Archive <kbd>⇧⌘↵</kbd></button>\n        </div>\n      </form>`;
  }
  function archiveWithReason(id) {
    const entry = D.cards.get(id);
    const reason = (entry?.compose || '').trim();
    if (!reason || D.pending.has(id) || D.order[0] !== id) return;
    entry.compose = '';
    commit('left', {
      reason: reason
    });
  }
  async function sendFeedback(id) {
    const entry = D.cards.get(id);
    const el = D.els.get(id);
    const text = (entry?.compose || '').trim();
    if (!text || D.pending.has(id) || D.order[0] !== id) return;
    const form = el && $('[data-compose]', el);
    form?.classList.add('dd-sending');
    try {
      await flush(id);
      const {job: job} = await api('POST', `/api/dailies/${id}/feedback`, {
        text: text
      });
      entry.compose = '';
      entry.note = text;
      entry.feedback = null;
      D.pending.set(id, {
        jobId: job.id,
        stage: job.stage,
        graphic: null,
        createdAt: job.createdAt
      });
      D.order = D.order.filter((x => x !== id));
      renderPile();
      if (el && D.open) shrinkToPile(el, id);
      layout();
      startJobPolling();
    } catch (e) {
      form?.classList.remove('dd-sending');
      toast(`Couldn't send that to Claude: ${e.message}`, {
        tone: 'error'
      });
    }
  }
  function ensurePile() {
    let pile = $('#ddPile');
    if (!pile && $('#ddOverlay')) {
      pile = document.createElement('div');
      pile.id = 'ddPile';
      pile.className = 'dd-pile';
      pile.setAttribute('aria-live', 'polite');
      $('#ddOverlay').appendChild(pile);
    }
    return pile;
  }
  const elapsed = iso => {
    const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1e3));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  };
  function renderPile() {
    const pile = ensurePile();
    if (!pile) return;
    for (const n of [ ...pile.children ]) if (!D.pending.has(n.dataset.pile) && !n.classList.contains('dd-pile-leaving')) n.remove();
    for (const [id, p] of D.pending) {
      const c = D.cards.get(id)?.server;
      let n = pile.querySelector(`[data-pile="${CSS.escape(id)}"]`);
      if (!n) {
        n = document.createElement('div');
        n.className = 'dd-pile-item dd-pile-arriving';
        n.dataset.pile = id;
        n.innerHTML = `\n          <div class="dd-pile-thumb">${c?.image ? `<img src="${esc(c.image)}" alt="" draggable="false">` : ''}<span class="dd-spin" aria-hidden="true"></span></div>\n          <div class="dd-pile-text"><b></b><span data-pile-stage></span></div>`;
        pile.appendChild(n);
      }
      n.title = c?.name || '';
      n.querySelector('b').textContent = c?.name || 'Daily';
      const stage = STAGE_COPY[p.stage] || 'Working';
      n.querySelector('[data-pile-stage]').textContent = p.stage === 'graphic' ? `${stage} · ${elapsed(p.createdAt)}` : stage;
    }
    pile.hidden = !pile.children.length;
    $('#ddOverlay')?.classList.toggle('dd-has-pile', !!D.pending.size);
    renderChrome();
  }
  function shrinkToPile(el, id) {
    hideLink();
    D.els.delete(id);
    el.inert = true;
    const pill = $(`#ddPile [data-pile="${CSS.escape(id)}"] .dd-pile-thumb`);
    const r = el.getBoundingClientRect();
    const p = pill ? pill.getBoundingClientRect() : {
      left: window.innerWidth - 60,
      top: 70,
      width: 44,
      height: 44
    };
    const s = Math.max(p.width / r.width, .03);
    const dx = p.left + p.width / 2 - (r.left + r.width / 2);
    const dy = p.top + p.height / 2 - (r.top + r.height / 2);
    el.classList.add('dd-shrinking');
    el.style.zIndex = '40';
    el.style.transformOrigin = '50% 50%';
    el.style.transition = `transform ${SHRINK_MS}ms cubic-bezier(.55,.02,.25,1), opacity ${Math.round(SHRINK_MS * .35)}ms ease-in ${Math.round(SHRINK_MS * .65)}ms, border-radius ${SHRINK_MS}ms ease`;
    requestAnimationFrame((() => {
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${s}) rotate(-4deg)`;
      el.style.opacity = '0';
      el.style.borderRadius = '60px';
    }));
    setTimeout((() => {
      el.remove();
      const item = $(`#ddPile [data-pile="${CSS.escape(id)}"]`);
      item?.classList.remove('dd-pile-arriving');
      item?.classList.add('dd-pile-pop');
    }), SHRINK_MS);
  }
  function startJobPolling() {
    if (D.jobTimer) return;
    D.jobTimer = setInterval(pollJobs, JOB_POLL_MS);
  }
  async function pollJobs() {
    if (!D.pending.size) {
      clearInterval(D.jobTimer);
      D.jobTimer = null;
      return;
    }
    let jobs;
    try {
      ({jobs: jobs} = await api('GET', '/api/feedback-jobs'));
    } catch {
      return;
    }
    for (const [id, p] of [ ...D.pending ]) {
      const job = jobs.find((j => j.id === p.jobId));
      if (!job) {
        land(id, {
          status: 'error',
          message: 'The dashboard restarted mid-job. Anything already saved is in Notion - check the card and resend if needed.'
        });
        continue;
      }
      p.stage = job.stage;
      p.graphic = job.graphic;
      if (job.status !== 'running') land(id, job);
    }
    renderPile();
  }
  function friendlyJobError(m) {
    const t = String(m || '');
    const sub = t.match(/^(Subscription[^]*?)\. API fallback:/);
    if (sub) return `Claude couldn't run. ${sub[1]}.${/credit balance is too low/i.test(t) ? ' (The API key fallback is out of credit.)' : ''}`;
    if (/credit balance is too low/i.test(t)) return "Claude couldn't run: the Anthropic API account is out of credit.";
    if (/ANTHROPIC_API_KEY is not set|no_anthropic_key/i.test(t)) return "Claude isn't connected on this dashboard yet.";
    return t.replace(/^\d{3} \{.*"message":"([^"]+)".*$/, '$1') || 'Something went wrong.';
  }
  function clearGraphicDraft(id) {
    const entry = D.cards.get(id);
    try {
      localStorage.removeItem(gKey(id));
    } catch {}
    if (entry?.v?.data?.graphicDraft) {
      delete entry.v.data.graphicDraft;
      vScheduleSave(id, true);
    }
  }
  function land(id, job) {
    const entry = D.cards.get(id);
    if (!entry || !D.pending.has(id)) return;
    D.pending.delete(id);
    if (job.card) entry.server = job.card;
    if (job.status === 'done') {
      const bits = [ job.summary || (job.changed?.length ? `Updated ${job.changed.join(', ')}` : 'Updated'), job.message ].filter(Boolean);
      entry.feedback = {
        tone: 'good',
        text: bits.join(' ')
      };
    } else {
      entry.feedback = {
        tone: job.status === 'needs_input' ? 'ask' : 'bad',
        text: friendlyJobError(job.message) + (entry.graphicSend ? ' Nothing was lost: your graphic edits and note are still saved - open the graphic to send again.' : '')
      };
      if (!entry.compose && !entry.graphicSend) entry.compose = entry.note || '';
    }
    if (entry.graphicSend && job.status === 'done') clearGraphicDraft(id);
    entry.graphicSend = false;
    D.order = D.order.filter((x => x !== id));
    const pos = D.order.length ? 1 : 0;
    D.order.splice(Math.min(pos, D.order.length), 0, id);
    const item = $(`#ddPile [data-pile="${CSS.escape(id)}"]`);
    const title = entry.server.name;
    if (D.open && item) returnFromPile(id, item, pos); else {
      item?.remove();
      layout();
    }
    renderPile();
    const t = job.status === 'done' ? {
      tone: 'good',
      text: `Back from Claude · ${title}`
    } : job.status === 'needs_input' ? {
      tone: null,
      text: `Claude has a question · ${title}`
    } : {
      tone: 'error',
      text: `Feedback didn't fully land · ${title}`
    };
    toast(pos === 1 ? `${t.text} · next up` : t.text, {
      tone: t.tone
    });
  }
  function returnFromPile(id, item, pos) {
    const stage = $('#ddStage');
    const thumb = item.querySelector('.dd-pile-thumb').getBoundingClientRect();
    const el = buildCard(id);
    el.style.transition = 'none';
    el.classList.add('dd-from-pile');
    D.els.set(id, el);
    stage.appendChild(el);
    layout();
    const r = el.getBoundingClientRect();
    const s = Math.max(thumb.width / r.width, .03);
    const dx = thumb.left + thumb.width / 2 - (r.left + r.width / 2);
    const dy = thumb.top + thumb.height / 2 - (r.top + r.height / 2);
    el.style.transformOrigin = '50% 50%';
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${s}) rotate(6deg)`;
    el.style.opacity = '0';
    el.style.zIndex = '40';
    void el.offsetWidth;
    item.classList.add('dd-pile-leaving');
    setTimeout((() => item.remove()), 260);
    let settleAt = RETURN_MS + 30;
    if (pos === 0) {
      requestAnimationFrame((() => {
        el.style.transition = `transform ${RETURN_MS}ms cubic-bezier(.2,1.18,.34,1), opacity ${Math.round(RETURN_MS * .3)}ms ease-out`;
        el.style.transform = 'translate3d(0,0,0) scale(1)';
        el.style.opacity = '1';
      }));
    } else {
      const DIP = Math.round(RETURN_MS * .6), TUCK = Math.round(RETURN_MS * .55);
      const hover = `translate3d(0, ${Math.round(r.height * .36)}px, 0) scale(.34) rotate(-2deg)`;
      requestAnimationFrame((() => {
        el.style.transition = `transform ${DIP}ms cubic-bezier(.3,.9,.3,1.05), opacity ${Math.round(DIP * .4)}ms ease-out`;
        el.style.transform = hover;
        el.style.opacity = '1';
      }));
      setTimeout((() => {
        el.style.zIndex = '9';
        el.style.transition = `transform ${TUCK}ms cubic-bezier(.22,1.1,.36,1)`;
        el.style.transform = 'translate3d(0, 16px, 0) scale(.955)';
      }), DIP);
      settleAt = DIP + TUCK + 30;
    }
    setTimeout((() => {
      el.classList.remove('dd-from-pile');
      el.style.transition = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
      el.style.opacity = '';
      el.style.zIndex = '';
      el.classList.add('dd-landed');
      setTimeout((() => el.classList.remove('dd-landed')), 1400);
      layout();
    }), settleAt);
  }
  const LP = {
    el: null,
    a: null,
    hideTimer: 0
  };
  function ensureLinkPop() {
    if (LP.el) return LP.el;
    const el = document.createElement('div');
    el.className = 'dd-linkpop';
    el.hidden = true;
    el.addEventListener('mouseenter', (() => clearTimeout(LP.hideTimer)));
    el.addEventListener('mouseleave', (() => scheduleHideLink()));
    el.addEventListener('mousedown', (e => {
      if (!e.target.closest('input')) e.preventDefault();
    }));
    el.addEventListener('click', (e => {
      const act = e.target.closest('[data-lp]')?.dataset.lp;
      if (!act || !LP.a) return;
      if (act === 'open') {
        window.open(LP.a.href, '_blank', 'noopener');
        hideLink();
      }
      if (act === 'edit') renderLinkPop(true);
      if (act === 'unlink') {
        const a = LP.a, md = a.closest('.dd-md');
        a.replaceWith(...a.childNodes);
        hideLink();
        md?.dispatchEvent(new Event('input', {
          bubbles: true
        }));
        md?.focus();
      }
      if (act === 'save') saveLinkEdit();
      if (act === 'cancel') {
        const md = LP.a.closest('.dd-md');
        renderLinkPop(false);
        md?.focus();
      }
    }));
    el.addEventListener('keydown', (e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveLinkEdit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        renderLinkPop(false);
      }
    }));
    ($('#ddOverlay') || document.body).appendChild(el);
    LP.el = el;
    return el;
  }
  function renderLinkPop(editing) {
    const el = ensureLinkPop();
    const href = LP.a.getAttribute('href') || '';
    let host = href;
    try {
      host = new URL(href).hostname.replace(/^www\./, '');
    } catch {}
    el.innerHTML = editing ? `<input class="dd-lp-input" value="${esc(href)}" spellcheck="false" aria-label="Link URL"><button type="button" data-lp="save">Save</button><button type="button" data-lp="cancel" class="dd-lp-ghost">Cancel</button>` : `<span class="dd-lp-url" title="${esc(href)}">${esc(host)}</span><button type="button" data-lp="open">Open ↗</button><button type="button" data-lp="edit" class="dd-lp-ghost">Edit</button><button type="button" data-lp="unlink" class="dd-lp-ghost">Unlink</button>`;
    el.classList.toggle('dd-lp-editing', !!editing);
    if (editing) {
      const i = el.querySelector('input');
      i.focus();
      i.select();
    }
    placeLinkPop();
  }
  function saveLinkEdit() {
    const input = LP.el?.querySelector('input');
    if (!input || !LP.a) return;
    let url = input.value.trim();
    if (url && !/^(https?:|mailto:)/i.test(url)) url = 'https://' + url;
    const a = LP.a, md = a.closest('.dd-md');
    if (url) a.setAttribute('href', url); else a.replaceWith(...a.childNodes);
    md?.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    hideLink();
    md?.focus();
  }
  function placeLinkPop() {
    if (!LP.el || !LP.a) return;
    const r = LP.a.getBoundingClientRect();
    LP.el.hidden = false;
    const w = LP.el.offsetWidth;
    LP.el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
    LP.el.style.top = r.bottom + 6 + 'px';
  }
  function showLink(a) {
    clearTimeout(LP.hideTimer);
    if (LP.a === a && LP.el && !LP.el.hidden) return;
    LP.a = a;
    renderLinkPop(false);
  }
  function scheduleHideLink() {
    clearTimeout(LP.hideTimer);
    LP.hideTimer = setTimeout((() => {
      if (!LP.el?.classList.contains('dd-lp-editing')) hideLink();
    }), 350);
  }
  function hideLink() {
    clearTimeout(LP.hideTimer);
    if (LP.el) {
      LP.el.hidden = true;
      LP.el.classList.remove('dd-lp-editing');
    }
    LP.a = null;
  }
  const editableLink = n => n && n.closest && n.closest('.dd-md[contenteditable="true"] a[href], .dd-vtext a[href]');
  document.addEventListener('mouseover', (e => {
    if (!D.open) return;
    const a = editableLink(e.target);
    if (a) showLink(a); else if (LP.a && !e.target.closest?.('.dd-linkpop')) scheduleHideLink();
  }));
  document.addEventListener('selectionchange', (() => {
    if (!D.open || LP.el?.classList.contains('dd-lp-editing')) return;
    const node = window.getSelection()?.anchorNode;
    const a = editableLink(node && (node.nodeType === 1 ? node : node.parentElement));
    if (a) showLink(a);
  }));
  document.addEventListener('click', (e => {
    const a = editableLink(e.target);
    if (a && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      window.open(a.href, '_blank', 'noopener');
    }
  }), true);
  document.addEventListener('scroll', (() => {
    if (LP.a && !LP.el?.classList.contains('dd-lp-editing')) hideLink();
  }), true);
  const CAL = {
    data: null,
    at: 0,
    el: null,
    modal: null
  };
  const fmtDay = d => new Date(d + 'T12:00:00Z').toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
  async function loadCalendar(force) {
    if (!force && CAL.data && Date.now() - CAL.at < 15e3) return CAL.data;
    CAL.data = await api('GET', '/api/daily-calendar');
    CAL.at = Date.now();
    if (CAL.data.deletedDrafts?.length) toast(`Deleted ${CAL.data.deletedDrafts.length} superseded beehiiv draft${CAL.data.deletedDrafts.length > 1 ? 's' : ''}`);
    return CAL.data;
  }
  function adLines(i, pendingHouse) {
    const lines = i.ads.map((a => `<li class="ad booked" title="${esc(a.status || '')}${a.hasCopy ? '' : ' - no final copy yet'}">${esc(a.name)}${a.hasCopy ? '' : ' <em>no copy yet</em>'}</li>`));
    const house = pendingHouse || i.houseAds;
    for (let k = i.ads.length; k < 2; k++) {
      const h = house[k - i.ads.length];
      lines.push(h ? `<li class="ad house" title="A fallback, not a booking: the slot is still for sale">House ad (fallback): ${esc(h)}</li>` : `<li class="ad open">Open slot - for sale</li>`);
    }
    return `<ul class="dd-cal-ads">${lines.join('')}</ul>`;
  }
  function trayIds() {
    const all = [ ...new Set([ ...D.order, ...D.parked ]) ];
    const slotted = new Set((CAL.data?.issues || []).map((i => i.daily?.id)).filter(Boolean));
    return all.filter((id => D.cards.get(id)?.server.firstEdit && !slotted.has(id) && !D.cards.get(id)?.server.migrate));
  }
  function cardChip(c, draggable = true) {
    return `<div class="dd-cal-chip" ${draggable ? `draggable="true" data-cal-drag="${esc(c.id)}"` : ''} title="${esc(c.name || '')}">\n      ${c.image ? `<img src="${esc(c.image)}" alt="" draggable="false">` : '<i></i>'}<span>${esc(c.name || 'Untitled')}</span></div>`;
  }
  function renderCalendar() {
    const el = CAL.el, d = CAL.data;
    if (!el || !d) return;
    const tray = trayIds().map((id => cardChip({
      id: id,
      ...D.cards.get(id).server
    }))).join('') || '<p class="dd-cal-empty">No warm-deck Dailies waiting. Stamp a card "1st edit complete" and it shows up here.</p>';
    const days = d.issues.map((i => {
      const warn = i.daysOut < d.leadDays;
      return `<div class="dd-cal-day${i.daily ? ' full' : ''}${warn ? ' warn' : ''}" data-cal-day="${esc(i.id)}">\n        <div class="dd-cal-date"><b>${fmtDay(i.date)}</b><span>${i.daysOut === 0 ? 'today' : i.daysOut === 1 ? 'tomorrow' : `in ${i.daysOut} days`}</span>${warn ? '<i title="Under the lead time">⚠️</i>' : ''}</div>\n        ${i.daily ? cardChip(i.daily) + `<div class="dd-cal-state">${i.daily.status === '🙌 In Beehiiv' ? 'Draft in beehiiv' : i.daily.migrate ? 'Draft building…' : ''}</div>` : '<div class="dd-cal-drop">Drop a Daily here</div>'}\n        ${adLines(i)}\n      </div>`;
    })).join('');
    el.querySelector('[data-cal-body]').innerHTML = `\n      <aside class="dd-cal-tray"><h4>Ready to slot <span>${trayIds().length}</span></h4><p>Warm deck, not yet slotted</p>${tray}</aside>\n      <div class="dd-cal-grid">${days || '<p class="dd-cal-empty">No Daily send days found in the Issues calendar.</p>'}</div>`;
    const b = d.build || {};
    el.querySelector('[data-cal-note]').textContent = b.pending ? 'A draft build starts in a few seconds…' : b.lastError ? `Draft build: ${b.lastError}` : b.lastDispatch ? `Last draft build started ${new Date(b.lastDispatch).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}` : '';
  }
  async function openCalendar() {
    if (!CAL.el) {
      const el = document.createElement('div');
      el.className = 'dd-cal';
      el.hidden = true;
      el.innerHTML = `<div class="dd-eview-bar"><strong>Send calendar</strong><span data-cal-note></span><button type="button" class="dd-gview-close" data-cal-close>Close</button></div><div class="dd-cal-body" data-cal-body></div>`;
      ($('#ddOverlay') || document.body).appendChild(el);
      el.querySelector('[data-cal-close]').addEventListener('click', (() => {
        el.hidden = true;
      }));
      el.addEventListener('dragstart', (e => {
        const chip = e.target.closest('[data-cal-drag]');
        if (!chip) return;
        e.dataTransfer.setData('text/plain', chip.dataset.calDrag);
        e.dataTransfer.effectAllowed = 'move';
        chip.classList.add('dragging');
      }));
      el.addEventListener('dragend', (e => e.target.closest?.('[data-cal-drag]')?.classList.remove('dragging')));
      el.addEventListener('dragover', (e => {
        const day = e.target.closest('[data-cal-day]');
        if (!day) return;
        e.preventDefault();
        el.querySelectorAll('.dd-cal-day.over').forEach((n => n !== day && n.classList.remove('over')));
        day.classList.add('over');
      }));
      el.addEventListener('dragleave', (e => {
        const day = e.target.closest('[data-cal-day]');
        if (day && !day.contains(e.relatedTarget)) day.classList.remove('over');
      }));
      el.addEventListener('drop', (e => {
        const day = e.target.closest('[data-cal-day]');
        if (!day) return;
        e.preventDefault();
        day.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain');
        if (id) openSlotModal(id, day.dataset.calDay, {
          fromCalendar: true
        });
      }));
      CAL.el = el;
    }
    CAL.el.hidden = false;
    CAL.el.querySelector('[data-cal-body]').innerHTML = '<p class="dd-eview-loading">Reading the send days from Notion…</p>';
    try {
      await loadCalendar(true);
      renderCalendar();
    } catch (e) {
      CAL.el.querySelector('[data-cal-body]').innerHTML = `<p class="dd-eview-loading">Couldn't read the calendar: ${esc(e.message)}</p>`;
    }
  }
  async function openSlotModal(id, issueId, {fromCalendar: fromCalendar = false} = {}) {
    const entry = D.cards.get(id);
    const name = entry?.server.name || CAL.data?.issues.find((i => i.daily?.id === id))?.daily?.name || 'this Daily';
    if (!CAL.modal) {
      const m = document.createElement('div');
      m.className = 'dd-slotm';
      m.hidden = true;
      ($('#ddOverlay') || document.body).appendChild(m);
      CAL.modal = m;
    }
    const m = CAL.modal;
    m.hidden = false;
    m.innerHTML = '<div class="dd-slotm-box"><p>Reading the send days…</p></div>';
    let d;
    try {
      d = await loadCalendar();
    } catch (e) {
      m.innerHTML = `<div class="dd-slotm-box"><p>Couldn't read the calendar: ${esc(e.message)}</p><button type="button" data-sm-cancel>Close</button></div>`;
      m.querySelector('[data-sm-cancel]').onclick = () => {
        m.hidden = true;
      };
      return;
    }
    const current = d.issues.find((i => i.daily?.id === id));
    let pick = issueId || (d.issues.find((i => !i.daily && i.daysOut >= d.leadDays)) || d.issues.find((i => !i.daily)))?.id;
    const draw = () => {
      const i = d.issues.find((x => x.id === pick));
      const taken = i?.daily && i.daily.id !== id;
      const free = i ? Math.max(0, 2 - i.ads.length) : 0;
      m.innerHTML = `<div class="dd-slotm-box" role="dialog" aria-label="Slot this Daily">\n        <h3>${current && current.id !== pick ? 'Move' : 'Slot'} "${esc(name)}"</h3>\n        <label class="dd-slotm-day">Send day\n          <select data-sm-day>${d.issues.map((x => `<option value="${esc(x.id)}" ${x.id === pick ? 'selected' : ''} ${x.daily && x.daily.id !== id ? 'disabled' : ''}>${fmtDay(x.date)}${x.daily && x.daily.id !== id ? ' - taken' : ''}${x.daysOut < d.leadDays ? ' ⚠️' : ''}</option>`)).join('')}</select></label>\n        ${i ? `<div class="dd-slotm-ads"><b>Ads in this edition</b>${adLines(i, [])}${free ? `<p class="dd-slotm-note">${free === 2 ? 'Both empty slots get' : 'The empty slot gets'} a house ad ("Refer a friend" or "Sponsor this newsletter", order picked at random). Notion marks it as a fallback, so the slot stays for sale.</p>` : ''}</div>` : '<p>No send day to slot into.</p>'}\n        ${i && i.daysOut < d.leadDays ? `<p class="dd-slotm-warn">⚠️ This sends ${i.daysOut <= 0 ? 'today' : `in ${i.daysOut} day${i.daysOut > 1 ? 's' : ''}`}, under the ${d.leadDays}-day lead time. You can still go ahead.</p>` : ''}\n        ${current && current.id !== pick && current.daily?.status === '🙌 In Beehiiv' ? '<p class="dd-slotm-note">Its beehiiv draft is rebuilt for the new day, and the old draft is deleted once the new one is in.</p>' : ''}\n        ${taken ? '<p class="dd-slotm-warn">That day already has a Daily. Move it first.</p>' : ''}\n        <p class="dd-slotm-note">The beehiiv draft builds in a few minutes. Nothing is scheduled - you still schedule it in beehiiv.</p>\n        <div class="dd-slotm-actions"><button type="button" class="dd-slotm-btn" data-sm-cancel>Cancel</button><button type="button" class="dd-slotm-btn go" data-sm-go ${!i || taken ? 'disabled' : ''}>Confirm</button></div>\n      </div>`;
      m.querySelector('[data-sm-day]').onchange = e => {
        pick = e.target.value;
        draw();
      };
      m.querySelector('[data-sm-cancel]').onclick = () => {
        m.hidden = true;
      };
      m.querySelector('[data-sm-go]').onclick = async () => {
        m.hidden = true;
        if (!fromCalendar && D.order[0] === id) {
          commit('right', {
            slotIssueId: pick
          });
          return;
        }
        try {
          const {result: result, card: card} = await api('POST', '/api/daily-calendar/slot', {
            pageId: id,
            issueId: pick
          });
          if (entry) {
            entry.server = card;
            D.order = D.order.filter((x => x !== id));
            D.parked = D.parked.filter((x => x !== id));
            layout();
          }
          toast(`${result.moved ? 'Moved' : 'Slotted'} for ${fmtDay(result.date)} · draft builds in a few minutes`, {
            tone: 'good'
          });
          if (CAL.el && !CAL.el.hidden) {
            await loadCalendar(true);
            renderCalendar();
          }
        } catch (e) {
          toast(`Couldn't slot it: ${e.message}`, {
            tone: 'error'
          });
        }
      };
    };
    draw();
  }
  let sideFilter = 'all';
  try {
    sideFilter = localStorage.getItem('dd-side-filter') || 'all';
  } catch {}
  function renderSide() {
    const list = $('#ddSideList');
    if (!list) return;
    const all = [ ...D.order, ...[ ...D.pending.keys() ].filter((id => !D.order.includes(id))) ];
    const done = id => !!D.cards.get(id)?.server.firstEdit;
    const ids = all.filter((id => sideFilter === 'all' || sideFilter === 'done' === done(id)));
    const key = sideFilter + '|' + ids.join(',') + '|' + ids.map((id => D.cards.get(id)?.server.name + done(id))).join('|');
    document.querySelectorAll('[data-side-filter]').forEach((b => {
      b.setAttribute('aria-pressed', String(b.dataset.sideFilter === sideFilter));
      const n = b.dataset.sideFilter === 'all' ? all.length : all.filter((id => b.dataset.sideFilter === 'done' === done(id))).length;
      b.dataset.n = n;
    }));
    $('#ddSideCount').textContent = all.length;
    if (list.dataset.key === key) {
      list.querySelectorAll('[data-side-id]').forEach((li => li.classList.toggle('on', li.dataset.sideId === D.order[0])));
      return;
    }
    list.dataset.key = key;
    list.innerHTML = ids.map(((id, i) => {
      const c = D.cards.get(id)?.server || {};
      const busy = D.pending.has(id);
      return `<li data-side-id="${esc(id)}" class="${id === D.order[0] ? 'on' : ''}${busy ? ' busy' : ''}${c.firstEdit ? ' done' : ''}" title="${esc(c.name || '')}">\n        <span class="dd-side-n">${busy ? '…' : c.firstEdit ? '✓' : D.order.indexOf(id) + 1}</span>\n        ${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" draggable="false">` : '<i class="dd-side-noimg"></i>'}\n        <span class="dd-side-name">${esc(c.name || 'Untitled')}${busy ? '<small>Claude is working on it</small>' : ''}</span></li>`;
    })).join('');
    list.querySelector('.on')?.scrollIntoView({
      block: 'nearest'
    });
  }
  function jumpTo(id) {
    if (D.pending.has(id)) {
      toast('Claude is still working on that one - it comes back on its own');
      return;
    }
    if (!D.order.includes(id) || D.order[0] === id) return;
    hideLink();
    D.order = [ id, ...D.order.filter((x => x !== id)) ];
    layout();
  }
  function ensureOverlay() {
    if ($('#ddOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'ddOverlay';
    ov.className = 'dd-overlay';
    ov.setAttribute('role', 'region');
    ov.setAttribute('aria-label', 'Daily triage');
    ov.innerHTML = `\n      <div class="dd-top">\n        <button type="button" class="dd-back" id="ddBack" title="Back to the triage summary (Esc)"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>Summary</button>\n        <button type="button" class="dd-back dd-side-toggle" id="ddSideToggle" title="Show or hide every Daily in the stack"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2.5 4h11M2.5 8h11M2.5 12h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>All Dailies</button>\n        <div class="dd-title"><strong>Daily triage</strong><span id="ddCounter"></span></div>\n        <div class="dd-decks" role="group" aria-label="Which deck">\n          <button type="button" data-deck="cold" title="Raw AI cards waiting for a first edit">Cold deck <b data-deck-n="cold"></b></button>\n          <button type="button" data-deck="warm" title="First edit done - ready for the final review">Warm deck <b data-deck-n="warm"></b></button>\n          <button type="button" data-deck="all" title="Every card">All <b data-deck-n="all"></b></button>\n        </div>\n        <button type="button" class="dd-back dd-cal-open" id="ddCalOpen" title="The Daily send days, their ads and what is slotted where">📅 Send calendar</button>\n        <div class="dd-sync" id="ddSync"></div>\n      </div>\n      <aside class="dd-side" id="ddSide" aria-label="Every Daily in the stack"><div class="dd-side-head">The stack <span id="ddSideCount"></span></div>\n        <div class="dd-side-filter" role="group" aria-label="Filter by 1st edit"><button type="button" data-side-filter="all">All</button><button type="button" data-side-filter="done">1st edit done</button><button type="button" data-side-filter="todo">Not yet</button></div>\n        <ol class="dd-side-list" id="ddSideList"></ol></aside>\n      <div class="dd-stage" id="ddStage"></div>\n      <div class="dd-empty" id="ddEmpty" hidden></div>\n      <div class="dd-controls" id="ddControls">\n        <button class="dd-btn dd-btn-back" id="ddUndo" title="Back: bring the last card back and undo what you did to it (Z)"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 6l-6 6 6 6M4 12h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg><span>Back</span></button>\n        <button class="dd-btn dd-btn-left" data-dir="left" title="Archive"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>Archive</span></button>\n        <button class="dd-btn dd-btn-up" data-dir="up" title="Later"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg><span>Later</span></button>\n        <button class="dd-btn dd-btn-right" data-dir="right" title="Migrate to beehiiv"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg><span>Migrate</span></button>\n      </div>\n      <div class="dd-toasts" id="ddToasts" aria-live="polite"></div>`;
    document.body.appendChild(ov);
    $('#ddControls').addEventListener('click', (e => {
      const b = e.target.closest('[data-dir]');
      if (b) keyCommit(b.dataset.dir);
    }));
    $('#ddUndo').addEventListener('click', undo);
    $('#ddCalOpen').addEventListener('click', (() => openCalendar()));
    $('#ddOverlay').querySelector('.dd-decks').addEventListener('click', (e => {
      const b = e.target.closest('[data-deck]');
      if (b) setDeck(b.dataset.deck);
    }));
    $('#ddBack').addEventListener('click', (() => close()));
    const side = open => {
      $('#ddOverlay').classList.toggle('dd-side-open', open);
      try {
        localStorage.setItem('dd-side', open ? '1' : '0');
      } catch {}
      if (open) renderSide();
    };
    let sideOpen = false;
    try {
      sideOpen = localStorage.getItem('dd-side') === '1';
    } catch {}
    side(sideOpen);
    $('#ddSideToggle').addEventListener('click', (() => side(!$('#ddOverlay').classList.contains('dd-side-open'))));
    $('#ddSide').addEventListener('click', (e => {
      const f = e.target.closest('[data-side-filter]');
      if (!f) return;
      sideFilter = f.dataset.sideFilter;
      try {
        localStorage.setItem('dd-side-filter', sideFilter);
      } catch {}
      renderSide();
    }));
    $('#ddSideList').addEventListener('click', (e => {
      const li = e.target.closest('[data-side-id]');
      if (li) jumpTo(li.dataset.sideId);
    }));
    $('#ddEmpty').addEventListener('click', (e => {
      if (e.target.closest('[data-retry]')) {
        $('#ddSync').textContent = 'Connecting…';
        refresh();
      }
    }));
  }
  function keyCommit(dir) {
    const el = D.els.get(D.order[0]);
    if (!el) return;
    const btn = $(`.dd-btn-${dir}`);
    btn?.classList.remove('dd-pressed');
    void btn?.offsetWidth;
    btn?.classList.add('dd-pressed');
    commit(dir, {
      from: dir === 'up' ? {
        dx: 0,
        dy: -30
      } : {
        dx: dir === 'right' ? 40 : -40,
        dy: 0
      }
    });
  }
  function renderChrome() {
    if (!$('#ddOverlay')) return;
    const left = D.order.length;
    const t = D.tally;
    const blocked = !!D.fetchError && !D.cards.size;
    $('#ddCounter').innerHTML = D.loaded ? `<span>${left} in the stack</span>${D.pending.size ? `<span class="c-busy">${D.pending.size} with Claude</span>` : ''}${t.right ? `<span class="c-right">${t.right} migrated</span>` : ''}${t.left ? `<span class="c-left">${t.left} archived</span>` : ''}${t.up ? `<span class="c-up">${t.up} later</span>` : ''}` : `<span>${blocked ? "Couldn't load" : 'Loading from Notion…'}</span>`;
    const sync = $('#ddSync');
    if (D.fetchError) {
      sync.className = 'dd-sync err';
      sync.textContent = blocked ? 'Not connected to Notion' : 'Notion unreachable, showing the last copy';
      sync.title = D.fetchError;
    } else if (D.lastFetch) {
      sync.className = 'dd-sync ok';
      sync.title = '';
      sync.textContent = `Live with Notion · ${new Date(D.lastFetch).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}`;
    } else {
      sync.className = 'dd-sync busy';
      sync.title = '';
      sync.textContent = 'Connecting…';
    }
    const dc = deckCounts();
    const empty = $('#ddEmpty');
    const showEmpty = blocked || D.loaded && !left;
    empty.hidden = !showEmpty;
    empty.classList.toggle('dd-empty-error', blocked);
    $('#ddControls').classList.toggle('dd-disabled', !left);
    $('#ddUndo').disabled = !D.history.length;
    document.querySelectorAll('[data-deck]').forEach((b => b.setAttribute('aria-pressed', String(b.dataset.deck === D.deck))));
    document.querySelectorAll('[data-deck-n]').forEach((n => {
      n.textContent = dc[n.dataset.deckN];
    }));
    if ($('#ddOverlay')?.classList.contains('dd-side-open')) renderSide();
    if (showEmpty) empty.innerHTML = blocked ? errorPanel() : D.deck === 'warm' ? `<div class="dd-empty-mark">✓</div><h3>Warm deck is empty</h3><p>No card has had its first edit yet${dc.cold ? ` - ${dc.cold} waiting in the cold deck` : ''}.</p>` : D.deck === 'cold' ? `<div class="dd-empty-mark">✓</div><h3>Cold deck cleared</h3><p>Every card has had its first edit${dc.warm ? ` - ${dc.warm} waiting in the warm deck` : ''}.</p>` : `<div class="dd-empty-mark">✓</div><h3>Stack cleared</h3><p>${t.right} migrated · ${t.left} archived. Nothing else enriched is waiting.</p>`;
    if (!D.loaded && !blocked && !$('#ddStage').children.length) {
      $('#ddStage').innerHTML = '<div class="dd-skeleton"><div></div></div>';
    } else {
      $('#ddStage .dd-skeleton')?.remove();
    }
  }
  function errorPanel() {
    return `<div class="dd-empty"><h3>Couldn't load the Dailies</h3><p>${esc(D.fetchError || 'Unknown error')}</p>\n      <button type="button" class="dd-retry" data-retry>Try again</button></div>`;
  }
  function toast(text, {action: action, tone: tone, countdown: countdown} = {}) {
    const box = $('#ddToasts');
    if (!box) return;
    const n = document.createElement('div');
    n.className = 'dd-toast' + (tone ? ' ' + tone : '');
    n.innerHTML = `<span>${esc(text)}</span>`;
    if (action) {
      const b = document.createElement('button');
      if (countdown) {
        b.className = 'dd-countdown';
        b.style.setProperty('--cd', countdown + 'ms');
        b.innerHTML = `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle class="dd-cd-track" cx="10" cy="10" r="8"/><circle class="dd-cd-ring" cx="10" cy="10" r="8" pathLength="100"/></svg><span>${esc(action.label)}</span><b class="dd-cd-secs"></b>`;
        const secs = b.querySelector('.dd-cd-secs');
        const end = Date.now() + countdown;
        const tick = () => {
          if (!n.isConnected) return;
          secs.textContent = Math.max(0, Math.ceil((end - Date.now()) / 1e3)) + 's';
          setTimeout(tick, 200);
        };
        secs.textContent = Math.ceil(countdown / 1e3) + 's';
        setTimeout(tick, 0);
      } else b.textContent = action.label;
      b.addEventListener('click', (() => {
        action.run();
        n.remove();
      }));
      n.appendChild(b);
    }
    if (countdown) n.dataset.countdown = '1';
    box.appendChild(n);
    while (box.children.length > 2) {
      const plain = [ ...box.children ].find((x => x !== n && !x.dataset.countdown));
      (plain || box.firstElementChild).remove();
    }
    setTimeout((() => {
      n.classList.add('out');
      setTimeout((() => n.remove()), 300);
    }), countdown || (tone === 'error' ? 7e3 : 4200));
  }
  function isTyping(t) {
    return t && (t.matches?.('input, textarea, select') || t.isContentEditable);
  }
  function onKey(e) {
    if (!D.open) return;
    if (CAL.modal && !CAL.modal.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        CAL.modal.hidden = true;
      }
      return;
    }
    if (CAL.el && !CAL.el.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        CAL.el.hidden = true;
      }
      return;
    }
    if (EV.el && !EV.el.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeEmailView();
      }
      return;
    }
    if (GV.el && !GV.el.hidden) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeGraphicView();
      }
      return;
    }
    if (isTyping(e.target)) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.target.blur();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      return;
    }
    if (e.key === 'Escape' && !$('.dd-linkpop.dd-lp-editing')) {
      e.preventDefault();
      close();
      return;
    }
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key === '/' || e.key.toLowerCase() === 'f') {
      const t = D.els.get(D.order[0]) && $('[data-compose-text]', D.els.get(D.order[0]));
      if (t) {
        e.preventDefault();
        t.focus();
      }
      return;
    }
    if (e.key.toLowerCase() === 'e' || e.key === 'Enter') {
      const el = D.els.get(D.order[0]);
      const f = el && $('[data-md-for="sec:description"]', el);
      if (f) {
        e.preventDefault();
        f.focus();
      }
    }
  }
  function startPolling() {
    stopPolling();
    D.pollTimer = setInterval((() => {
      if (!document.hidden) refresh({
        silent: true
      });
    }), POLL_MS);
  }
  function stopPolling() {
    clearInterval(D.pollTimer);
    D.pollTimer = null;
  }
  function open() {
    ensureOverlay();
    D.open = true;
    document.documentElement.classList.add('dd-locked-scroll');
    requestAnimationFrame((() => $('#ddOverlay').classList.add('open')));
    layout();
    renderPile();
    refresh();
    startPolling();
    if (D.pending.size) startJobPolling();
  }
  async function close() {
    if (!D.open) return;
    hideLink();
    D.open = false;
    trackView();
    stopPolling();
    await Promise.all(D.order.slice(0, 1).map(flush));
    const ov = $('#ddOverlay');
    ov.classList.remove('open');
    document.documentElement.classList.remove('dd-locked-scroll');
    setTimeout((() => {
      if (!D.open) {
        D.els.forEach((el => el.remove()));
        D.els.clear();
      }
    }), 320);
    updateBadge();
    window.dispatchEvent(new CustomEvent('dailydeck:closed'));
  }
  function updateBadge() {
    const b = document.getElementById('ddLaunchCount');
    if (!b) return;
    const n = D.order.length;
    const text = n > 99 ? '99+' : String(n);
    b.textContent = D.loaded ? text : '';
    b.style.display = !D.loaded || n === 0 ? 'none' : 'inline-block';
    b.setAttribute('aria-label', `${n} Dailies to triage`);
    const byStatus = {};
    let oldest = null;
    for (const id of D.order) {
      const c = D.cards.get(id)?.server;
      if (!c) continue;
      const s = STATUS_SHORT[c.status] || c.status || 'Other';
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (!oldest || c.created < oldest) oldest = c.created;
    }
    window.dispatchEvent(new CustomEvent('dailydeck:queue', {
      detail: {
        loaded: D.loaded,
        count: n,
        byStatus: byStatus,
        oldest: oldest,
        error: D.cards.size ? null : D.fetchError
      }
    }));
  }
  document.addEventListener('keydown', onKey);
  window.addEventListener('focus', (() => {
    if (D.open) refresh({
      silent: true
    });
  }));
  window.addEventListener('beforeunload', (e => {
    const pending = [ ...D.cards.values() ].some((x => x.dirty.size || x.saving));
    if (pending) {
      D.cards.forEach(((_, id) => flush(id)));
      e.preventDefault();
      e.returnValue = '';
    }
  }));
  window.DailyDeck = {
    open: open,
    close: close,
    isOpen: () => D.open,
    announce: updateBadge,
    prefetch: () => {
      if (!D.loaded) refresh({
        silent: true
      });
    }
  };
})();
