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

  // The Daily cards. Charts and numbers are invented for the demo.
  const DAILIES = [
    { id: 'acme-anvils', company: 'Acme Corp', status: '1️⃣ Pending Review', firstEdit: true, socials: true, ago: 1,
      chart: { kind: 'line', title: 'Acme anvil subscribers', subtitle: 'Active subscriptions, thousands, by quarter', labels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'], values: [12, 15, 19, 26, 34, 45, 58, 74], unit: 'k' },
      titles: ['Acme\'s anvil subscription flywheel', 'Why Acme stopped selling anvils', 'Acme rents what it used to sell'],
      stat: 'Acme Corp grew anvil subscriptions 6x in 8 quarters',
      context: 'Customers who rent an anvil come back for the rocket skates, and the subscription makes every reorder automatic.',
      why: 'The switch from one-off sales to a monthly plan turned a durable good into recurring revenue.',
      sowhat: 'If your product lasts for years, the subscription is the service around it, not the thing itself.',
      question: 'Would you rent a tool you could buy?', options: ['Yes, if repairs are included', 'Only for big-ticket items', 'No, I buy to own'],
      sourceName: 'Acme Corp quarterly letter' },
    { id: 'hooli-churn', company: 'Hooli', status: '1️⃣ Pending Review', firstEdit: true, socials: true, ago: 2,
      chart: { kind: 'bar', title: 'Hooli churn by signup cohort', subtitle: 'Share of users gone after 90 days', labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], values: [41, 39, 37, 22, 20, 19], unit: '%' },
      titles: ['Hooli halved churn with one email', 'The onboarding email worth a product team', 'Hooli\'s day-3 email'],
      stat: 'Hooli cut 90-day churn from 41% to 19% in one quarter',
      context: 'The only change was a day-3 email that walks new users through their first real task.',
      why: 'Most churn happens before users reach the moment the product clicks, so the email moves that moment forward.',
      sowhat: 'Before building retention features, find the first win and get people to it faster.',
      question: 'What drives your retention most?', options: ['Onboarding', 'Product features', 'Pricing', 'Support'],
      sourceName: 'Hooli growth review' },
    { id: 'globex-mix', company: 'Globex', status: '1️⃣ Pending Review', firstEdit: true, socials: false, ago: 2,
      chart: { kind: 'donut', title: 'Where Globex makes its money', subtitle: 'Share of annual revenue by line', labels: ['Marketplace fees', 'Ads', 'Payments', 'Data'], values: [46, 27, 19, 8], unit: '%' },
      titles: ['Where Globex actually makes its money', 'Globex is an ads business in disguise', 'The 4 engines inside Globex'],
      stat: 'Marketplace fees are 46% of Globex revenue, but ads grow fastest',
      context: 'The marketplace brings the traffic, and the ads and payments lines monetise it twice.',
      why: 'Every seller who joins for the marketplace becomes an advertiser within a year.',
      sowhat: 'Look for the second business your first business is already feeding.',
      question: 'Which Globex line grows fastest next year?', options: ['Marketplace', 'Ads', 'Payments', 'Data'],
      sourceName: 'Globex annual report' },
    { id: 'initech-meetings', company: 'Initech', status: '💬 Revisions Underway', firstEdit: false, socials: true, ago: 3,
      chart: { kind: 'bar', title: 'Initech\'s meeting tax', subtitle: 'Hours per week spent in meetings, by level', labels: ['IC', 'Lead', 'Manager', 'Director', 'VP'], values: [6, 11, 17, 23, 29], unit: 'h' },
      titles: ['Initech\'s meeting tax: 23% of the week', 'The higher you climb, the less you build', 'Initech\'s calendar audit'],
      stat: 'Initech managers spend 17 hours a week in meetings',
      context: 'A calendar audit found the number doubles with every step up the ladder.',
      why: 'Every new layer adds a status meeting, and no one owns deleting them.',
      sowhat: 'Make every recurring meeting expire after 6 weeks unless someone renews it.',
      question: 'How many hours a week are you in meetings?', options: ['Under 5', '5 to 15', '15 to 25', 'Over 25'],
      sourceName: 'Initech internal survey' },
    { id: 'piedpiper-storage', company: 'Pied Piper', status: '1️⃣ Pending Review', firstEdit: false, socials: true, ago: 1,
      chart: { kind: 'line', title: 'Pied Piper storage cost per user', subtitle: 'Cents per user per month', labels: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'], values: [92, 88, 80, 71, 63, 55, 47, 41, 36], unit: 'c' },
      titles: ['Pied Piper\'s storage bill fell 61%', 'Compression is a pricing strategy', 'How Pied Piper undercut everyone'],
      stat: 'Pied Piper cut storage cost per user by 61% in 9 months',
      context: 'Better compression meant the same plan price carried a much fatter margin.',
      why: 'When cost per user falls faster than price, every cohort becomes more profitable than the last.',
      sowhat: 'Treat infrastructure efficiency as a growth lever, not a cost-cutting exercise.',
      question: 'Would you cut price or keep the margin?', options: ['Cut price, win share', 'Keep the margin', 'Split the difference'],
      sourceName: 'Pied Piper engineering blog' },
    { id: 'wonka-tickets', company: 'Wonka Industries', status: '1️⃣ Pending Review', firstEdit: false, socials: true, ago: 4,
      chart: { kind: 'bar', title: 'Wonka customer acquisition cost', subtitle: 'Dollars per new customer, by channel', labels: ['TV', 'Search', 'Social', 'Golden ticket'], values: [42, 31, 24, 6], unit: '$' },
      titles: ['Wonka\'s golden ticket was a CAC hack', 'The cheapest channel was a contest', 'Scarcity beats spend'],
      stat: 'Wonka\'s golden ticket contest acquired customers at $6 each',
      context: 'That is a seventh of what TV costs, and the press coverage came free.',
      why: 'A scarce prize turns every buyer into a marketer, so the contest pays for its own reach.',
      sowhat: 'Before buying more ads, ask what would make customers do the advertising.',
      question: 'Which channel has your lowest CAC?', options: ['Paid search', 'Social', 'Referrals', 'Events'],
      sourceName: 'Wonka marketing review' },
    { id: 'vandelay-margin', company: 'Vandelay Industries', status: 'Idea', firstEdit: false, socials: true, ago: 5,
      chart: { kind: 'bar', title: 'Vandelay gross margin by line', subtitle: 'Gross margin, percent', labels: ['Imports', 'Exports', 'Latex', 'Consulting'], values: [38, 12, 27, 55], unit: '%' },
      titles: ['Vandelay\'s import margin is 3x export', 'Vandelay should stop exporting', 'The line Vandelay should double'],
      stat: 'Vandelay earns 38% gross margin on imports and 12% on exports',
      context: 'Consulting is the most profitable line of all, and it is the smallest.',
      why: 'Exports compete on price, while imports and consulting compete on access.',
      sowhat: 'Rank your lines by margin, not revenue, before deciding where to hire.',
      question: 'Which Vandelay line would you grow?', options: ['Imports', 'Latex', 'Consulting'],
      sourceName: 'Vandelay Industries filings' },
    { id: 'massive-rnd', company: 'Massive Dynamic', status: '💬 Revisions Underway', firstEdit: true, socials: true, ago: 6,
      chart: { kind: 'donut', title: 'Massive Dynamic spend', subtitle: 'Share of operating budget', labels: ['R&D', 'Sales', 'G&A', 'Marketing'], values: [44, 26, 18, 12], unit: '%' },
      titles: ['Massive Dynamic spends more on R&D than sales', 'The company that out-researches its rivals', '44 cents of every dollar'],
      stat: 'Massive Dynamic puts 44% of its budget into R&D',
      context: 'That is more than sales and marketing combined.',
      why: 'Its products sell on being first, so research is the sales budget.',
      sowhat: 'Your biggest budget line should match how customers actually choose you.',
      question: 'Where should a 10-person startup spend first?', options: ['Product', 'Sales', 'Marketing'],
      sourceName: 'Massive Dynamic budget memo' },
    { id: 'dunder-regions', company: 'Dunder Mifflin', status: '1️⃣ Pending Review', firstEdit: false, socials: false, ago: 7,
      chart: { kind: 'bar', title: 'Dunder Mifflin regional sales growth', subtitle: 'Year-on-year growth by branch', labels: ['Scranton', 'Stamford', 'Nashua', 'Utica'], values: [14, 3, -2, 6], unit: '%' },
      titles: ['Paper still pays: 4 regional bets', 'Why the smallest branch grows fastest', 'Dunder Mifflin\'s relationship moat'],
      stat: 'Dunder Mifflin\'s smallest branch grew sales 14% this year',
      context: 'The larger branches were flat or shrinking over the same period.',
      why: 'Small accounts buy on relationships, and the big-box competitors cannot match that.',
      sowhat: 'In a commodity market, the customer relationship is the product.',
      question: 'Can relationships beat price in a commodity market?', options: ['Yes, always', 'Only for small accounts', 'No, price wins'],
      sourceName: 'Dunder Mifflin branch report' },
    { id: 'tyrell-pricing', company: 'Tyrell Corp', status: '🙌 In Beehiiv', firstEdit: true, socials: true, ago: 9, slotted: 1,
      chart: { kind: 'donut', title: 'Tyrell plan mix', subtitle: 'Share of new customers by plan', labels: ['Basic', 'Pro', 'Enterprise'], values: [22, 61, 17], unit: '%' },
      titles: ['Tyrell\'s 3-tier pricing page', 'The decoy plan that sells Pro', 'Why nobody buys Tyrell Basic'],
      stat: '61% of Tyrell customers pick the middle plan',
      context: 'The Basic plan exists mostly to make Pro look like a bargain.',
      why: 'A cheap anchor and an expensive anchor push buyers to the middle.',
      sowhat: 'Design your pricing page around the plan you want people to buy.',
      question: 'Which plan do you usually pick?', options: ['The cheapest', 'The middle one', 'The top one'],
      sourceName: 'Tyrell pricing study' },
    { id: 'bluth-stand', company: 'Bluth Company', status: '🙌 In Beehiiv', firstEdit: true, socials: true, ago: 10, slotted: 2,
      chart: { kind: 'line', title: 'Banana stand margin', subtitle: 'Gross margin by year, percent', labels: ['Y1', 'Y3', 'Y5', 'Y7', 'Y9', 'Y11', 'Y13', 'Y15'], values: [22, 28, 35, 41, 39, 47, 52, 58], unit: '%' },
      titles: ['The banana stand\'s 15 years of margin', 'There is always money in the stand', 'The Bluth Company\'s best asset'],
      stat: 'The Bluth banana stand took margin from 22% to 58% in 15 years',
      context: 'It is the smallest unit in the group and the most profitable per square foot.',
      why: 'One product, one location and no discounts keeps costs flat while prices rise.',
      sowhat: 'Never sell the simple business that funds the complicated ones.',
      question: 'Would you sell your most boring profitable unit?', options: ['Never', 'At the right price', 'Yes, focus matters more'],
      sourceName: 'Bluth Company annual filing' },
    { id: 'sterling-spend', company: 'Sterling Cooper', status: '🙌 In Beehiiv', firstEdit: true, socials: true, ago: 11, slotted: 3,
      chart: { kind: 'bar', title: 'Sterling Cooper client ad spend', subtitle: 'Share of spend online, percent', labels: ['2019', '2020', '2021', '2022', '2023', '2024'], values: [21, 30, 38, 46, 54, 61], unit: '%' },
      titles: ['Ad spend shifted 40 points online', 'Sterling Cooper\'s clients moved first', 'The 6-year swing in ad budgets'],
      stat: 'Sterling Cooper clients moved 40 points of ad spend online in 6 years',
      context: 'Print and TV still win on brand, but measurable channels win the budget meeting.',
      why: 'What can be measured gets defended in a budget review, and what cannot gets cut.',
      sowhat: 'If you sell a brand channel, sell the measurement with it.',
      question: 'Where does your ad budget go first?', options: ['Search', 'Social', 'Newsletters', 'TV and print'],
      sourceName: 'Sterling Cooper client survey' },
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
    ['daily-newsletter', 'dailies', 'Turns a one-line idea into a finished Daily: researched copy, an on-brand infographic, a poll, and the LinkedIn and X posts, with 3 versions of each.', ['Notion', 'Claude', 'Web Search'], 'Content', -18],
    ['daily-pulse', 'dailies', 'Scans a list of trusted chart sources once a day and files the best candidates as new Daily ideas.', ['Notion', 'Web Search'], 'Content', -16],
    ['daily-diff', 'dailies', 'Compares each Daily as first generated with what shipped, and folds the recurring edits back into the generator.', ['Notion', 'Claude'], 'Content', -9],
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
    'daily-newsletter': ['context/daily-pipeline.md', 'context/brand-rules.md'], draft: ['context/voice-guide.md'],
    'performance-report': ['context/report-template.md'],
  };
  const WORKFLOWS = [
    { id: 'delivery', name: 'Newsletter delivery', color: '#4ADE80', steps: ['ad-scheduler', 'migrate-ads', 'migrate', 'issue-check', 'close-out', 'performance-report'] },
    { id: 'dailies', name: 'Dailies', color: '#FB923C', steps: ['daily-pulse', 'daily-newsletter', 'daily-diff'] },
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
      adDays.forEach((n, i) => deliverables.push({ sponsor, phase, kind: 'ad', label: `Ad ${i + 1}`, offset: n, amount: money(2100, 2900) }));
      if (r() < 0.45 && adDays[1] != null) deliverables.push({ sponsor, phase, kind: 'sb', label: 'SB', offset: adDays[1], amount: money(14500, 21500, 250) });
      if (adDays[0] != null) {
        deliverables.push({ sponsor, phase, kind: 'li', label: 'LI 1', offset: adDays[0] + 1, amount: money(2800, 3900, 50) });
        deliverables.push({ sponsor, phase, kind: 'x', label: 'X 1', offset: adDays[0] + 2, amount: 0 });
      }
      const last = adDays[adDays.length - 1];
      if (last != null) {
        deliverables.push({ sponsor, phase, kind: 'retarget', label: 'Retargeting', offset: last + 3, amount: money(900, 1400) });
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
      ['Acme Corp - Q1 ad bundle', 'Warm Lead', 9250, 6, 'New business', 'Intro call booked with their growth lead, Dana Whitfield.'],
      ['Globex - Sponsored Breakdown', 'Sent Proposal', 21750, 5, 'New business', 'Proposal sent, waiting on budget sign-off.'],
      ['Hooli - Phase 4 (renewal)', 'Verbal / Contract', 16250, 4, 'Renewal', 'Verbal yes from Marcus Lindqvist. Contract out for signature.'],
      ['Initech - Daily launch package', 'Talking', 28400, 19, 'New business', 'Second call done. They want the Daily founding slots.'],
      ['Pied Piper - Phase 3 (renewal)', 'Sent Proposal', 13250, 9, 'Renewal', 'Sent 2 options, follow up Friday.'],
      ['Vandelay Industries - Ads + LinkedIn', 'Talking', 8650, 44, 'New business', 'Gone quiet after the rate card. Nudge.'],
      ['Wonka Industries - Sponsored Breakdown', 'Warm Lead', 19500, 12, 'New business', 'Inbound from their partnerships team.'],
      ['Massive Dynamic - Q2 bundle', 'Sent Proposal', 32400, 37, 'Upsell', 'Proposal out 5 weeks. Chase with a case study.'],
      ['Tyrell Corp - Retargeting add-on', 'Talking', 4250, 8, 'Upsell', 'Interested in the retargeting sequence.'],
      ['Weyland-Yutani - Annual partnership', 'Warm Lead', 52500, 22, 'New business', 'Procurement wants a 12-month view.'],
      ['Sterling Cooper - Phase 2 (renewal)', 'Verbal / Contract', 11750, 13, 'Renewal', 'Agreed on the call, waiting on the PO.'],
      ['Bluth Company - Daily ads', 'Talking', 6400, 3, 'New business', 'Wants 5 Daily slots in the launch month.'],
      ['Dunder Mifflin - Ads', 'Warm Lead', 7850, 31, 'New business', 'Met at a conference, send the media kit.'],
      ['Virtucon - Sponsored Breakdown', 'Sent Proposal', 19750, 2, 'New business', 'Proposal sent yesterday.'],
      ['Nakatomi Trading - Phase 2 (renewal)', 'Talking', 14200, 51, 'Renewal', 'Champion left. Find the new owner.'],
      ['Prestige Worldwide - Launch week', 'Warm Lead', 5600, 15, 'New business', 'Wants the launch-week package.'],
      ['Globex - Domain insights upsell', 'Talking', 2900, 26, 'Upsell', 'Sent the sample report.'],
      ['Acme Corp - Daily founding slot', 'Sent Proposal', 24800, 11, 'Upsell', 'Founding rate offer, expires end of month.'],
      ['Hooli - LinkedIn add-on', 'Warm Lead', 3650, 64, 'Upsell', ''],
      ['Initech - Retargeting', 'Warm Lead', 4800, 90, 'Upsell', 'Parked until their next quarter.'],
      ['Wonka Industries - Ads', 'Talking', 11200, 7, 'New business', 'Drafting the media plan with them.'],
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
    wonNames.forEach((name, i) => WON.push({ name, stage: 'Won', value: money(5200, 34000, 50), closedOn: iso(-wonAges[i]), lifecycle: pick(lifecycles), deliverables: `${between(3, 6)} newsletter ads, ${between(1, 2)} LinkedIn posts, a retargeting sequence and a domain insights report.`, nextAction: null, url: LINK(`crm/won-${i + 1}`) }));
    const LOST = [
      { name: 'Oceanic Air - Breakdown', stage: 'Lost', value: 17250, closedOn: iso(-3), lifecycle: 'New business', deliverables: null, nextAction: 'Went with a podcast instead.', url: LINK('crm/lost-1') },
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
          priorDeal: { name: 'Dunder Mifflin - LinkedIn', stage: 'Won', value: 8450, url: LINK('crm/won-10') }, hold: null },
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

    // ---------------------------------------------------- dailies
    const ANGLES = [
      { name: 'The direct read', key: 'stat' }, { name: 'The mechanism', key: 'why' }, { name: 'The so-what', key: 'sowhat' },
    ];
    const RH_TITLES = s => [
      `${s.company}'s own write-up, annotated`, 'A primer on unit economics', 'How flywheels compound',
      'The case against vanity metrics', 'Cohort charts, explained', 'What the chart leaves out',
    ];
    function versionsFor(s) {
      const three = f => [0, 1, 2].map(f);
      return {
        schema: 1,
        angles: ANGLES.map(a => ({ name: a.name, hook: s[a.key] })),
        slug: s.titles[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').split('-').filter(Boolean).slice(0, 3).join('-'),
        title: s.titles.slice(),
        subjects: three(v => [s.titles[v], `${s.stat.split(' ').slice(0, 7).join(' ')}...`, s.question, `The ${s.company} chart worth 60 seconds`]),
        preview: three(v => [`${s.stat}. One chart, one minute.`, `Why it worked, in one chart.`, `What to steal from ${s.company}.`][v]),
        caption: three(v => `${s[ANGLES[v].key].replace(/\.$/, '')}. ${s.context}`),
        poll: three(v => `${[s.question, `Quick one: ${s.question.charAt(0).toLowerCase()}${s.question.slice(1)}`, s.question][v]}\n${s.options.map(o => `- ${o}`).join('\n')}`),
        rabbitHole: three(() => ''),
        rhSource: three(v => `- Data source: [${s.sourceName}](${LINK(`source/${s.id}`)}) - the full dataset${['', ', annotated', ', with the method notes'][v]} (fictional)`),
        rhLinks: RH_TITLES(s).map((t, i) => ({
          url: LINK(`read/${s.id}-${i + 1}`),
          text: three(v => `- [${t}](${LINK(`read/${s.id}-${i + 1}`)}) - ${['why it matters', 'the mechanism behind it', 'what to do with it'][v]}.`),
        })),
        liPost: three(v => `${s[ANGLES[v].key].replace(/\.$/, '')}.\n\n${s.context}\n\n${v === 2 ? s.why : s.sowhat}\n\nFull chart in today's Daily.`),
        xPost: three(v => `${s.titles[v]}\n\n${s.stat}.`),
        liComments: three(v => [0, 1, 2].map(i => ({ text: [`The full breakdown is in today's Daily: [newsletter link at migration]`, `Source and method: ${s.sourceName} (fictional data).`, `What would you have done differently?`][i], image: null, withImage: false }))),
        xComments: three(v => [`Full Daily: [newsletter link at migration]`, `Data: ${s.sourceName} (fictional).`, `Would you copy this playbook?`]),
        picks: { title: 0, preview: 0, caption: 0, poll: 0, rabbitHole: 0, liPost: 0, xPost: 0, subjects: [[0, 0], [0, 1], [0, 2], [0, 3]], xComments: [[0, 0]], liComments: [[0, 0]], rhSource: 0, rhLinks: [[0, 0], [1, 0], [2, 0]] },
      };
    }
    const dailySpecs = DAILIES.map(s => ({ ...s, versions: versionsFor(s), image: `graphics/${s.id}-v0.png` }));

    const KINDS = [
      { kind: 'x', label: '@contoso_charts' }, { kind: 'x', label: '@woodgrove_data' }, { kind: 'linkedin', label: 'Fabrikam Research' },
      { kind: 'reddit', label: 'r/northwind_charts' }, { kind: 'youtube', label: '@TailspinExplains' }, { kind: 'newsletter', label: 'Litware Weekly' },
      { kind: 'web', label: 'adventureworks.example' }, { kind: 'newsletter', label: 'Proseware Notes' }, { kind: 'web', label: 'contoso-research.example' },
    ].map((s, i) => ({ ...s, key: `src-${i}`, url: LINK(`sources/${i}`) }));
    const CHARTS = ['Bar', 'Line', 'Donut', 'Area', 'Stacked bar', 'Scatter'];
    const PHRASES = ['revenue per employee', 'churn by cohort', 'pricing tiers', 'ad spend mix', 'R&D intensity', 'margin by line', 'growth by region',
      'payback period', 'net retention', 'CAC by channel', 'inventory turns', 'gross margin trend', 'subscriber growth', 'take rate', 'customer mix'];
    const summaryRows = [];
    for (let i = 0; i < 150; i++) {
      const ago = Math.floor(Math.pow(r(), 1.3) * 70);
      const company = r() < 0.12 ? 'Multiple' : pick(sponsorNames);
      const age = ago;
      const roll = r();
      const outcome = age < 3 ? (roll < 0.7 ? 'open' : 'archived') : roll < 0.38 ? 'approved' : roll < 0.86 ? 'archived' : 'open';
      const status = outcome === 'approved' ? (age > 6 ? '✅ Published' : '🙌 In Beehiiv') : outcome === 'archived' ? '📁 Archived' : pick(['1️⃣ Pending Review', 'Idea']);
      summaryRows.push({
        id: `sum-${i}`, url: LINK(`ideas/sum-${i}`), created: stamp(-ago, between(6, 20)),
        name: `${company === 'Multiple' ? 'Big Tech' : company}: ${pick(PHRASES)}`, status, published: status === '✅ Published',
        outcome, company, chartType: r() < 0.9 ? pick(CHARTS) : null, sponsored: r() < 0.06, source: r() < 0.88 ? pick(KINDS) : null,
      });
    }

    const cards = dailySpecs.map((s, i) => ({
      id: s.id, url: LINK(`ideas/${s.id}`), lastEdited: stamp(-Math.min(s.ago, 1), 9), created: stamp(-s.ago, 8 + i),
      name: s.versions.title[0], subject: s.versions.subjects[0][0], hasSubjectProp: true, status: s.status, company: s.company, angle: s.versions.angles[0].name,
      sponsored: false, migrate: !!s.slotted, socialsReady: s.socials, firstEdit: s.firstEdit, image: s.image,
      versions: s.versions, versionsError: null, sections: {}, enriched: true, slotted: s.slotted || 0,
    }));
    for (const c of cards) {
      summaryRows.push({ id: `sum-${c.id}`, url: c.url, created: c.created, name: c.name, status: c.status, published: false,
        outcome: c.status === '🙌 In Beehiiv' ? 'approved' : 'open', company: c.company, chartType: { line: 'Line', bar: 'Bar', donut: 'Donut' }[DAILIES.find(d => d.id === c.id).chart.kind], sponsored: false, source: KINDS[c.id.length % KINDS.length] });
    }
    summaryRows.sort((a, b) => b.created.localeCompare(a.created));

    // Daily send days: the next 3 weeks of weekdays, with booked Daily ads.
    const issues = [];
    let adN = 0;
    for (let n = 1; n <= 24; n++) {
      const dow = dayAt(n).getDay();
      if (dow === 0 || dow === 6) continue;
      const nAds = n % 5 === 0 ? 0 : n % 3 === 0 ? 1 : 2;
      const ads = [];
      for (let j = 0; j < nAds; j++) {
        const sp2 = sponsorNames[(n * 5 + j * 3) % sponsorNames.length];
        adN++;
        ads.push({ id: `dad-${adN}`, name: `${sp2} - Daily ad ${1 + (adN % 4)}`, type: 'Newsletter Ad', status: n < 6 ? 'Finalized and Scheduled' : 'In Review', hasCopy: n < 9 || j === 0, offered: n > 15 && j === 1 });
      }
      issues.push({ id: `issue-${n}`, date: iso(n), daysOut: n, name: `Daily - ${short(n)}`, ads, houseAds: [], freeSlots: Math.max(0, 2 - ads.length), daily: null, extraDailies: [] });
    }
    const slottedCards = cards.filter(c => c.slotted);
    slottedCards.forEach(c => {
      const issue = issues[c.slotted - 1];
      issue.daily = { id: c.id, name: c.name, status: c.status, migrate: true, publishedUrl: LINK(`beehiiv/drafts/${c.id}`), superseded: null, image: c.image, url: c.url };
      issue.houseAds = ['Refer a friend', 'Sponsor this newsletter'].slice(0, issue.freeSlots);
    });
    const dailyCalendar = { issues, leadDays: 3, houseAds: ['Refer a friend', 'Sponsor this newsletter'], slots: 2, build: { lastDispatch: null, lastError: null, pending: false }, deletedDrafts: [] };

    const sponsors = {
      domains: Object.fromEntries(COMPANIES.map(c => [c.name, DOMAIN[c.name]])),
      files: Object.fromEntries(COMPANIES.map(c => [DOMAIN[c.name], `logos/${c.slug}.svg`])),
    };

    return { sponsors, pipeline, closed, movement, renewals, bookings, calendar, pulse, subscribers, followers, contentCalendar, skills, workflows, skillPeople, cards, dailySummary: summaryRows, dailyCalendar };
  }

  return { build, COMPANIES, DAILIES, prng };
});
