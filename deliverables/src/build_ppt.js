// Build the Sentinel PDL-2 final review deck.
//   node build_ppt.js <node_modules dir with pptxgenjs/react-icons/sharp> [skill dir for apply_theme]
const path = require('path');
const MODS = process.argv[2];
const req = (m) => require(path.join(MODS, m));
const pptxgen = req('pptxgenjs');
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const sharp = req('sharp');
const fa = req('react-icons/fa6');

const ROOT = path.resolve(__dirname, '..');
const A = (p) => path.join(ROOT, 'assets', p);
const OUT = path.join(ROOT, 'Sentinel_PDL2_Final_Review.pptx');

const THEME = {
  name: 'Sentinel Ops',
  headFontFace: 'Arial',
  bodyFontFace: 'Calibri',
  colors: {
    dk1: '0F172A', lt1: 'FFFFFF', dk2: '0B1220', lt2: 'CBD5E1',
    accent1: '06B6D4', accent2: 'EF4444', accent3: 'F59E0B', accent4: '10B981',
    accent5: '18233A', accent6: '64748B', hlink: '22D3EE', folHlink: '94A3B8',
  },
};
const BG = '0B1220';

async function icon(Comp, color = '#FFFFFF', size = 256) {
  const svg = renderToStaticMarkup(React.createElement(Comp, { color, size }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}

(async () => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
  pres.title = 'Sentinel - PDL-2 Final Review';
  pres.author = 'Latheshkumar S, Madesh S, Jeffrin A, Kamalesh Balaji D N';
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  // ---------------------------------------------------------------- layouts
  pres.defineSlideMaster({
    title: 'TITLE_DARK',
    background: { color: BG },
    objects: [],
  });
  pres.defineSlideMaster({
    title: 'CONTENT',
    background: { color: BG },
    margin: [0.5, 0.6, 0.6, 0.6],
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.35, w: 12.1, h: 0.85,
          fontSize: 30, bold: true, color: C.background1, valign: 'middle', margin: 0 }, text: '' } },
      { text: { text: 'SENTINEL  ·  PDL-2 Final Review', options: { x: 0.6, y: 7.0, w: 6, h: 0.3,
          fontSize: 10, color: C.accent6, margin: 0 } } },
    ],
    slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: '64748B', align: 'right' },
  });

  // ---------------------------------------------------------------- helpers
  const card = (s, x, y, w, h, name, fill = C.accent5) =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill },
      line: { color: '24324D', width: 0.75 }, objectName: name });
  const iconDot = async (s, Comp, x, y, d = 0.62, fill = C.accent1, name = 'icon') => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' }, objectName: name + ' circle' });
    s.addImage({ data: await icon(Comp), x: x + d * 0.22, y: y + d * 0.22, w: d * 0.56, h: d * 0.56, objectName: name });
  };
  const text = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, color: C.background2, fontSize: 15, valign: 'top', ...o });
  const img = (s, file, x, y, w, h, name) => s.addImage({ path: A(file), x, y, w, h, objectName: name });
  const shot = (s, file, x, y, w, name) => {   // screenshots are 16:10
    const h = w * 1350 / 2160;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.08,
      fill: { color: '1E293B' }, line: { color: '334155', width: 1 }, objectName: name + ' frame' });
    img(s, 'screens/' + file, x, y, w, h, name);
    return h;
  };
  const content = (section, title) => {
    const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: section });
    s.addText(title, { placeholder: 'title' });
    return s;
  };

  // ================================================================ 1 Title
  pres.addSection({ title: 'Introduction' });
  let s = pres.addSlide({ masterName: 'TITLE_DARK', sectionTitle: 'Introduction' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.5, w: 0.75, h: 0.9, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'logo plate' });
  img(s, 'misc/rmk_logo.png', 0.66, 0.53, 0.63, 0.84, 'college logo');
  text(s, [{ text: 'R.M.K. ENGINEERING COLLEGE', options: { bold: true, color: C.background1, breakLine: true } },
           { text: 'Department of Computer Science and Engineering', options: { color: C.accent6 } }],
       { x: 1.55, y: 0.62, w: 5.2, h: 0.7, fontSize: 13 });
  text(s, 'SENTINEL', { x: 0.6, y: 1.8, w: 6.2, h: 1.1, fontSize: 60, bold: true, color: C.background1, fontFace: 'Arial', charSpacing: 4 });
  text(s, 'AI-Powered Citizen Incident Reporting and Intelligent Emergency Dispatch System',
       { x: 0.6, y: 2.95, w: 6.0, h: 1.0, fontSize: 20, color: C.accent1 });
  text(s, [
    { text: 'Team', options: { bold: true, color: C.background1, breakLine: true } },
    { text: 'Latheshkumar S  (111724102105)', options: { breakLine: true } },
    { text: 'Madesh S  (111724102108)', options: { breakLine: true } },
    { text: 'Jeffrin A  (111724102083)', options: { breakLine: true } },
    { text: 'Kamalesh Balaji D N  (111724102089)' },
  ], { x: 0.6, y: 4.3, w: 3.6, h: 1.7, fontSize: 13, paraSpaceAfter: 2 });
  text(s, [
    { text: 'Guided by', options: { bold: true, color: C.background1, breakLine: true } },
    { text: 'Ms. Sumitha T', options: { breakLine: true } },
    { text: 'Assistant Professor, CSE' },
  ], { x: 4.3, y: 4.3, w: 2.6, h: 1.0, fontSize: 13, paraSpaceAfter: 2 });
  text(s, '24ME511 Product Development Lab – 2  ·  Final Review  ·  October 2026',
       { x: 0.6, y: 6.6, w: 7, h: 0.35, fontSize: 12, color: C.accent6 });
  shot(s, '05_dashboard.png', 7.15, 1.75, 5.6, 'dashboard preview');
  text(s, 'Live dispatcher dashboard — Chennai', { x: 7.15, y: 5.35, w: 5.6, h: 0.3, fontSize: 11, color: C.accent6, italic: true });
  s.addNotes('Introduce the team and the guide. One line pitch: Sentinel lets any citizen report a hazard with photo, voice and GPS, and uses AI to verify, de-duplicate and prioritise reports so dispatchers can send the nearest responder faster.');

  // ================================================================ 2 Agenda
  s = content('Introduction', 'Agenda');
  const agenda = ['Problem & motivation', 'Existing vs proposed system', 'Literature survey', 'System architecture',
                  'AI pipeline & algorithms', 'Implementation & tech stack', 'Live demo screens', 'Results, testing & future work'];
  for (let i = 0; i < agenda.length; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.15, y = 1.5 + row * 1.25;
    card(s, x, y, 5.95, 1.0, 'agenda ' + (i + 1));
    text(s, String(i + 1).padStart(2, '0'), { x: x + 0.3, y: y + 0.18, w: 0.9, h: 0.65, fontSize: 30, bold: true, color: C.accent1, valign: 'middle', fontFace: 'Arial' });
    text(s, agenda[i], { x: x + 1.3, y: y + 0.18, w: 4.4, h: 0.65, fontSize: 18, color: C.background1, valign: 'middle' });
  }

  // ================================================================ 3 Problem
  pres.addSection({ title: 'Problem' });
  s = content('Problem', 'Emergency reporting still runs on voice calls');
  text(s, 'When a citizen sees a fire, accident or flooded road, the only option is to call 100, 101, 108 or 112 and describe it.',
       { x: 0.6, y: 1.3, w: 12.1, h: 0.5, fontSize: 16 });
  const probs = [
    [fa.FaCameraRetro, 'No visual evidence', 'A phone call cannot carry a photo or video, so severity is guessed from a panicking caller’s words.'],
    [fa.FaLocationCrosshairs, 'Vague locations', '“Near the signal by the temple” — operators interpret landmarks and responders search for the spot.'],
    [fa.FaClone, 'Duplicate reports', 'One visible fire at T. Nagar triggers dozens of calls, each handled as a brand-new case.'],
    [fa.FaListOl, 'Manual prioritisation', 'Calls are served in arrival order, not by severity; finding the nearest unit relies on memory.'],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.08;
    card(s, x, 2.1, 2.88, 3.9, 'problem ' + (i + 1));
    await iconDot(s, probs[i][0], x + 0.3, 2.4, 0.75, C.accent2, 'problem icon ' + (i + 1));
    text(s, probs[i][1], { x: x + 0.3, y: 3.35, w: 2.35, h: 0.75, fontSize: 19, bold: true, color: C.background1 });
    text(s, probs[i][2], { x: x + 0.3, y: 4.15, w: 2.35, h: 1.7, fontSize: 15 });
  }
  s.addNotes('Every minute between noticing a hazard and dispatching a responder matters. The existing channel loses evidence, location accuracy and time to duplicates.');

  // ================================================================ 4 Existing vs Proposed
  s = content('Problem', 'Existing system vs Sentinel');
  const rows = [
    ['Reporting channel', 'Voice call to a helpline', 'PWA form: category, text, photo, video, voice'],
    ['Location', 'Verbal landmark', 'Exact GPS from the phone, EXIF cross-check'],
    ['Evidence', 'None', 'YOLOv8 on images & video keyframes, Whisper on voice'],
    ['Duplicates', 'Each call is a new case', 'Union-Find merges reports ≤200 m, ≤2 h, similar text'],
    ['Prioritisation', 'First come, first served', 'Weighted score: severity, corroboration, wait, category'],
    ['Dispatch', 'Operator memory + radio', 'k-d tree nearest available responder, one click'],
    ['Citizen feedback', 'None — people call again', 'Tracking ID with 7-stage live status'],
  ];
  const hdr = (t, fill) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: fill }, fontSize: 15 } });
  s.addTable([[hdr('Aspect', '1E293B'), hdr('Existing system', '7F1D1D'), hdr('Sentinel (proposed)', '0E7490')],
    ...rows.map((r) => [
      { text: r[0], options: { bold: true, color: 'FFFFFF' } },
      { text: r[1], options: { color: 'FCA5A5' } },
      { text: r[2], options: { color: 'A5F3FC' } }])],
    { x: 0.6, y: 1.45, w: 12.1, colW: [2.6, 3.9, 5.6], fontSize: 14, fontFace: 'Calibri', rowH: 0.62,
      fill: { color: '111A2E' }, border: { type: 'solid', color: '24324D', pt: 0.75 }, valign: 'middle', margin: [0, 0.12, 0, 0.12] });

  // ================================================================ 5 Solution
  pres.addSection({ title: 'Solution' });
  s = content('Solution', 'Sentinel in three steps');
  const steps = [
    [fa.FaMobileScreenButton, '1. Report', 'Citizen picks a hazard type, describes it, attaches photo / video / voice and shares GPS. Gets a tracking ID instantly.'],
    [fa.FaMicrochip, '2. AI triage', 'Vision, EXIF, speech and a local LLM analyse the report; duplicates are merged and a priority score is assigned.'],
    [fa.FaTruckMedical, '3. Dispatch', 'Dispatcher sees a live map and priority queue, gets the nearest available responders, and dispatches in one click.'],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.2;
    card(s, x, 1.55, 3.7, 4.2, 'step ' + (i + 1));
    await iconDot(s, steps[i][0], x + 1.4, 1.9, 0.9, C.accent1, 'step icon ' + (i + 1));
    text(s, steps[i][1], { x: x + 0.3, y: 3.0, w: 3.1, h: 0.6, fontSize: 22, bold: true, color: C.background1, align: 'center' });
    text(s, steps[i][2], { x: x + 0.3, y: 3.7, w: 3.1, h: 1.9, fontSize: 15 });
    if (i < 2) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 3.78, y: 3.45, w: 0.34, h: 0.45, fill: { color: C.accent1 }, line: { type: 'none' }, objectName: 'arrow ' + (i + 1) });
  }
  text(s, 'Report to verified, prioritised incident in ≈ 7 seconds on a single laptop GPU — no cloud AI, citizen data stays local.',
       { x: 0.6, y: 6.1, w: 12.1, h: 0.45, fontSize: 16, italic: true, color: C.accent1 });

  // ================================================================ 6 Literature
  s = content('Solution', 'Literature survey — what we build on');
  const lit = [
    ['Sakaki et al., WWW 2010', 'Citizens as real-time sensors detect events faster than official channels', 'Noisy posts, no precise GPS, no dispatch'],
    ['Imran et al., ACM CSUR 2015', 'Crisis data suffers from overload and duplicates', 'Rarely integrated with responder tools'],
    ['Alam / Ofli et al., 2018–20', 'Images + text together describe damage better', 'Offline classification only'],
    ['Redmon et al., CVPR 2016 (YOLO)', 'Single-pass real-time object detection', 'Used for media evidence'],
    ['Radford et al., ICML 2023 (Whisper)', 'Robust multilingual speech recognition', 'Used for voice notes'],
    ['Reimers & Gurevych, EMNLP 2019', 'Sentence embeddings for semantic similarity', 'Used for duplicate detection'],
    ['Bentley, CACM 1975 (k-d tree)', 'Fast nearest-neighbour search in 2-D', 'Used for responder lookup'],
  ];
  s.addTable([[hdr('Paper', '1E293B'), hdr('Key finding', '1E293B'), hdr('Gap / how Sentinel uses it', '0E7490')],
    ...lit.map((r) => [{ text: r[0], options: { bold: true, color: 'FFFFFF' } }, { text: r[1] }, { text: r[2], options: { color: 'A5F3FC' } }])],
    { x: 0.6, y: 1.45, w: 12.1, colW: [3.6, 4.6, 3.9], fontSize: 13.5, fontFace: 'Calibri', color: 'CBD5E1', rowH: 0.6,
      fill: { color: '111A2E' }, border: { type: 'solid', color: '24324D', pt: 0.75 }, valign: 'middle', margin: [0, 0.12, 0, 0.12] });

  // ================================================================ 7 Architecture
  pres.addSection({ title: 'Design' });
  s = content('Design', 'System architecture');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.35, w: 8.9, h: 5.45, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'diagram plate' });
  img(s, 'diagrams/fig6_1.png', 0.75, 1.65, 8.6, 8.6 * 842 / 1548, 'architecture diagram');
  const tiers = [['Client', 'Citizen PWA + dispatcher dashboard (React, Leaflet)'], ['Application', 'FastAPI REST + JWT, WebSocket live feed, k-d tree'],
                 ['Data', 'PostgreSQL + PostGIS, Redis broker, media store'], ['AI', 'Celery worker: vision → EXIF → speech → LLM → embed → dedup → priority']];
  tiers.forEach(([t, d], i) => {
    text(s, [{ text: t + ' tier', options: { bold: true, color: C.accent1, breakLine: true } }, { text: d }],
         { x: 9.8, y: 1.4 + i * 1.38, w: 2.9, h: 1.25, fontSize: 14 });
  });

  // ================================================================ 8 AI pipeline
  s = content('Design', 'AI pipeline — every report, every model, honestly recorded');
  const pipe = [
    [fa.FaEye, 'YOLOv8', 'Objects in photos & 3 video keyframes'],
    [fa.FaImage, 'EXIF', 'Photo GPS/time vs reported spot'],
    [fa.FaMicrophone, 'Whisper', 'Voice note → text'],
    [fa.FaBrain, 'Qwen3.5 LLM', 'JSON: hazard, severity, summary'],
    [fa.FaVectorSquare, 'MiniLM', '384-dim sentence embedding'],
    [fa.FaObjectGroup, 'Union-Find', 'Merge duplicate reports'],
    [fa.FaRankingStar, 'Priority', 'Weighted score → queue'],
  ];
  for (let i = 0; i < pipe.length; i++) {
    const x = 0.6 + i * 1.75;
    card(s, x, 1.6, 1.55, 3.0, 'pipeline step ' + (i + 1));
    await iconDot(s, pipe[i][0], x + 0.4, 1.85, 0.75, i < 3 ? C.accent3 : i < 5 ? C.accent1 : C.accent4, 'pipeline icon ' + (i + 1));
    text(s, pipe[i][1], { x: x + 0.1, y: 2.75, w: 1.35, h: 0.5, fontSize: 15, bold: true, color: C.background1, align: 'center' });
    text(s, pipe[i][2], { x: x + 0.12, y: 3.3, w: 1.31, h: 1.2, fontSize: 12.5, align: 'center' });
  }
  card(s, 0.6, 4.95, 12.1, 1.65, 'provenance note', '0E2A36');
  await iconDot(s, fa.FaShieldHalved, 0.9, 5.4, 0.75, C.accent1, 'provenance icon');
  text(s, [{ text: 'Honest degradation  ', options: { bold: true, color: C.background1 } },
           { text: 'If a model is missing, Sentinel says so instead of inventing a severity. Each incident stores ai_provenance — e.g. vision: yolov8, llm: llama-server, embedding: all-MiniLM-L6-v2 — and duplicates are never merged on fallback vectors.' }],
       { x: 1.9, y: 5.15, w: 10.5, h: 1.3, fontSize: 15, valign: 'middle' });

  // ================================================================ 9 Algorithms
  s = content('Design', 'Core algorithms');
  const algos = [
    [fa.FaObjectGroup, 'Union-Find dedup', ['Two reports are the same event when:', '≤ 200 m apart (Haversine)', '≤ 2 hours apart', 'cosine similarity ≥ 0.55', 'Path compression + union by rank → near O(1) merges']],
    [fa.FaRankingStar, 'Weighted priority score', ['Priority = 0.40 × Severity', '+ 0.30 × Corroboration', '+ 0.20 × Time in queue', '+ 0.10 × Category weight', 'Binary heap: top incident in O(log n)']],
    [fa.FaMapLocationDot, 'k-d tree responder search', ['2-D tree over available responders', 'Alternates latitude / longitude splits', 'Latitude-aware pruning bound', 'Returns k nearest with distance in km', 'O(log n) average query']],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.5, 3.9, 4.4, 'algorithm ' + (i + 1));
    await iconDot(s, algos[i][0], x + 0.3, 1.8, 0.75, C.accent1, 'algorithm icon ' + (i + 1));
    text(s, algos[i][1], { x: x + 1.2, y: 1.8, w: 2.5, h: 0.75, fontSize: 18, bold: true, color: C.background1, valign: 'middle' });
    text(s, algos[i][2].map((t, k) => ({ text: t, options: { bullet: k > 0 ? { indent: 15 } : false, breakLine: k < algos[i][2].length - 1, color: k === 0 ? 'FFFFFF' : 'CBD5E1' } })),
         { x: x + 0.3, y: 2.85, w: 3.35, h: 3.5, fontSize: 15, paraSpaceAfter: 8 });
  }

  // ================================================================ 10 UML
  s = content('Design', 'Use cases and data model');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.35, w: 5.6, h: 5.4, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'use case plate' });
  img(s, 'diagrams/fig6_3_1.png', 0.85, 1.5, 5.1 * 1052 / 1052 * 1, 5.1 * 1052 / 1248, 'use case diagram');
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.45, y: 1.35, w: 6.25, h: 5.4, rectRadius: 0.1, fill: { color: 'FFFFFF' }, line: { type: 'none' }, objectName: 'class plate' });
  img(s, 'diagrams/fig6_3_2.png', 6.6, 1.95, 5.95, 5.95 * 850 / 1206, 'class diagram');
  text(s, 'Use case diagram — Citizen, Dispatcher, Admin, AI Pipeline', { x: 0.6, y: 6.78, w: 5.6, h: 0.25, fontSize: 11, color: C.accent6, italic: true });
  text(s, 'Class diagram — Incident, Cluster, Media, Responder, algorithms', { x: 6.45, y: 6.78, w: 6.25, h: 0.25, fontSize: 11, color: C.accent6, italic: true });

  // ================================================================ 11 Tech stack
  pres.addSection({ title: 'Implementation' });
  s = content('Implementation', 'Technology stack');
  const stack = [
    [fa.FaReact, 'Frontend', ['React 18 + Vite PWA', 'Tailwind CSS v4', 'Leaflet + OpenStreetMap', 'WebSocket client']],
    [fa.FaServer, 'Backend', ['FastAPI (async)', 'SQLAlchemy 2.0 ORM', 'JWT + bcrypt auth', 'Celery workers']],
    [fa.FaRobot, 'AI models', ['YOLOv8n (Ultralytics)', 'OpenAI Whisper', 'Qwen3.5 via llama.cpp', 'all-MiniLM-L6-v2']],
    [fa.FaDatabase, 'Data & ops', ['PostgreSQL + PostGIS', 'Redis broker', 'Docker Compose', 'pytest · Vitest · Playwright']],
  ];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.08;
    card(s, x, 1.5, 2.88, 4.1, 'stack ' + (i + 1));
    await iconDot(s, stack[i][0], x + 0.3, 1.8, 0.75, C.accent1, 'stack icon ' + (i + 1));
    text(s, stack[i][1], { x: x + 1.2, y: 1.8, w: 1.6, h: 0.75, fontSize: 19, bold: true, color: C.background1, valign: 'middle' });
    text(s, stack[i][2].map((t, k) => ({ text: t, options: { bullet: { indent: 15 }, breakLine: k < 3 } })),
         { x: x + 0.3, y: 2.85, w: 2.45, h: 3.0, fontSize: 15, paraSpaceAfter: 10 });
  }
  text(s, '100% open source  ·  runs on one laptop (RTX 4060)  ·  standalone mode with SQLite when Docker is unavailable',
       { x: 0.6, y: 6.0, w: 12.1, h: 0.4, fontSize: 15, italic: true, color: C.accent1 });

  // ================================================================ 12 Citizen app
  pres.addSection({ title: 'Demo' });
  s = content('Demo', 'Citizen app — report in under a minute');
  shot(s, '02_citizen_form_filled.png', 0.7, 1.5, 5.85, 'citizen form screenshot');
  shot(s, '03b_track_status.png', 6.8, 1.5, 5.85, 'track status screenshot');
  text(s, [{ text: 'Report: ', options: { bold: true, color: C.background1 } }, { text: 'hazard type, description, photo of the bus, GPS 13.0069, 80.2060 at Kathipara junction' }],
       { x: 0.7, y: 5.35, w: 5.85, h: 0.9, fontSize: 14 });
  text(s, [{ text: 'Track: ', options: { bold: true, color: C.background1 } }, { text: 'tracking ID INC-9400801E moves through Reported → AI Processing → Verified → Dispatched → Resolved' }],
       { x: 6.8, y: 5.35, w: 5.85, h: 0.9, fontSize: 14 });

  // ================================================================ 13 Dashboard
  s = content('Demo', 'Dispatcher dashboard — Chennai at a glance');
  shot(s, '05_dashboard.png', 0.7, 1.45, 8.3, 'dashboard screenshot');
  const callouts = [
    [fa.FaMapLocationDot, 'Live map', '18 incidents from Ennore to Tambaram with heatmap and 200 m radius'],
    [fa.FaObjectGroup, '3 clusters', '7 reports merged into 3 events by Union-Find'],
    [fa.FaBolt, 'Real-time', 'WebSocket feed sorted by priority, 15 s poll fallback'],
  ];
  for (let i = 0; i < 3; i++) {
    const y = 1.45 + i * 1.75;
    await iconDot(s, callouts[i][0], 9.35, y + 0.05, 0.62, C.accent1, 'dashboard icon ' + (i + 1));
    text(s, [{ text: callouts[i][1], options: { bold: true, color: C.background1, fontSize: 17, breakLine: true } }, { text: callouts[i][2] }],
         { x: 10.15, y, w: 2.55, h: 1.55, fontSize: 14 });
  }

  // ================================================================ 14 AI + dispatch
  s = content('Demo', 'AI analysis and one-click dispatch');
  shot(s, '06_incident_live_report.png', 0.7, 1.5, 5.85, 'AI analysis screenshot');
  shot(s, '07b_incident_dispatch.png', 6.8, 1.5, 5.85, 'dispatch screenshot');
  text(s, [{ text: 'AI analysis: ', options: { bold: true, color: C.background1 } }, { text: 'YOLOv8 saw the bus, the LLM extracted “road accident, Kathipara junction, severity 4” and a summary' }],
       { x: 0.7, y: 5.35, w: 5.85, h: 0.9, fontSize: 14 });
  text(s, [{ text: 'Dispatch: ', options: { bold: true, color: C.background1 } }, { text: 'k-d tree ranks responders — Officer Priya Nair, Fire & Rescue, 0.15 km from the T. Nagar fire' }],
       { x: 6.8, y: 5.35, w: 5.85, h: 0.9, fontSize: 14 });

  // ================================================================ 15 Results
  pres.addSection({ title: 'Results' });
  s = content('Results', 'Results on the Chennai demonstration dataset');
  const stats = [['18', 'citizen reports processed through the real pipeline'], ['3 / 3', 'duplicate groups merged correctly (T. Nagar, Kathipara, Velachery)'],
                 ['≈ 7 s', 'average AI triage per report on a laptop GPU'], ['111', 'automated tests passing']];
  for (let i = 0; i < 4; i++) {
    const y = 1.45 + i * 1.33;
    card(s, 0.6, y, 5.4, 1.18, 'stat ' + (i + 1));
    text(s, stats[i][0], { x: 0.85, y: y + 0.1, w: 1.9, h: 0.98, fontSize: 36, bold: true, color: C.accent1, valign: 'middle', fontFace: 'Arial' });
    text(s, stats[i][1], { x: 2.8, y: y + 0.1, w: 3.0, h: 0.98, fontSize: 14.5, valign: 'middle' });
  }
  shot(s, '08_analytics.png', 6.5, 1.5, 6.2, 'analytics screenshot');
  text(s, 'Analytics: category and status distribution, average time to dispatch (8 min) and resolve (48 min) on seeded data',
       { x: 6.5, y: 5.55, w: 6.2, h: 0.7, fontSize: 13, italic: true, color: C.accent6 });

  // ================================================================ 16 Testing
  s = content('Results', 'Testing');
  s.addChart(pres.charts.BAR, [{ name: 'Tests', labels: ['End-to-end (Playwright)', 'Frontend unit (Vitest)', 'Backend + AI (pytest)'], values: [2, 45, 64] }], {
    x: 0.6, y: 1.45, w: 6.4, h: 4.9, barDir: 'bar', chartColors: [THEME.colors.accent1],
    showTitle: true, title: '111 automated tests — all passing', titleColor: 'FFFFFF', titleFontSize: 16, titleFontFace: '+mn-lt',
    showValue: true, dataLabelPosition: 'outEnd', dataLabelColor: 'FFFFFF', dataLabelFontSize: 14, dataLabelFontFace: '+mn-lt',
    catAxisLabelColor: 'CBD5E1', catAxisLabelFontSize: 13, catAxisLabelFontFace: '+mn-lt', valAxisHidden: true,
    valGridLine: { style: 'none' }, catGridLine: { style: 'none' }, showLegend: false, barGapWidthPct: 60,
  });
  const tests = [['Unit', 'Haversine (Chennai Central → Egmore ≈ 1.9 km), Union-Find, priority, k-d tree vs brute force'],
                 ['Functional', 'Submit, track, list, status lifecycle, nearest responders, dispatch, analytics'],
                 ['Integration', 'Real FastAPI app on in-memory SQLite; full pipeline clusters two matching reports'],
                 ['Black / white box', 'Invalid input, auth guards, every model fallback path, LLM output parsing']];
  tests.forEach(([t, d], i) => {
    text(s, [{ text: t, options: { bold: true, color: C.accent1, breakLine: true } }, { text: d }],
         { x: 7.4, y: 1.5 + i * 1.25, w: 5.3, h: 1.1, fontSize: 14.5 });
  });

  // ================================================================ 17 Conclusion
  pres.addSection({ title: 'Conclusion' });
  s = content('Conclusion', 'Conclusion and future enhancements');
  card(s, 0.6, 1.45, 5.6, 5.2, 'conclusion card');
  text(s, 'What Sentinel delivers', { x: 0.9, y: 1.7, w: 5.0, h: 0.5, fontSize: 19, bold: true, color: C.background1 });
  const concl = ['Citizens report with evidence and exact GPS in under a minute',
                 'AI verifies, summarises and scores every report locally',
                 'Duplicates merged — dispatchers handle each event once',
                 'Nearest responder suggested and dispatched in one click',
                 'Every stage time-stamped for response-time analytics'];
  text(s, concl.map((t, k) => ({ text: t, options: { bullet: { indent: 15 }, breakLine: k < concl.length - 1 } })),
       { x: 0.9, y: 2.35, w: 5.0, h: 4.0, fontSize: 15.5, paraSpaceAfter: 12 });
  const future = [[fa.FaTowerBroadcast, 'Integrate with 112 / ERSS control rooms'], [fa.FaLanguage, 'Tamil and multilingual reporting'],
                  [fa.FaMobileScreen, 'Responder mobile app with live location'], [fa.FaFire, 'Fine-tuned hazard detection on Indian data'],
                  [fa.FaChartLine, 'Hotspot prediction for monsoon flooding'], [fa.FaWifi, 'Offline queueing and SMS fallback']];
  text(s, 'Future enhancements', { x: 6.6, y: 1.5, w: 6.0, h: 0.5, fontSize: 19, bold: true, color: C.background1 });
  for (let i = 0; i < future.length; i++) {
    const y = 2.2 + i * 0.75;
    await iconDot(s, future[i][0], 6.6, y, 0.55, C.accent1, 'future icon ' + (i + 1));
    text(s, future[i][1], { x: 7.35, y, w: 5.3, h: 0.55, fontSize: 15.5, valign: 'middle' });
  }

  // ================================================================ 18 Thanks
  s = pres.addSlide({ masterName: 'TITLE_DARK', sectionTitle: 'Conclusion' });
  await iconDot(s, fa.FaShieldHalved, 6.17, 1.5, 1.0, C.accent1, 'sentinel icon');
  text(s, 'Thank you', { x: 0.6, y: 2.75, w: 12.1, h: 1.1, fontSize: 54, bold: true, color: C.background1, align: 'center', fontFace: 'Arial' });
  text(s, 'Questions?', { x: 0.6, y: 3.85, w: 12.1, h: 0.7, fontSize: 26, color: C.accent1, align: 'center' });
  text(s, 'Latheshkumar S  ·  Madesh S  ·  Jeffrin A  ·  Kamalesh Balaji D N', { x: 0.6, y: 5.2, w: 12.1, h: 0.45, fontSize: 16, align: 'center' });
  text(s, 'Guided by Ms. Sumitha T  ·  R.M.K. Engineering College', { x: 0.6, y: 5.7, w: 12.1, h: 0.45, fontSize: 14, align: 'center', color: C.accent6 });

  await pres.writeFile({ fileName: OUT });
  if (process.argv[3]) {
    const { applyTheme } = require(path.join(process.argv[3], 'scripts', 'apply_theme.js'));
    await applyTheme(OUT, THEME);
  }
  console.log('wrote', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
