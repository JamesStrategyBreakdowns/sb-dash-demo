(function() {
  const STATUS_CLASS = {
    'In Progress': 'is-progress',
    'Next Up': 'is-next',
    Blocked: 'is-blocked',
    'Not now': 'is-later'
  };
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])));
  }
  function shortDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return `${[ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ][m - 1]} ${d}`;
  }
  let ACTIVITY = {};
  function bullets(id) {
    const list = id && ACTIVITY[id] || [];
    return list.length ? `<ul class="big3-bullets">${list.map((b => `<li>${esc(b)}</li>`)).join('')}</ul>` : '';
  }
  const OUTCOME = {
    done: [ 'Done', 'is-done' ],
    carried: [ 'Carried over', 'is-carried' ],
    dropped: [ 'Dropped', 'is-dropped' ]
  };
  function renderLastWeek(items) {
    if (!items) return '';
    if (!items.length) return '<div class="big3-last"><div class="big3-last-h">Last week</div><div class="big3-last-none">No focus tasks were set.</div></div>';
    return `<div class="big3-last"><div class="big3-last-h">Last week</div>${items.map((t => {
      const [label, cls] = OUTCOME[t.outcome] || [ t.outcome, '' ];
      return `<a class="big3-last-row" href="${esc(t.url)}" target="_blank" rel="noopener"><span class="big3-outcome ${cls}">${label}</span><span class="big3-last-task">${esc(t.task)}</span></a>`;
    })).join('')}</div>`;
  }
  function renderPerson(p, lastWeek) {
    const rows = p.items.length ? p.items.map(((t, i) => `\n        <a class="big3-row" href="${esc(t.url)}" target="_blank" rel="noopener" title="${esc(t.notes)}">\n          <span class="big3-n">${i + 1}</span>\n          <span class="big3-body">\n            <span class="big3-task">${esc(t.task)}</span>\n            <span class="big3-meta">\n              <span class="big3-status ${STATUS_CLASS[t.status] || ''}">${esc(t.status)}</span>\n              ${t.goal ? `<span class="big3-goal">${esc(t.goal)}</span>` : ''}\n              ${t.impact && t.effort ? `<span class="big3-score">${esc(t.impact)} / ${esc(t.effort)}${t.score != null ? ` · ${t.score}` : ''}</span>` : ''}\n              ${t.due ? `<span class="big3-due">due ${shortDate(t.due)}</span>` : ''}\n            </span>\n            ${bullets(t.id)}\n          </span>\n        </a>`)).join('') : '<div class="pipe-empty">No focus set this week.</div>';
    const over = p.items.length > 3 ? `<div class="big3-warn">${p.items.length} focused. The rule is 3. Something comes off.</div>` : '';
    return `<div class="home-panel big3-person"><h3>${esc(p.name)} <span class="count">${p.items.length}/3</span></h3>${over}<div class="big3-list">${rows}</div>${renderLastWeek(lastWeek?.people?.[p.name])}</div>`;
  }
  async function load(force) {
    const grid = document.getElementById('big3Grid');
    const sub = document.getElementById('big3Sub');
    if (!grid) return;
    try {
      const [res, act] = await Promise.all([ fetch('/api/big3' + (force ? '?refresh=1' : '')), fetch('/api/weekly-activity').then((r => r.json())).catch((() => null)) ]);
      const data = await res.json();
      ACTIVITY = act?.summary?.tasks || {};
      if (data.error) throw new Error(data.error);
      const when = data.pulled ? new Date(data.pulled).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';
      const age = data.pulled ? Math.floor((Date.now() - new Date(data.pulled)) / 864e5) : null;
      const stale = !data.live ? `<div class="big3-stale">Not live. ${data.liveError ? `${esc(data.liveError)}.` : 'Notion could not be read.'} This is a saved copy from ${when}${age != null ? `, ${age} day${age === 1 ? '' : 's'} old` : ''}.</div>` : '';
      grid.innerHTML = stale + data.people.map((p => renderPerson(p, data.lastWeek))).join('');
      sub.textContent = data.live ? `From the team task board, pulled ${when}.` + (data.lastWeek ? ` "Last week" is the week of ${shortDate(data.lastWeek.week)}.` : '') : `Showing a saved copy from ${when}, not live data. Click a task to open it.`;
    } catch (e) {
      grid.innerHTML = `<div class="pipe-empty">Could not load the Big 3: ${esc(e.message)}</div>`;
    }
  }
  document.addEventListener('DOMContentLoaded', (() => {
    load(false);
    const btn = document.getElementById('big3Refresh');
    if (btn) btn.addEventListener('click', (() => load(true)));
  }));
})();
