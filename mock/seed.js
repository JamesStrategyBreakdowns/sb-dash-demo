// Synthetic data for the SB Dash demo. Every company, person, number and URL here
// is invented. Dates are stored as day offsets and turned into real dates against
// "now" when the page loads, so the demo never goes stale.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SBSeed = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function prng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const COMPANIES = [
    { name: 'Acme Corp', slug: 'acme', color: '#E4572E', shape: 'triangle' },
    { name: 'Globex', slug: 'globex', color: '#2E86AB', shape: 'circle' },
    { name: 'Initech', slug: 'initech', color: '#6C5CE7', shape: 'square' },
    { name: 'Hooli', slug: 'hooli', color: '#00A6A6', shape: 'ring' },
    { name: 'Pied Piper', slug: 'piedpiper', color: '#3BB273', shape: 'leaf' },
    { name: 'Vandelay Industries', slug: 'vandelay', color: '#C9A227', shape: 'diamond' },
    { name: 'Wonka Industries', slug: 'wonka', color: '#8E44AD', shape: 'circle' },
    { name: 'Massive Dynamic', slug: 'massive', color: '#1F2937', shape: 'hex' },
    { name: 'Tyrell Corp', slug: 'tyrell', color: '#B33951', shape: 'triangle' },
    { name: 'Weyland-Yutani', slug: 'weyland', color: '#5D6D7E', shape: 'square' },
    { name: 'Sterling Cooper', slug: 'sterling', color: '#A0522D', shape: 'diamond' },
    { name: 'Bluth Company', slug: 'bluth', color: '#F39C12', shape: 'ring' },
    { name: 'Dunder Mifflin', slug: 'dunder', color: '#34495E', shape: 'square' },
    { name: 'Virtucon', slug: 'virtucon', color: '#D35400', shape: 'hex' },
    { name: 'Nakatomi Trading', slug: 'nakatomi', color: '#16A085', shape: 'circle' },
    { name: 'Prestige Worldwide', slug: 'prestige', color: '#C0392B', shape: 'leaf' },
  ];
  const DOMAIN = Object.fromEntries(COMPANIES.map(c => [c.name, `${c.slug}.demo`]));
  const LINK = path => `https://demo.invalid/${path}`;
  const clone = o => JSON.parse(JSON.stringify(o));

  const ARTICLES = [
    'How Acme turned anvils into a subscription', 'The quiet genius of Hooli\'s free tier',
    'Inside Globex\'s 3-sided marketplace', 'Why Initech kept its worst product alive',
    'Pied Piper and the economics of compression', 'Wonka\'s scarcity playbook',
    'Vandelay\'s import arbitrage, explained', 'Massive Dynamic\'s R&D flywheel',
    'Tyrell\'s premium pricing ladder', 'The Bluth Company bundle that saved the stand',
    'Dunder Mifflin\'s paper-thin moat', 'Virtucon and the art of the hostile pivot',
    'Nakatomi\'s 30-floor sales org', 'Sterling Cooper\'s account-based playbook',
    'Weyland-Yutani\'s long-game contracts', 'Prestige Worldwide\'s launch-day math',
    'The anatomy of a referral loop', 'Pricing pages that print money', 'When to kill a feature',
    'Retention curves, read properly',
  ];
  const SUBJECTS = [
    'Rent the anvil, sell the skates', 'Free was the product strategy', 'Three sides, one flywheel', 'The product nobody loves (and why it stays)',
    'Smaller files, bigger margins', 'Scarcity, but make it a growth channel', 'Buy low, import high', 'Research is the sales budget',
    'The decoy plan that does the selling', 'One stand, two decades of margin', 'A moat made of paper', 'Pivot first, apologise later',
    'A sales floor on every floor', 'Sell to the account, not the person', 'Contracts that outlive the CEO', 'Launch day, by the numbers',
    'Every customer is a salesperson', 'The page that prices itself', 'Kill it before it kills the roadmap', 'Read the curve, not the average',
  ];

  // Research topics behind the Daily, with the finding each one is built on.
  const DAILIES = [
    { id: 'acme-anvils', company: 'Acme Corp', status: '1️⃣ Pending Review', ago: 1, chart: { kind: 'line' },
      stat: 'Acme Corp grew anvil subscriptions 6x in 8 quarters' },
    { id: 'hooli-churn', company: 'Hooli', status: '1️⃣ Pending Review', ago: 2, chart: { kind: 'bar' },
      stat: 'Hooli cut 90-day churn from 41% to 19% in one quarter' },
    { id: 'globex-mix', company: 'Globex', status: '1️⃣ Pending Review', ago: 2, chart: { kind: 'donut' },
      stat: 'Marketplace fees are 46% of Globex revenue, but ads grow fastest' },
    { id: 'initech-meetings', company: 'Initech', status: '1️⃣ Pending Review', ago: 3, chart: { kind: 'bar' },
      stat: 'Initech managers spend 17 hours a week in meetings' },
    { id: 'piedpiper-storage', company: 'Pied Piper', status: '1️⃣ Pending Review', ago: 1, chart: { kind: 'line' },
      stat: 'Pied Piper cut storage cost per user by 61% in 9 months' },
    { id: 'wonka-tickets', company: 'Wonka Industries', status: '1️⃣ Pending Review', ago: 4, chart: { kind: 'bar' },
      stat: 'Wonka\'s golden ticket contest acquired customers at $6 each' },
    { id: 'vandelay-margin', company: 'Vandelay Industries', status: 'Idea', ago: 5, chart: { kind: 'bar' },
      stat: 'Vandelay earns 38% gross margin on imports and 12% on exports' },
    { id: 'massive-rnd', company: 'Massive Dynamic', status: '1️⃣ Pending Review', ago: 6, chart: { kind: 'donut' },
      stat: 'Massive Dynamic puts 44% of its budget into R&D' },
    { id: 'dunder-regions', company: 'Dunder Mifflin', status: '1️⃣ Pending Review', ago: 7, chart: { kind: 'bar' },
      stat: 'Dunder Mifflin\'s smallest branch grew sales 14% this year' },
    { id: 'tyrell-pricing', company: 'Tyrell Corp', status: '🙌 In Beehiiv', ago: 9, chart: { kind: 'donut' },
      stat: '61% of Tyrell customers pick the middle plan' },
    { id: 'bluth-stand', company: 'Bluth Company', status: '🙌 In Beehiiv', ago: 10, chart: { kind: 'line' },
      stat: 'The Bluth banana stand took margin from 22% to 58% in 15 years' },
    { id: 'sterling-spend', company: 'Sterling Cooper', status: '🙌 In Beehiiv', ago: 11, chart: { kind: 'bar' },
      stat: 'Sterling Cooper clients moved 40 points of ad spend online in 6 years' },
  ];

  // ---------------------------------------------------------------- skills
  const SKILLS = [
    ['migrate', 'delivery', 'Builds the beehiiv draft for a finished edition through the beehiiv MCP: body, settings, thumbnail and ads. Ends at a draft for review and never schedules a send.', ['beehiiv', 'Notion', 'Claude'], 'Ops', -64],
    ['migrate-ads', 'delivery', 'Swaps the ad blocks in a beehiiv draft for the ads booked on its send date, with logo, headline, inline links, CTA and UTMs.', ['beehiiv', 'Notion'], 'Ops', -58],
    ['issue-check', 'delivery', 'QA for any beehiiv issue before review: segments, A/B subject lines, preview text, slug, ad blocks, links and formatting, as a numbered pass/fail list.', ['beehiiv', 'Notion'], 'Ops', -51],
    ['close-out', 'delivery', 'After a send, marks every deliverable published, attaches the ad screenshot from the sent email and closes the issue row.', ['beehiiv', 'Notion'], 'Ops', -44],
    ['performance-report', 'delivery', 'Pulls post stats from the beehiiv MCP 7 and 14 days after a sponsored send and writes the sponsor-facing performance report.', ['beehiiv', 'Notion', 'Slack'], 'Partnerships', -40],
    ['domain-insights', 'delivery', 'Builds a sponsor\'s domain insights page: which companies clicked their ads, from beehiiv click data mapped to company domains. No personal data.', ['beehiiv', 'Apollo', 'Notion'], 'Partnerships', -37],
    ['rerun-segment', 'delivery', 'Creates the beehiiv segment for a rerun: everyone who has not opened the original, minus recent unsubscribes.', ['beehiiv'], 'Content', -33],
    ['retargeting-segment', 'delivery', 'Builds a beehiiv segment of readers who clicked a sponsor\'s links, ready for a retargeting sequence.', ['beehiiv', 'Notion'], 'Partnerships', -30],
    ['ad-scheduler', 'delivery', 'Recommends dates for sponsor deliverables from open inventory and the scheduling rules. Read-only: it proposes, people confirm.', ['Notion'], 'Ops', -82],
    ['content-calendar', 'delivery', 'Scores every upcoming edition green, yellow or red against its send gates: beehiiv draft, ads, subject lines and sponsor approvals.', ['beehiiv', 'Notion', 'Slack'], 'Ops', -21],
    ['daily-pulse', 'dailies', 'Scans a list of trusted chart sources once a day and files the best candidates as new Daily ideas.', ['Notion', 'Web Search'], 'Content', -16],
    ['ad-copy', 'content', 'Writes 5 newsletter ad variations for a sponsor with angles, character counts and UTM guidance.', ['Notion', 'Claude'], 'Partnerships', -120],
    ['outline', 'content', 'Structures a breakdown before research starts: the thesis, the beats and the chart each beat needs.', ['Notion'], 'Founder', -140],
    ['research', 'content', 'Deep research for a breakdown, written to the article page with every source linked.', ['Notion', 'Web Search'], 'Founder', -138],
    ['draft', 'content', 'Writes the first draft of a breakdown from the outline and research, in the house voice.', ['Notion', 'Claude'], 'Founder', -136],
    ['final-review', 'content', 'Spelling, grammar, fact-check and link check on a draft, as a numbered list of fixes to accept or skip.', ['Notion', 'Web Search'], 'Content', -96],
    ['social', 'content', 'Repurposes a breakdown into LinkedIn and X posts with hooks and self-comments.', ['Notion', 'Claude'], 'Content', -110],
    ['reply', 'sales', 'Drafts a reply to a sponsor or partnership email with the strategy behind it, ready to edit and send.', ['Attio', 'Notion'], 'Partnerships', -150],
    ['proposal', 'sales', 'Builds a 3-tier sponsorship proposal from the rate card and the sponsor\'s goals.', ['Attio', 'Notion'], 'Partnerships', -148],
    ['review', 'sales', 'Stress-tests a draft reply or proposal before it goes out: pricing, tone and missing asks.', ['Attio'], 'Founder', -100],
    ['crm-wrap', 'crm', 'After any sponsor move, syncs the deal in Attio: stage, value, next action and a dated note.', ['Attio', 'Slack'], 'Partnerships', -26],
    ['leadscore', 'outbound', 'Scores prospects against the ideal customer profile and routes each one to the right outreach lane.', ['Notion', 'Apollo'], 'Partnerships', -70],
    ['harvest', 'meta', 'End-of-session sweep: captures what was learned in the conversation and writes it into the skills and docs it affects.', ['GitHub'], 'Ops', -12],
    ['weekly', 'ops', 'Builds the weekly plan: open deliverables, sponsor follow-ups and each person\'s 3 focus tasks.', ['Notion', 'Slack'], 'Ops', -90],
  ];
  const CONTEXT = {
    migrate: ['context/migration-checklist.md', 'context/ad-specs.md'], 'migrate-ads': ['context/ad-specs.md'],
    'issue-check': ['context/migration-checklist.md'], 'ad-copy': ['context/voice-guide.md', 'context/ad-specs.md'],
    reply: ['context/voice-guide.md', 'context/rate-card.md'], proposal: ['context/rate-card.md'],
    draft: ['context/voice-guide.md'],
    'performance-report': ['context/report-template.md'],
  };
  const WORKFLOWS = [
    { id: 'delivery', name: 'Newsletter delivery', color: '#4ADE80', steps: ['ad-scheduler', 'migrate-ads', 'migrate', 'issue-check', 'close-out', 'performance-report'] },
    { id: 'dailies', name: 'Dailies', color: '#FB923C', steps: ['daily-pulse'] },
    { id: 'sales', name: 'Sales', color: '#4A9EFF', steps: ['reply', 'review', 'proposal', 'crm-wrap'] },
    { id: 'content', name: 'Content', color: '#C084FC', steps: ['outline', 'research', 'draft', 'final-review', 'social'] },
    { id: 'retarget', name: 'Retargeting', color: '#4ADE80', steps: ['domain-insights', 'retargeting-segment', 'rerun-segment'] },
  ];

  const ROLES = ['Founder', 'Ops', 'Partnerships', 'Content'];

  function build(nowMs) {
    const r = prng(20261015);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const between = (a, b) => a + Math.floor(r() * (b - a + 1));
    const base = new Date(nowMs); base.setHours(0, 0, 0, 0);
    const dayAt = n => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
    const iso = n => { const d = dayAt(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const short = n => { const d = dayAt(n); return `${MON[d.getMonth()]} ${d.getDate()}`; };
    const stamp = (n, h = 10) => { const d = dayAt(n); d.setHours(h, between(0, 59), 0, 0); return d.toISOString(); };
    const money = (lo, hi, step = 25) => Math.round(between(lo, hi) / step) * step + between(1, step - 1);
    const sponsorNames = COMPANIES.map(c => c.name);

    // ---------------------------------------------------- deliverables (one master list)
    const editionDays = [];
    for (let n = -380; n <= 140; n++) if ([0, 3].includes(dayAt(n).getDay())) editionDays.push(n);
    const slotUse = new Map();
    const deliverables = [];
    const phaseOf = {};
    let cursor = -380;
    let k = 0;
    while (cursor < 120) {
      const sponsor = sponsorNames[(k * 7 + 3) % sponsorNames.length];
      k++;
      phaseOf[sponsor] = (phaseOf[sponsor] || 0) + 1;
      const phase = phaseOf[sponsor];
      const nAds = between(3, 4);
      let ed = editionDays.findIndex(n => n >= cursor);
      const adDays = [];
      while (adDays.length < nAds && ed < editionDays.length) {
        const n = editionDays[ed];
        if ((slotUse.get(n) || 0) < 2) { adDays.push(n); slotUse.set(n, (slotUse.get(n) || 0) + 1); ed += 2; } else ed++;
      }
      adDays.forEach((n, i) => deliverables.push({ sponsor, phase, kind: 'ad', label: `Ad ${i + 1}`, offset: n, amount: money(700, 5900) }));
      if (r() < 0.45 && adDays[1] != null) deliverables.push({ sponsor, phase, kind: 'sb', label: 'SB', offset: adDays[1], amount: money(5500, 39000, 250) });
      if (adDays[0] != null) {
        deliverables.push({ sponsor, phase, kind: 'li', label: 'LI 1', offset: adDays[0] + 1, amount: money(900, 7400, 50) });
        deliverables.push({ sponsor, phase, kind: 'x', label: 'X 1', offset: adDays[0] + 2, amount: 0 });
      }
      const last = adDays[adDays.length - 1];
      if (last != null) {
        deliverables.push({ sponsor, phase, kind: 'retarget', label: 'Retargeting', offset: last + 3, amount: money(250, 3100) });
        deliverables.push({ sponsor, phase, kind: 'insights', label: 'Domain Insights', offset: last + 10, amount: 0 });
      }
      cursor += between(9, 13);
    }
    const TYPE = { ad: 'Newsletter Ad', sb: 'Sponsored Breakdown', li: 'Linkedin Post', x: 'X Post', retarget: 'Retargeting Sequence', insights: 'Other' };
    const statusFor = n => n < 0 ? 'Published' : n <= 3 ? 'Finalized and Scheduled' : n <= 10 ? pick(['In Review', 'Finalized and Scheduled']) : n <= 21 ? pick(['Rough Draft', 'In Review']) : 'Not started';
    deliverables.forEach(x => { x.status = statusFor(x.offset); x.name = `${x.sponsor} - P${x.phase} - ${x.label}`; });

    const bookings = {
      entries: deliverables.filter(x => x.amount > 0).sort((a, b) => a.offset - b.offset).map(x => ({ date: iso(x.offset), amount: x.amount, name: x.name })),
      meta: { pulled: iso(0), matched: 0, skippedUnlinked: 0, skippedUndated: 0 },
    };
    bookings.meta.matched = bookings.entries.length;

    const calendar = {
      meta: {
        source: 'Notion · Deliverables DB', pulled: iso(0), url: LINK('deliverables'), live: true,
        types: [
          { key: 'Newsletter Ad', short: 'Ad', color: '#B19EF8' }, { key: 'Sponsored Breakdown', short: 'Breakdown', color: '#4ADE80' },
          { key: 'Linkedin Post', short: 'LinkedIn', color: '#4A9EFF' }, { key: 'X Post', short: 'X', color: '#9E9EA8' },
          { key: 'Retargeting Sequence', short: 'Retargeting', color: '#FC6932' }, { key: 'Other', short: 'Other', color: '#7A7A88' },
        ],
        statuses: [
          { key: 'Not started', color: '#7A7A88' }, { key: 'Rough Draft', color: '#FC6932' }, { key: 'In Review', color: '#FBBF24' },
          { key: 'Finalized and Scheduled', color: '#4A9EFF' }, { key: 'Published', color: '#4ADE80' },
        ],
      },
      items: deliverables.filter(x => x.offset >= -14).sort((a, b) => a.offset - b.offset)
        .map(x => ({ name: x.name, type: TYPE[x.kind], status: x.status, phase: `Phase ${x.phase}`, date: iso(x.offset) })),
    };

    const PULSE_LABEL = { ad: null, sb: 'Breakdown', li: 'LinkedIn', x: 'X', retarget: 'Retarget', insights: 'Domain Ins.' };
    const camp = new Map();
    for (const x of deliverables.filter(d => d.offset >= -120).sort((a, b) => a.offset - b.offset)) {
      const key = `${x.sponsor}|${x.phase}`;
      if (!camp.has(key)) camp.set(key, { name: x.sponsor, sponsor: `Phase ${x.phase}`, items: [] });
      camp.get(key).items.push({ t: PULSE_LABEL[x.kind] || x.label, date: short(x.offset), s: x.offset < 0 ? 'done' : x.status === 'Not started' ? 'todo' : 'active', url: LINK(`deliverable/${x.sponsor.toLowerCase().replace(/\W+/g, '-')}-${x.phase}`) });
    }
    const pulse = {
      campaigns: [...camp.values()].filter(c => c.items.some(i => i.s !== 'done') && c.items.some(i => i.s === 'done' || i.s === 'active'))
        .sort((a, b) => a.name.localeCompare(b.name)).slice(0, 7),
      generatedAt: new Date(nowMs).toISOString(),
    };

    // ---------------------------------------------------- pipeline (CRM)
    const lifecycles = ['New business', 'Renewal', 'Upsell'];
    const OPEN = [
      ['Acme Corp - Q1 ad bundle', 'Warm Lead', 13400, 6, 'New business', 'Intro call booked with their growth lead, Dana Whitfield.'],
      ['Globex - Sponsored Breakdown', 'Sent Proposal', 31200, 5, 'New business', 'Proposal sent, waiting on budget sign-off.'],
      ['Hooli - Phase 4 (renewal)', 'Verbal / Contract', 9100, 4, 'Renewal', 'Verbal yes from Marcus Lindqvist. Contract out for signature.'],
      ['Initech - Daily launch package', 'Talking', 17300, 19, 'New business', 'Second call done. They want the Daily founding slots.'],
      ['Pied Piper - Phase 3 (renewal)', 'Sent Proposal', 22600, 9, 'Renewal', 'Sent 2 options, follow up Friday.'],
      ['Vandelay Industries - Ads + LinkedIn', 'Talking', 4100, 44, 'New business', 'Gone quiet after the rate card. Nudge.'],
      ['Wonka Industries - Sponsored Breakdown', 'Warm Lead', 11900, 12, 'New business', 'Inbound from their partnerships team.'],
      ['Massive Dynamic - Q2 bundle', 'Sent Proposal', 32400, 37, 'Upsell', 'Proposal out 5 weeks. Chase with a case study.'],
      ['Tyrell Corp - Retargeting add-on', 'Talking', 7700, 8, 'Upsell', 'Interested in the retargeting sequence.'],
      ['Weyland-Yutani - Annual partnership', 'Warm Lead', 52500, 22, 'New business', 'Procurement wants a 12-month view.'],
      ['Sterling Cooper - Phase 2 (renewal)', 'Verbal / Contract', 19800, 13, 'Renewal', 'Agreed on the call, waiting on the PO.'],
      ['Bluth Company - Daily ads', 'Talking', 12100, 3, 'New business', 'Wants 5 Daily slots in the launch month.'],
      ['Dunder Mifflin - Ads', 'Warm Lead', 3300, 31, 'New business', 'Met at a conference, send the media kit.'],
      ['Virtucon - Sponsored Breakdown', 'Sent Proposal', 27400, 2, 'New business', 'Proposal sent yesterday.'],
      ['Nakatomi Trading - Phase 2 (renewal)', 'Talking', 6800, 51, 'Renewal', 'Champion left. Find the new owner.'],
      ['Prestige Worldwide - Launch week', 'Warm Lead', 9700, 15, 'New business', 'Wants the launch-week package.'],
      ['Globex - Domain insights upsell', 'Talking', 1600, 26, 'Upsell', 'Sent the sample report.'],
      ['Acme Corp - Daily founding slot', 'Sent Proposal', 15900, 11, 'Upsell', 'Founding rate offer, expires end of month.'],
      ['Hooli - LinkedIn add-on', 'Warm Lead', 5200, 64, 'Upsell', ''],
      ['Initech - Retargeting', 'Warm Lead', 2400, 90, 'Upsell', 'Parked until their next quarter.'],
      ['Wonka Industries - Ads', 'Talking', 21500, 7, 'New business', 'Drafting the media plan with them.'],
      ['Pied Piper - Breakdown rerun', 'Warm Lead', 0, 18, 'Upsell', 'Unpriced, they asked about a rerun.'],
    ];
    const deals = OPEN.map(([name, stage, value, age, lifecycle, nextAction], i) => ({
      name, stage, value, stageSince: iso(-age), lifecycle, nextAction, url: LINK(`crm/deal-${i + 1}`),
    }));
    const WON = [];
    const wonNames = ['Acme Corp - Phase 2', 'Hooli - Phase 3 (renewal)', 'Globex - Breakdown', 'Pied Piper - Phase 2 (renewal)', 'Wonka Industries - Ads', 'Massive Dynamic - Q1 bundle',
      'Tyrell Corp - Phase 1', 'Sterling Cooper - Phase 1', 'Bluth Company - Ads', 'Dunder Mifflin - LinkedIn', 'Virtucon - Ads', 'Nakatomi Trading - Phase 1',
      'Initech - Ads', 'Weyland-Yutani - Pilot', 'Vandelay Industries - Ads', 'Prestige Worldwide - Ads', 'Acme Corp - Retargeting', 'Globex - Phase 2 (renewal)', 'Hooli - Breakdown'];
    const wonAges = [2, 5, 9, 16, 22, 29, 37, 48, 55, 63, 77, 91, 104, 128, 156, 190, 231, 280, 333];
    wonNames.forEach((name, i) => WON.push({ name, stage: 'Won', value: money(2600, 41000, 50), closedOn: iso(-wonAges[i]), lifecycle: pick(lifecycles), deliverables: `${between(3, 6)} newsletter ads, ${between(1, 2)} LinkedIn posts, a retargeting sequence and a domain insights report.`, nextAction: null, url: LINK(`crm/won-${i + 1}`) }));
    const LOST = [
      { name: 'Oceanic Air - Breakdown', stage: 'Lost', value: 26300, closedOn: iso(-3), lifecycle: 'New business', deliverables: null, nextAction: 'Went with a podcast instead.', url: LINK('crm/lost-1') },
      { name: 'Gekko & Co - Ads', stage: 'Bad Fit', value: 0, closedOn: iso(-5), lifecycle: 'New business', deliverables: null, nextAction: 'Outside our audience.', url: LINK('crm/lost-2') },
    ];
    const closed = [...WON, ...LOST];
    const pipeline = {
      meta: {
        currency: 'USD', pulled: iso(0), staleDays: 30, live: true,
        note: 'Synthetic open deals for the demo.',
        stages: [
          { key: 'Warm Lead', prob: 0.1, color: '#FBBF24' }, { key: 'Talking', prob: 0.3, color: '#4A9EFF' },
          { key: 'Sent Proposal', prob: 0.6, color: '#B19EF8' }, { key: 'Verbal / Contract', prob: 0.9, color: '#2E6FB7' },
        ],
      },
      deals: deals.sort((a, b) => (b.value - a.value) || a.name.localeCompare(b.name)),
      won: WON.map(d => ({ name: d.name, value: d.value, closedOn: d.closedOn })),
    };

    const mrows = [];
    for (const d of deals) {
      const kind = d.stage === 'Sent Proposal' ? 'proposal' : d.stage === 'Verbal / Contract' ? 'verbal' : null;
      const age = Math.round((base - new Date(d.stageSince + 'T00:00:00')) / 86400000);
      if (kind && age < 14) mrows.push({ name: d.name, stage: d.stage, bucket: kind, value: d.value, closedOn: d.stageSince, lifecycle: d.lifecycle, deliverables: null, nextAction: d.nextAction, url: d.url, daysAgo: age });
    }
    for (const d of closed) {
      const age = Math.round((base - new Date(d.closedOn + 'T00:00:00')) / 86400000);
      const bucket = { Won: 'won', Lost: 'lost', 'Bad Fit': 'badfit' }[d.stage];
      if (age < 7) mrows.push({ ...d, bucket, daysAgo: age });
    }
    mrows.sort((a, b) => (a.daysAgo - b.daysAgo) || (b.value - a.value));
    const tot = b => ({ n: mrows.filter(x => x.bucket === b).length, value: mrows.filter(x => x.bucket === b).reduce((s, x) => s + (x.value || 0), 0) });
    const movement = {
      meta: { pulled: iso(0), windowDays: 7, proposalWindowDays: 14, verbalWindowDays: 14, closedTracked: closed.length, undated: 0 },
      totals: { won: tot('won'), lost: tot('lost'), badfit: tot('badfit'), proposal: tot('proposal'), verbal: tot('verbal') },
      rows: mrows,
    };

    const renewals = {
      meta: { pulled: iso(0), endingDays: 21, recentlyEndedDays: 30, sponsorsTracked: 14, actionable: 2, suppressed: [{ sponsor: 'Prestige Worldwide', why: 'one-off launch campaign, no renewal planned' }], unmatchedHolds: [] },
      rows: [
        { sponsor: 'Dunder Mifflin', band: 'ended', end: iso(-6), last: iso(-6), remaining: 0, daysLeft: null, daysSince: 6, deal: null,
          priorDeal: { name: 'Dunder Mifflin - LinkedIn', stage: 'Won', value: 4950, url: LINK('crm/won-10') }, hold: null },
        { sponsor: 'Virtucon', band: 'ending', end: iso(12), last: iso(-2), remaining: 2, daysLeft: 12, daysSince: null,
          deal: { name: 'Virtucon - Sponsored Breakdown', stage: 'Warm Lead', value: 0, url: LINK('crm/deal-14'), lifecycle: 'Renewal' }, priorDeal: null, hold: null },
        { sponsor: 'Weyland-Yutani', band: 'ending', end: iso(16), last: iso(-1), remaining: 1, daysLeft: 16, daysSince: null, deal: null, priorDeal: null,
          hold: { kind: 'parked', until: iso(30), why: 'Their budget resets next quarter; revisit then.', who: 'Partnerships' } },
      ],
    };

    // ---------------------------------------------------- audience
    const points = [];
    let ai = 0;
    for (let n = -400; n <= -1; n++) {
      if (![0, 3].includes(dayAt(n).getDay())) continue;
      const grow = 38200 + (400 + n) / 400 * 23400 + between(-260, 260);
      const segment = ai % 7 === 5;
      const d = dayAt(n); d.setHours(14, 0, 0, 0);
      points.push({
        date: Math.floor(d.getTime() / 1000), recipients: Math.round(segment ? grow * 0.42 : grow),
        openRate: 41 + r() * 11, clickRate: 2.1 + r() * 2.6,
        title: (segment ? 'Rerun: ' : '') + ARTICLES[ai % ARTICLES.length], url: LINK(`p/edition-${ai + 1}`),
      });
      ai++;
    }
    const lastFull = [...points].reverse().find(p => !p.title.startsWith('Rerun'));
    const subscribers = {
      stats: { active: lastFull.recipients + 317, free: lastFull.recipients + 317, premium: 0, openRate: 46.4, clickRate: 3.2, totalSent: points.length },
      points, generated_at: new Date(nowMs).toISOString(),
    };
    const followers = { generated: new Date(nowMs - 3 * 3600e3).toISOString(), followers: { x: 23860, linkedin: 68420 } };

    // ---------------------------------------------------- content calendar
    const GATES = [
      ['draft_exists', 'A beehiiv draft exists for this edition'], ['draft_has_content', 'The draft holds the final article'],
      ['subject_set', 'Subject line and A/B variants are set'], ['preview_set', 'Preview text is set'],
      ['thumbnail_set', 'Thumbnail is set'], ['segment_set', 'Audience segment is chosen'],
      ['ad_slots_filled', 'Both ad slots are filled'], ['ad_drafted', 'Ad copy is placed in the draft'],
      ['sponsor_approved', 'Every sponsor approved their ad'], ['utm_links_set', 'UTM links on every ad'],
      ['date_matches', 'beehiiv send date matches the calendar'], ['no_slack_blocker', 'No open blocker in sponsor threads'],
      ['send_scheduled', 'Scheduled in beehiiv'],
    ];
    const PROGRESS = [['content_progress', 'Article drafted'], ['content_locked', 'Article final'], ['tasks_pack', 'Sponsor task pack created']];
    const FAILNOTES = {
      sponsor_approved: 'Waiting on the sponsor to approve the headline change.',
      ad_drafted: 'Ad 2 copy is still in review.', subject_set: 'Only 2 of 4 subject lines written.',
      no_slack_blocker: 'Sponsor asked to swap the CTA link, not done yet.', ad_slots_filled: 'Slot 2 is still open.',
      thumbnail_set: 'Thumbnail not uploaded.', draft_has_content: 'The draft still has the outline, not the final.',
    };
    const editions = [];
    let ed = 210;
    for (let n = -28; n <= 35; n++) {
      if (![0, 3].includes(dayAt(n).getDay())) continue;
      ed++;
      const ads = deliverables.filter(x => x.offset === n && (x.kind === 'ad' || x.kind === 'sb'));
      const isRerun = ed % 5 === 0;
      const article = ARTICLES[(ed * 3) % ARTICLES.length];
      const sent = n < 0;
      const forceRed = n > 0 && n <= 7 && !editions.some(e => e.score === 'red' && e.date >= iso(0));
      const checkpoints = [];
      const fail = new Set(forceRed ? ['sponsor_approved', 'ad_drafted'] : (!sent && n > 1 && n <= 8 && r() < 0.3 ? [pick(['thumbnail_set', 'subject_set'])] : []));
      GATES.forEach(([id, label]) => {
        const applicable = sent || id === 'date_matches' || (id === 'send_scheduled' ? n <= 1 : n <= 8);
        let met = applicable && (sent || !fail.has(id));
        if (id === 'ad_slots_filled' && !sent && applicable) met = ads.filter(a => a.kind === 'ad').length >= 2;
        checkpoints.push({ id, label, group: 'Send Gate', tier: 'must', applicable, met, note: applicable && !met ? (FAILNOTES[id] || 'Not done yet.') : '' });
      });
      PROGRESS.forEach(([id, label], i) => {
        const met = sent || n < 6 + i * 4 || r() < 0.3;
        checkpoints.push({ id, label, group: 'Build Progress', tier: 'should', applicable: true, met, note: met ? '' : 'In progress.' });
      });
      const app = checkpoints.filter(c => c.applicable);
      const must = app.filter(c => c.tier === 'must');
      const mustFailed = must.filter(c => !c.met).map(c => c.label);
      if (sent && n === -11) { // one sent edition with a flag
        const c = checkpoints.find(x => x.id === 'utm_links_set'); c.met = false; c.note = 'One ad went out without its UTM parameters.';
        mustFailed.push(c.label);
      }
      const met = app.filter(c => c.met).length;
      const score = mustFailed.length && !sent ? 'red' : mustFailed.length ? 'yellow' : (sent || met === app.length) ? 'green' : 'yellow';
      const hook = SUBJECTS[(ed * 3) % ARTICLES.length];
      const subject = isRerun ? `Rerun: ${hook}` : hook;
      editions.push({
        date: iso(n), dow: DOW[dayAt(n).getDay()], edition: ed, articleName: isRerun ? `${article} Rerun` : article, isRerun,
        issueUrl: LINK(`issues/${ed}`), sent, score,
        met, total: app.length, mustMet: must.filter(c => c.met).length, mustTotal: must.length, mustFailed,
        checkpoints,
        deliverables: ads.map(a => ({ name: a.name, type: TYPE[a.kind], adStatus: a.status })),
        beehiiv: n <= 10 ? { postId: `demo-${ed}`, status: sent ? 'published' : n <= 1 ? 'scheduled' : 'draft', url: LINK(`beehiiv/posts/demo-${ed}`), subject, preview: 'One company, one strategy, explained in 6 minutes.', subjectVariants: [subject, article, `${hook} (6 min read)`] } : null,
        slackNotes: ads.length && (ed % 3 === 0 || forceRed) ? [{ sponsor: ads[0].sponsor, note: forceRed ? 'Asked for a new headline on Ad 2, approval pending.' : 'Confirmed the creative, no changes.', blocker: forceRed }] : [],
      });
    }
    const contentCalendar = {
      meta: { source: 'Notion Issues + Deliverables, beehiiv drafts and sponsor Slack threads', pulled: iso(0), issuesUrl: LINK('issues'), windowNote: 'Synthetic editions for the demo.' },
      editions,
    };

    // ---------------------------------------------------- skills
    const skills = SKILLS.map(([id, cat, description, integrations, creator, ago]) => {
      const created = iso(ago);
      return {
        id, name: id, description, integrations, contextFiles: CONTEXT[id] || [], workflow: [cat],
        created, creator, isNew: ago >= -30,
        searchText: `${id} ${description} ${integrations.join(' ')}`.toLowerCase(),
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    const workflows = WORKFLOWS.map(w => ({
      id: w.id, name: w.name, color: w.color,
      steps: w.steps.map(s => ({ skill: s, label: `/${s}`, description: (SKILLS.find(x => x[0] === s) || [])[2] || '' })),
    }));
    const sp = {};
    for (const [id, , , , creator, ago] of SKILLS) {
      const edits = {};
      edits[creator] = between(3, 14);
      for (const p of ROLES) if (p !== creator && r() < 0.45) edits[p] = between(1, 8);
      if (r() < 0.6) edits['Claude (cloud)'] = between(1, 9);
      if (['daily-pulse', 'content-calendar', 'performance-report'].includes(id)) edits.Automation = between(4, 12);
      const totalEdits = Object.values(edits).reduce((s, v) => s + v, 0);
      const top = Object.entries(edits).sort((a, b) => b[1] - a[1])[0][0];
      const lastEditor = pick(Object.keys(edits).filter(n => n !== 'Automation'));
      sp[id] = {
        creator, created: iso(ago), edits, totalEdits, edits30d: between(0, Math.min(totalEdits, 9)), topEditor: top,
        lastEdited: iso(-between(0, Math.min(-ago, 70))), lastEditor, lines: between(90, 640), files: between(1, 3),
        unattended: ['daily-pulse', 'content-calendar', 'performance-report'].includes(id), retired: false,
      };
    }
    const skillPeople = { meta: { generated: iso(0), note: 'Synthetic edit history for the demo.' }, skills: sp };

    // ---------------------------------------------------- daily research summary
    // The research run files topics; people approve some for drafting, and approved
    // drafts are migrated to beehiiv.
    const KINDS = [
      { kind: 'x', label: '@contoso_charts' }, { kind: 'x', label: '@woodgrove_data' }, { kind: 'linkedin', label: 'Fabrikam Research' },
      { kind: 'reddit', label: 'r/northwind_charts' }, { kind: 'youtube', label: '@TailspinExplains' }, { kind: 'newsletter', label: 'Litware Weekly' },
      { kind: 'web', label: 'adventureworks.example' }, { kind: 'newsletter', label: 'Proseware Notes' }, { kind: 'web', label: 'contoso-research.example' },
    ].map((s, i) => ({ ...s, key: `src-${i}`, url: LINK(`sources/${i}`) }));
    const CHARTS = ['Bar', 'Line', 'Donut', 'Area', 'Stacked bar', 'Scatter'];
    const PHRASES = ['revenue per employee', 'churn by cohort', 'pricing tiers', 'ad spend mix', 'R&D intensity', 'margin by line', 'growth by region',
      'payback period', 'net retention', 'CAC by channel', 'inventory turns', 'gross margin trend', 'subscriber growth', 'take rate', 'customer mix'];
    const MIGRATED = ['🙌 In Beehiiv', '✅ Published'];
    const summaryRows = [];
    for (let i = 0; i < 150; i++) {
      const ago = Math.floor(Math.pow(r(), 1.3) * 70);
      const company = r() < 0.12 ? 'Multiple' : pick(sponsorNames);
      const roll = r();
      const outcome = ago < 3 ? (roll < 0.7 ? 'open' : 'archived') : roll < 0.38 ? 'approved' : roll < 0.86 ? 'archived' : 'open';
      const parked = r() < 0.2;
      const status = outcome === 'approved' ? (ago <= 3 ? '✍️ Drafting' : parked ? '⏸️ Parked' : ago > 10 ? '✅ Published' : '🙌 In Beehiiv') : outcome === 'archived' ? '📁 Archived' : pick(['1️⃣ Pending Review', 'Idea']);
      summaryRows.push({
        id: `sum-${i}`, url: LINK(`ideas/sum-${i}`), created: stamp(-ago, between(6, 20)),
        name: `${company === 'Multiple' ? 'Big Tech' : company}: ${pick(PHRASES)}`, status, published: MIGRATED.includes(status),
        outcome, company, chartType: r() < 0.9 ? pick(CHARTS) : null, sponsored: r() < 0.06, source: r() < 0.88 ? pick(KINDS) : null,
      });
    }
    DAILIES.forEach((s, i) => {
      summaryRows.push({
        id: `sum-${s.id}`, url: LINK(`ideas/${s.id}`), created: stamp(-s.ago, 8 + i), name: s.stat, status: s.status,
        published: MIGRATED.includes(s.status), outcome: MIGRATED.includes(s.status) ? 'approved' : 'open', company: s.company,
        chartType: { line: 'Line', bar: 'Bar', donut: 'Donut' }[s.chart.kind], sponsored: false, source: KINDS[s.id.length % KINDS.length],
      });
    });
    summaryRows.sort((a, b) => b.created.localeCompare(a.created));

    // ---------------------------------------------------- Big 3
    const monday = n => { const d = dayAt(n); return -((d.getDay() + 6) % 7) + n; };
    const B3 = {
      Founder: [['Write the Pied Piper breakdown', 'In Progress', 'Ship 2 breakdowns a month', 'High', 'Medium', 8, 2],
        ['Record 3 short video explainers', 'Next Up', 'Grow LinkedIn', 'Medium', 'Medium', 6, 5],
        ['Sign off the Daily sponsor package', 'Blocked', 'Launch the Daily', 'High', 'Low', 9, 1]],
      Ops: [['Automate the 14-day performance report', 'In Progress', 'Zero manual reporting', 'High', 'Medium', 8, 3],
        ['Move the send-gate checks to a daily run', 'Next Up', 'Zero manual reporting', 'Medium', 'Low', 7, 6],
        ['Tidy the sponsor portal template', 'In Progress', 'Better sponsor experience', 'Medium', 'Low', 6, 4]],
      Partnerships: [['Close 3 Daily launch sponsors', 'In Progress', 'Fill Q1 inventory', 'High', 'High', 8, 9],
        ['Chase every proposal older than 30 days', 'Next Up', 'Fill Q1 inventory', 'High', 'Low', 9, 2],
        ['Draft the renewal playbook', 'In Progress', 'Lift renewals', 'Medium', 'Medium', 6, 7]],
      Content: [['Trial 2 new chart sources for the research run', 'In Progress', 'Launch the Daily', 'Medium', 'Low', 7, 3],
        ['Pick the 3 best breakdowns of the year to rerun', 'Next Up', 'Grow the list', 'High', 'Low', 8, 5],
        ['Write the referral program emails', 'Blocked', 'Grow the list', 'Medium', 'Medium', 5, 8]],
    };
    const B3_LAST = {
      Founder: [['Outline the Pied Piper breakdown', 'done'], ['Review the Q4 sponsor list', 'done'], ['Record a video explainer', 'carried']],
      Ops: [['Fix the stale campaign tracker', 'done'], ['Write the send-gate checklist', 'done'], ['Clean up old automations', 'dropped']],
      Partnerships: [['Send 5 renewal proposals', 'done'], ['Book 3 discovery calls', 'done'], ['Close the Daily launch sponsors', 'carried']],
      Content: [['Rerun last spring\'s best piece', 'done'], ['Draft the referral emails', 'carried'], ['Audit the chart sources', 'done']],
    };
    const B3_BULLETS = [
      ['Drafted 2 of 4 sections', 'Charts briefed to design'], ['Script for the first one written'], ['Waiting on the final price sheet'],
      ['Report template agreed', 'Pull from beehiiv working for 7-day stats'], [], ['Header and timeline sections done'],
      ['2 verbal yeses, 1 contract out'], ['6 chased, 2 replied'], ['First draft shared for comments'],
      ['1 source added, 1 rejected'], ['Shortlist of 6 made'], ['Blocked on the reward design'],
    ];
    const big3Activity = {};
    let b3i = 0;
    const big3 = {
      live: true, pulled: new Date(nowMs - 2 * 3600e3).toISOString(),
      people: ROLES.map(name => ({
        name,
        items: B3[name].map(([task, status, goal, impact, effort, score, due]) => {
          const id = `b3-${++b3i}`;
          big3Activity[id] = B3_BULLETS[b3i - 1];
          return { id, task, status, goal, impact, effort, score, due: iso(due), url: LINK(`tasks/${id}`), notes: '' };
        }),
      })),
      lastWeek: {
        week: iso(monday(-7)),
        people: Object.fromEntries(ROLES.map(name => [name, B3_LAST[name].map(([task, outcome], i) => ({ task, outcome, url: LINK(`tasks/last-${name.toLowerCase()}-${i}`) }))])),
      },
    };
    const weeklyActivity = { summary: { tasks: big3Activity } };

    // ---------------------------------------------------- StrategyHub funnel
    const PERIODS = [['last_7_days', 'Last 7 days', 0.24], ['last_30_days', 'Last 30 days', 1], ['last_90_days', 'Last 90 days', 2.7], ['all_time', 'All time', 9.5]];
    const FEED = [['Free guide: 10 pricing plays', 'Sends the guide, then a short series on pricing.'], ['Strategy quiz', 'Quiz takers get their result and a 3-email follow-up.'],
      ['Webinar sign-ups', 'Reminder sequence, then the replay.'], ['Template pack download', 'Delivers the templates, then hands over to the welcome offer.']];
    const UNIFIED = [['Welcome offer, 5 emails', 'The core sequence everyone graduates into.'], ['Welcome offer, annual upgrade', 'For members on monthly, offers the annual plan.']];
    const aut = (name, desc, kind, i) => {
      const enrolled = kind === 'feed' ? between(1800, 5200) : between(1500, 3300);
      const completed = Math.round(enrolled * (0.42 + r() * 0.3));
      const exited = Math.round((enrolled - completed) * (0.3 + r() * 0.3));
      return { id: `${kind}-${i + 1}`, name: `[${kind.toUpperCase()}] ${name}`, description: desc, enrolled, completed, exited, in_progress: enrolled - completed - exited,
        period: { enrolled: 0 }, beehiiv_url: LINK(`beehiiv/automations/${kind}-${i + 1}`) };
    };
    const FEED_AUTS = FEED.map(([nm, ds], i) => aut(nm, ds, 'feed', i));
    const UNI_AUTS = UNIFIED.map(([nm, ds], i) => aut(nm, ds, 'unified', i));
    const PAGE_BASE = ['/', '/pricing', '/join', '/guide', '/quiz', '/webinar', '/templates'].map(path => [path, between(120, 2400), between(800, 6400)]);
    const FUNNEL_BASE = { purchases: between(40, 90), revenue: between(9000, 21000), refund: 0.02 + r() * 0.03, upsell: 0.12 + r() * 0.1 };
    const funnelFor = periodId => {
      const [, label, k] = PERIODS.find(p => p[0] === periodId) || PERIODS[1];
      const feedAuts = clone(FEED_AUTS), uniAuts = clone(UNI_AUTS);
      feedAuts.forEach(a => { a.period.enrolled = Math.round(a.enrolled / 9.5 * k); });
      uniAuts.forEach(a => { a.period.enrolled = Math.round(a.enrolled / 9.5 * k); });
      const sum = (list, f) => list.reduce((s, a) => s + f(a), 0);
      const pages = (host, f) => PAGE_BASE.map(([path, v, rev]) => {
        const visitors = Math.round(v * f * k);
        return { path, url: LINK(`${host}${path}`), visitors, revenue: ['/pricing', '/join'].includes(path) ? Math.round(rev * f * k) : 0 };
      }).sort((a, b) => b.visitors - a.visitors);
      const by_host = {};
      for (const [host, f] of [['hub.sbdash.demo', 1], ['go.sbdash.demo', 0.45]]) {
        const pg = pages(host, f);
        by_host[host] = { visitors: sum(pg, p => p.visitors), revenue: sum(pg, p => p.revenue), pages: pg };
      }
      const landingVisitors = Object.values(by_host).reduce((s, h) => s + h.visitors, 0);
      const landingRevenue = Object.values(by_host).reduce((s, h) => s + h.revenue, 0);
      const purchases = Math.round(FUNNEL_BASE.purchases * k);
      const offers = [['Membership, annual', 0.42], ['Membership, monthly', 0.33], ['Template pack', 0.15], ['Workshop replay', 0.1]];
      const revenue = Math.round(FUNNEL_BASE.revenue * k);
      return {
        generated_at: new Date(nowMs - 40 * 60e3).toISOString(), cached: false, period: periodId, period_label: label,
        available_periods: PERIODS.map(([id, l]) => ({ id, label: l })), errors: [],
        overview: { visitors: Math.round(landingVisitors * 2.6), sessions: Math.round(landingVisitors * 3.4), conversion_rate: purchases / landingVisitors },
        landing: { total_visitors: landingVisitors, total_revenue: landingRevenue, by_host },
        feed: { count: feedAuts.length, totals: { enrolled: sum(feedAuts, a => a.enrolled) }, period_totals: { enrolled: sum(feedAuts, a => a.period.enrolled) }, automations: feedAuts },
        unified: { count: uniAuts.length, totals: { enrolled: sum(uniAuts, a => a.enrolled), completed: sum(uniAuts, a => a.completed) },
          period_totals: { enrolled: sum(uniAuts, a => a.period.enrolled), completed: Math.round(sum(uniAuts, a => a.completed) / 9.5 * k) }, automations: uniAuts },
        purchases: { completions: purchases },
        purchases_all_time: { completions: Math.round(purchases / k * 9.5), revenue: Math.round(revenue / k * 9.5),
          by_goal: [{ goal: 'Membership purchase', completions: Math.round(purchases * 0.75), visitors: Math.round(landingVisitors * 0.3) },
            { goal: 'Template pack purchase', completions: Math.round(purchases * 0.25), visitors: Math.round(landingVisitors * 0.12) }] },
        stripe: {
          configured: true,
          period: { revenue, refunded_revenue: Math.round(revenue * 0.03), purchase_count: purchases, refund_rate: FUNNEL_BASE.refund, upsell_rate: FUNNEL_BASE.upsell,
            customers: Math.round(purchases * 0.92), top_offers: offers.map(([name, share]) => ({ name, purchases: Math.max(1, Math.round(purchases * share)), revenue: Math.round(revenue * share) })) },
          lifetime: { revenue: Math.round(revenue / k * 9.5), purchase_count: Math.round(purchases / k * 9.5), customers: Math.round(purchases / k * 8.7), upsell_rate: 0.17 },
          counts: { page_capped: false },
        },
      };
    };
    const funnelEmails = id => {
      const n = id.startsWith('unified') ? 5 : 3;
      const SUBJ = ['Here it is, as promised', 'The 1 pricing mistake we see most', 'What the best teams do differently', 'Your invite (closes Friday)', 'Last call on the founding price'];
      return { emails: Array.from({ length: n }, (_, i) => ({ subject_line: SUBJ[(i + id.length) % SUBJ.length], first_sent_at: Math.floor(dayAt(-300 + i).getTime() / 1000),
        last_sent_at: Math.floor(dayAt(-1).getTime() / 1000), status: 'active' })) };
    };

    // ---------------------------------------------------- shipping leaderboard
    const PEOPLE = [['Ops', false, 1180], ['Founder', false, 640], ['Content', false, 410], ['Partnerships', false, 230], ['Claude (cloud)', true, 1460], ['automation-bot', true, 520]];
    const contributors = PEOPLE.map(([name, isBot, commits]) => {
      const c30 = Math.round(commits * (0.1 + r() * 0.12));
      return { name, isBot, commits, commits30d: c30, commits90d: Math.round(c30 * (2.4 + r() * 0.6)), activeDays: isBot ? between(140, 300) : between(60, 190),
        added: commits * between(60, 140), removed: commits * between(20, 70), files: between(80, 600), first: iso(-between(300, 364)), last: iso(-between(0, 3)) };
    }).sort((a, b) => b.commits - a.commits);
    const shipping = { meta: { generated: iso(0), windowDays: 365, totalCommits: contributors.reduce((s, c) => s + c.commits, 0), routineCommitsExcluded: 0, note: 'Synthetic history for the demo.' },
      contributors, byMonth: {} };

    // ---------------------------------------------------- automation watchdog
    const WD = [
      ['Acme Corp', 'Performance report', 'Partnerships', 'drafted', '7-day report due tomorrow', 'Checked the stats pull ran and drafted the sponsor update.', 'None, ready for a human to send.'],
      ['Hooli', 'Ad preview', 'Ops', 'nudged', 'Preview not posted for Wednesday\'s ad', 'The preview job ran but found no scheduled draft.', 'Nudged Ops: the draft is not scheduled yet.'],
      ['Globex', 'Retargeting sequence', 'Partnerships', 'blocked', 'Segment not built', 'The segment job skipped: no clicks recorded yet.', 'Clicks land 24h after send, re-check tomorrow.'],
      ['Initech', 'Domain insights', 'Ops', 'drafted', 'Monthly report due Friday', 'Pulled the click domains and drafted the report.', 'None.'],
      ['Pied Piper', 'Close-out', 'Ops', 'skipped_not_ours', 'Edition close-out', 'Belongs to the editorial checklist, not a sponsor task.', 'Skipped.'],
      ['Wonka Industries', 'Ad copy approval', 'Partnerships', 'unmatched', 'Approval request with no matching deliverable', 'Could not match the request to a booked ad.', 'Flagged for a human to link it.'],
      ['Tyrell Corp', 'Performance report', 'Partnerships', 'drafted', '14-day report due today', 'Pulled the final numbers and drafted the update.', 'None.'],
    ];
    const wdTask = ([sponsor, task_type, owner, status, outstanding, what_i_did, issues_next_steps], i) => ({
      sponsor, task_type, owner, status, outstanding, what_i_did, issues_next_steps, source_task_url: LINK(`tasks/wd-${i}`), sandbox_permalink: null });
    const watchdog = {
      last_run_at: stamp(0, 7),
      runs: [
        { started_at: stamp(-2, 7), tasks: [WD[1], WD[3], WD[4]].map(wdTask) },
        { started_at: stamp(-1, 7), tasks: [WD[0], WD[2], WD[6], WD[5]].map(wdTask) },
        { started_at: stamp(0, 7), tasks: WD.map(wdTask) },
      ],
    };

    // ---------------------------------------------------- repo tree and suggestions (both hidden in the demo)
    const FILES = ['context/brand/voice.md', 'context/brand/colours.md', 'context/brand/logo-rules.md', 'context/sales/playbook.md', 'context/sales/objections.md',
      'context/sales/case-studies.md', 'context/content/style-guide.md', 'context/content/checklist.md', 'context/content/chart-rules.md', 'context/ops/handbook.md',
      'context/ops/calendar-rules.md', 'context/ops/onboarding.md', 'context/reports/template.md', 'context/reports/glossary.md', 'context/notes/ideas.md'];
    const context = FILES.map((path, i) => {
      const days = [1, 3, 9, 14, 21, 33, 2, 45, 6, 61, 12, 4, 27, 90, 5][i];
      return { path, lastModified: stamp(-days, 11), daysSinceUpdate: days, staleness: days > 30 ? 'stale' : days > 7 ? 'aging' : 'fresh', size: between(1200, 24000) };
    });
    const suggestions = { content: [
      '# Skill suggestions', '',
      '## /weekly-recap', '**Pattern:** The same Friday summary is written by hand each week.', '**Evidence:** Seen in 4 sessions.', '**Proposed skill:** Draft the recap from the week\'s activity.', '',
      '## /sponsor-faq', '**Pattern:** Sponsors ask the same 5 questions before booking.', '**Evidence:** Seen in 6 sessions.', '**Proposed skill:** Answer from the FAQ and link the media kit.', '',
      '## /chart-check', '**Pattern:** Charts get checked against their source by hand.', '**Evidence:** Seen in 3 sessions.', '**Proposed skill:** Re-read the source and flag any number that does not match.', '',
    ].join('\n') };

    // ---------------------------------------------------- social performance (hidden in the demo)
    const POSTS = [['A pricing page teardown', 'Carousel'], ['Why free tiers work', 'Text'], ['The 3-sided marketplace, drawn', 'Image'], ['Retention curves, read properly', 'Carousel'],
      ['What a moat is not', 'Text'], ['One chart on ad spend', 'Image'], ['The referral loop, explained', 'Video']];
    const social = { generatedAt: new Date(nowMs).toISOString(), posts: POSTS.map(([name, format], i) => {
      const d = dayAt(-1 - i);
      return { name, date: iso(-1 - i), dateLabel: `${DOW[d.getDay()].slice(0, 3)} ${short(-1 - i)}`, format, type: 'Organic',
        li: { impressions: between(4000, 38000), likes: between(40, 420), comments: between(5, 60), reposts: between(2, 30), saves: between(4, 80), followers: between(5, 140),
          clicks: between(10, 160), linkPlacement: i % 2 ? 'In comment' : 'In post', url: LINK(`li/post-${i}`) },
        x: { impressions: between(1500, 14000), likes: between(10, 160), comments: between(1, 25), reposts: between(1, 30), saves: between(1, 40), url: LINK(`x/post-${i}`) } };
    }) };

    const sponsors = {
      domains: Object.fromEntries(COMPANIES.map(c => [c.name, DOMAIN[c.name]])),
      files: Object.fromEntries(COMPANIES.map(c => [DOMAIN[c.name], `logos/${c.slug}.svg`])),
    };

    return { sponsors, pipeline, closed, movement, renewals, bookings, calendar, pulse, subscribers, followers, contentCalendar, skills, workflows, skillPeople,
      dailySummary: summaryRows, big3, weeklyActivity, funnelFor, funnelEmails, shipping, watchdog, context, suggestions, social };
  }

  return { build, COMPANIES, DAILIES, prng };
});
