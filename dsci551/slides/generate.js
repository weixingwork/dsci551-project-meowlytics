const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Wei Xing";
pres.title = "Meowlytics - DSCI 551 Final Report";

// ── Color Palette ──────────────────────────────────────────
const DARK_BG = "0F172A";
const DARK2 = "1E293B";
const LIGHT_BG = "F8FAFC";
const BLUE = "0EA5E9";
const TEAL = "0D9488";
const AMBER = "F59E0B";
const GREEN = "22C55E";
const RED = "EF4444";
const TXTDARK = "1E293B";
const TXTLIGHT = "E2E8F0";
const TXTMUTED = "64748B";
const BOXBLUE = "EFF6FF";
const BOXBLUE_BORDER = "BFDBFE";
const BOXGREEN = "F0FDF4";
const BOXGREEN_BORDER = "BBF7D0";
const BOXAMBER = "FFFBEB";
const BOXAMBER_BORDER = "FDE68A";

// ── Helpers ────────────────────────────────────────────────
function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: DARK_BG };
  return s;
}
function lightSlide() {
  const s = pres.addSlide();
  s.background = { color: LIGHT_BG };
  return s;
}
function slideTitle(slide, text, color = BLUE) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.4, y: 0.28, w: 0.07, h: 0.6,
    fill: { color }, line: { color },
  });
  slide.addText(text, {
    x: 0.58, y: 0.28, w: 9.0, h: 0.6,
    fontSize: 26, bold: true, color: TXTDARK,
    fontFace: "Calibri", margin: 0, valign: "middle",
  });
  slide.addShape(pres.shapes.LINE, {
    x: 0.4, y: 0.94, w: 9.2, h: 0,
    line: { color: "E2E8F0", width: 1 },
  });
}
function codeBox(slide, code, x, y, w, h, fontSize = 10) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h,
    fill: { color: DARK2 },
    line: { color: "334155", width: 1 },
  });
  slide.addText(code, {
    x: x + 0.12, y: y + 0.08, w: w - 0.24, h: h - 0.16,
    fontSize, fontFace: "Consolas", color: "7DD3FC",
    valign: "top", margin: 0,
  });
}

// ── SLIDE 1: TITLE ─────────────────────────────────────────
{
  const s = darkSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.1, fill: { color: BLUE }, line: { color: BLUE } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.525, w: 10, h: 0.1, fill: { color: BLUE }, line: { color: BLUE } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.1, w: 0.35, h: 5.425, fill: { color: DARK2 }, line: { color: DARK2 } });

  s.addText("Meowlytics", {
    x: 0.7, y: 0.85, w: 8.8, h: 1.1,
    fontSize: 54, bold: true, color: "FFFFFF",
    fontFace: "Calibri", align: "left",
  });
  s.addText("PostgreSQL B-tree Indexing", {
    x: 0.7, y: 1.95, w: 8.8, h: 0.55,
    fontSize: 22, bold: true, color: BLUE,
    fontFace: "Calibri", align: "left",
  });
  s.addText("for an AI-Powered Cat Food Ingredient Analyzer", {
    x: 0.7, y: 2.5, w: 8.8, h: 0.5,
    fontSize: 18, color: TXTLIGHT,
    fontFace: "Calibri", align: "left",
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 3.2, w: 1.8, h: 0.05, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText([
    { text: "Wei Xing  ·  DSCI 551 Spring 2026", options: { breakLine: true } },
    { text: "Database Internals + Application Design — Final Report", options: {} },
  ], {
    x: 0.7, y: 3.35, w: 8.5, h: 0.8,
    fontSize: 13, color: TXTMUTED, fontFace: "Calibri",
  });

  const pills = [["B-tree Indexing", BLUE], ["Query Planner", TEAL], ["MVCC", AMBER]];
  pills.forEach(([label, color], i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.7 + i * 2.6, y: 4.55, w: 2.2, h: 0.55,
      fill: { color }, line: { color },
    });
    s.addText(label, {
      x: 0.7 + i * 2.6, y: 4.55, w: 2.2, h: 0.55,
      fontSize: 14, bold: true, color: "FFFFFF",
      align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
    });
  });
}

// ── SLIDE 2: INTRO & MOTIVATION ─────────────────────────────
{
  const s = lightSlide();
  slideTitle(s, "Introduction & Motivation");

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 4.25, h: 4.2, fill: { color: BOXBLUE }, line: { color: BOXBLUE_BORDER, width: 1 } });
  s.addText("The Problem", { x: 0.65, y: 1.12, w: 3.8, h: 0.38, fontSize: 15, bold: true, color: BLUE, fontFace: "Calibri" });
  s.addText([
    { text: "Cat owners struggle to evaluate ingredient quality on commercial cat food labels", options: { bullet: true, breakLine: true } },
    { text: "Ingredient names are complex, often unfamiliar, and inconsistently labeled", options: { bullet: true, breakLine: true } },
    { text: "Manual research is slow and unreliable", options: { bullet: true } },
  ], { x: 0.65, y: 1.5, w: 3.8, h: 1.4, fontSize: 12, color: TXTDARK, fontFace: "Calibri" });

  s.addText("Why PostgreSQL?", { x: 0.65, y: 2.95, w: 3.8, h: 0.38, fontSize: 15, bold: true, color: TEAL, fontFace: "Calibri" });
  s.addText([
    { text: "Transparent query planner with EXPLAIN ANALYZE", options: { bullet: true, breakLine: true } },
    { text: "B-tree indexes match frequent exact-match ingredient lookups", options: { bullet: true, breakLine: true } },
    { text: "MVCC enables concurrent reads without blocking writes", options: { bullet: true, breakLine: true } },
    { text: "Heap + secondary indexes fit transactional access patterns", options: { bullet: true } },
  ], { x: 0.65, y: 3.33, w: 3.8, h: 1.8, fontSize: 12, color: TXTDARK, fontFace: "Calibri" });

  s.addShape(pres.shapes.RECTANGLE, { x: 4.85, y: 1.05, w: 4.75, h: 4.2, fill: { color: BOXGREEN }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("Application Workflow", { x: 5.1, y: 1.12, w: 4.2, h: 0.38, fontSize: 15, bold: true, color: GREEN, fontFace: "Calibri" });

  const steps = [
    "User uploads a cat food label photo",
    "AI (Gemini) extracts ingredients and generates analysis",
    "PostgreSQL B-tree lookup for ingredient knowledge",
    "Missing ingredients → AI generates + inserts to DB",
    "User saves the analysis to personal favorites",
    "Favorites retrieved via composite (userId, createdAt) index",
  ];
  steps.forEach((text, i) => {
    const yPos = 1.58 + i * 0.56;
    s.addShape(pres.shapes.OVAL, { x: 5.1, y: yPos, w: 0.3, h: 0.3, fill: { color: TEAL }, line: { color: TEAL } });
    s.addText(String(i + 1), { x: 5.1, y: yPos, w: 0.3, h: 0.3, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, fontFace: "Calibri" });
    s.addText(text, { x: 5.52, y: yPos, w: 3.9, h: 0.3, fontSize: 11.5, color: TXTDARK, valign: "middle", margin: 0, fontFace: "Calibri" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 4.85, y: 4.95, w: 4.75, h: 0.28, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText("Demo dataset: 10,000 ingredients  ·  51 users  ·  5,000 favorites", {
    x: 4.85, y: 4.95, w: 4.75, h: 0.28,
    fontSize: 10.5, bold: true, color: "FFFFFF",
    align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
  });
}

// ── SLIDE 3: POSTGRESQL ARCHITECTURE ───────────────────────
{
  const s = lightSlide();
  slideTitle(s, "PostgreSQL Architecture Overview");

  const boxes = [
    { label: "Heap Storage", color: BLUE, fill: BOXBLUE, border: BOXBLUE_BORDER,
      desc: ["Rows stored in 8KB heap pages", "No inherent sort order — insertion order", "CTIDs locate row by (page, offset)", "Meowlytics: Ingredient, User, Favorite tables"] },
    { label: "B-tree Indexes", color: TEAL, fill: BOXGREEN, border: BOXGREEN_BORDER,
      desc: ["Secondary structures — separate from heap", "Balanced tree: root → internal → leaf", "Leaf pages store (key, ctid) sorted pairs", "Meowlytics: 3 on Ingredient + 1 composite"] },
    { label: "MVCC + Planner", color: AMBER, fill: BOXAMBER, border: BOXAMBER_BORDER,
      desc: ["Each row has xmin / xmax transaction IDs", "UPDATE creates new version, old retained", "Cost-based planner: Index Scan vs Seq Scan", "autovacuum reclaims dead tuples"] },
  ];

  boxes.forEach((box, i) => {
    const x = 0.35 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 3.0, h: 4.15, fill: { color: box.fill }, line: { color: box.border, width: 1.5 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 3.0, h: 0.48, fill: { color: box.color }, line: { color: box.color } });
    s.addText(box.label, { x: x + 0.1, y: 1.1, w: 2.8, h: 0.48, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, fontFace: "Calibri" });
    box.desc.forEach((line, j) => {
      s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: 1.78 + j * 0.82, w: 0.16, h: 0.16, fill: { color: box.color }, line: { color: box.color } });
      s.addText(line, { x: x + 0.38, y: 1.73 + j * 0.82, w: 2.55, h: 0.7, fontSize: 11, color: TXTDARK, fontFace: "Calibri", valign: "top" });
    });
  });
}

// ── SLIDE 4: SCHEMA & INDEX DESIGN ─────────────────────────
{
  const s = lightSlide();
  slideTitle(s, "Schema & Index Design");

  const tables = [
    { name: "Ingredient", rows: "10,000 rows", color: BLUE,
      fields: ["id   (CUID, PK)", "name   String", "nameEn   String", "source   String", "category, healthImpact", "description, benefits..."],
      indexes: ["@@index([name])", "@@index([nameEn])", "@@index([source])"] },
    { name: "User", rows: "51 rows", color: TEAL,
      fields: ["id   (CUID, PK)", "email   UNIQUE", "passwordHash", "displayName", "createdAt / updatedAt"],
      indexes: ["Implicit on email (@unique)"] },
    { name: "Favorite", rows: "5,000 rows", color: AMBER,
      fields: ["id   (CUID, PK)", "userId   FK → User", "name, brand", "analysis   JSON", "createdAt / updatedAt"],
      indexes: ["@@index([userId, createdAt])", "← composite B-tree"] },
  ];

  tables.forEach((t, i) => {
    const x = 0.35 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 3.0, h: 4.15, fill: { color: "FFFFFF" }, line: { color: t.color, width: 2 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 3.0, h: 0.55, fill: { color: t.color }, line: { color: t.color } });
    s.addText(t.name, { x: x + 0.1, y: 1.1, w: 2.0, h: 0.55, fontSize: 16, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri" });
    s.addText(t.rows, { x: x + 2.1, y: 1.1, w: 0.82, h: 0.55, fontSize: 9, color: "FFFFFF", valign: "middle", align: "right", margin: 0, fontFace: "Calibri" });

    s.addText("Fields", { x: x + 0.12, y: 1.75, w: 2.76, h: 0.28, fontSize: 10.5, bold: true, color: TXTMUTED, fontFace: "Calibri" });
    t.fields.forEach((f, j) => {
      s.addText(f, { x: x + 0.12, y: 2.03 + j * 0.28, w: 2.76, h: 0.28, fontSize: 10, color: TXTDARK, fontFace: "Consolas" });
    });

    s.addText("Indexes", { x: x + 0.12, y: 3.85, w: 2.76, h: 0.28, fontSize: 10.5, bold: true, color: t.color, fontFace: "Calibri" });
    t.indexes.forEach((idx, j) => {
      s.addText(idx, { x: x + 0.12, y: 4.13 + j * 0.28, w: 2.76, h: 0.28, fontSize: 9.5, color: DARK2, fontFace: "Consolas" });
    });
  });
}

// ── SLIDE 5: MAPPING 1 — EXACT LOOKUP ──────────────────────
{
  const s = lightSlide();
  slideTitle(s, "Mapping 1: Exact Ingredient Lookup");

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 4.5, h: 4.2, fill: { color: BOXBLUE }, line: { color: BOXBLUE_BORDER, width: 1 } });
  s.addText("Application Behavior", { x: 0.6, y: 1.12, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: BLUE, fontFace: "Calibri" });
  s.addText("When a user taps an ingredient (e.g. 'Chicken') in the analysis result, the app calls the knowledge API:", {
    x: 0.6, y: 1.52, w: 4.1, h: 0.62, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri",
  });
  codeBox(s, "SELECT *\nFROM \"Ingredient\"\nWHERE \"nameEn\" = 'Chicken'\nLIMIT 1", 0.55, 2.2, 4.25, 0.9);

  s.addText("Internal Mechanism", { x: 0.6, y: 3.2, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: BLUE, fontFace: "Calibri" });
  s.addText([
    { text: "B-tree on nameEn sorted by key value", options: { bullet: true, breakLine: true } },
    { text: "Root → internal nodes → leaf page traversal", options: { bullet: true, breakLine: true } },
    { text: "Only 3 buffer hits — no full scan needed", options: { bullet: true } },
  ], { x: 0.6, y: 3.6, w: 4.1, h: 1.4, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri" });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.05, w: 4.5, h: 4.2, fill: { color: BOXGREEN }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("EXPLAIN ANALYZE Result", { x: 5.3, y: 1.12, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: GREEN, fontFace: "Calibri" });
  codeBox(s,
    "Index Scan using\n  \"Ingredient_nameEn_idx\"\n  on \"Ingredient\"\n\ncost = 0.29..8.30\nrows = 1\nActual time = 0.020..0.020 ms\nBuffers: shared hit = 3\n\nExecution Time: 0.053 ms",
    5.25, 1.52, 4.2, 2.55);

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 4.2, w: 4.5, h: 1.0, fill: { color: "DCFCE7" }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("Key Takeaway", { x: 5.3, y: 4.3, w: 4.1, h: 0.28, fontSize: 12, bold: true, color: GREEN, fontFace: "Calibri" });
  s.addText("B-tree traversal finds exact row in 0.053 ms across 10,000 rows — 3 buffer hits vs 585 for a full scan.", {
    x: 5.3, y: 4.6, w: 4.1, h: 0.5, fontSize: 11, color: TXTDARK, fontFace: "Calibri",
  });
}

// ── SLIDE 6: MAPPING 2 — COMPOSITE INDEX ───────────────────
{
  const s = lightSlide();
  slideTitle(s, "Mapping 2: Favorites Retrieval — Composite Index");

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 4.5, h: 4.2, fill: { color: BOXBLUE }, line: { color: BOXBLUE_BORDER, width: 1 } });
  s.addText("Application Behavior", { x: 0.6, y: 1.12, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: BLUE, fontFace: "Calibri" });
  s.addText("When a logged-in user opens the Favorites page, the app loads their most recent analyses:", {
    x: 0.6, y: 1.52, w: 4.1, h: 0.6, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri",
  });
  codeBox(s, "SELECT * FROM \"Favorite\"\nWHERE \"userId\" = $userId\nORDER BY \"createdAt\" DESC\nLIMIT 20", 0.55, 2.18, 4.25, 0.95);

  s.addText("Composite Index Design", { x: 0.6, y: 3.2, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: BLUE, fontFace: "Calibri" });
  s.addText([
    { text: "@@index([userId, createdAt]) in Prisma", options: { bullet: true, breakLine: true } },
    { text: "Index sorted by (userId, createdAt)", options: { bullet: true, breakLine: true } },
    { text: "Index Scan Backward — no Sort node needed", options: { bullet: true, breakLine: true } },
    { text: "Serves filter AND ORDER BY in one pass", options: { bullet: true } },
  ], { x: 0.6, y: 3.6, w: 4.1, h: 1.5, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri" });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.05, w: 4.5, h: 4.2, fill: { color: BOXGREEN }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("EXPLAIN ANALYZE Result", { x: 5.3, y: 1.12, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: GREEN, fontFace: "Calibri" });
  codeBox(s,
    "Index Scan Backward using\n  \"Favorite_userId_createdAt_idx\"\n\ncost = 0.28..268.97\nActual time = 0.041..0.086 ms\nRows returned: 20\nBuffers: shared hit = 28\n\nExecution Time: 0.115 ms\n\n→ NO Sort node in plan",
    5.25, 1.52, 4.2, 2.9);

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 4.5, w: 4.5, h: 0.72, fill: { color: "DCFCE7" }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("Composite index eliminates explicit Sort — ORDER BY is 'free' because the index is already sorted in the right direction.", {
    x: 5.3, y: 4.58, w: 4.1, h: 0.57, fontSize: 11, color: TXTDARK, fontFace: "Calibri",
  });
}

// ── SLIDE 7: QUERY PLANNER — COST ESTIMATION ───────────────
{
  const s = lightSlide();
  slideTitle(s, "Query Planner: Cost Estimation & Selectivity");

  s.addText("The planner chooses a plan based on estimated cost — not just 'does an index exist?'", {
    x: 0.4, y: 1.05, w: 9.2, h: 0.35, fontSize: 12.5, color: TXTMUTED, fontFace: "Calibri", italic: true,
  });

  // Experiment A
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.48, w: 9.2, h: 0.36, fill: { color: BLUE }, line: { color: BLUE } });
  s.addText("Experiment A: Same query — with vs. without index on nameEn   (Script 04)", {
    x: 0.55, y: 1.48, w: 9.0, h: 0.36, fontSize: 12, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.9, w: 4.4, h: 1.5, fill: { color: "DCFCE7" }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("WITH index", { x: 0.6, y: 1.95, w: 4.0, h: 0.3, fontSize: 12, bold: true, color: GREEN, fontFace: "Calibri" });
  codeBox(s, "Index Scan\ncost = 0.29..8.30\nExecution: 0.057 ms\nBuffers hit: 3", 0.55, 2.25, 4.1, 1.1, 10);

  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 1.9, w: 4.4, h: 1.5, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
  s.addText("WITHOUT index", { x: 5.4, y: 1.95, w: 4.0, h: 0.3, fontSize: 12, bold: true, color: RED, fontFace: "Calibri" });
  codeBox(s, "Seq Scan\ncost = 0.00..710.00\nExecution: 5.029 ms\n9,999 rows removed", 5.35, 2.25, 4.1, 1.1, 10);

  s.addShape(pres.shapes.RECTANGLE, { x: 3.7, y: 2.52, w: 2.6, h: 0.35, fill: { color: AMBER }, line: { color: AMBER } });
  s.addText("→  88× slower without index", {
    x: 3.7, y: 2.52, w: 2.6, h: 0.35,
    fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
  });

  // Experiment B
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 3.55, w: 9.2, h: 0.36, fill: { color: TEAL }, line: { color: TEAL } });
  s.addText("Experiment B: Small table (100 rows) vs large table (10,000 rows)   (Script 05)", {
    x: 0.55, y: 3.55, w: 9.0, h: 0.36, fontSize: 12, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 3.97, w: 4.4, h: 1.28, fill: { color: "FFF7ED" }, line: { color: BOXAMBER_BORDER, width: 1 } });
  s.addText("100-row table → Seq Scan", { x: 0.6, y: 4.02, w: 4.0, h: 0.28, fontSize: 12, bold: true, color: AMBER, fontFace: "Calibri" });
  s.addText("Planner cost: 7.25  (<  index cost 8.30)\nPlanner correctly picks Seq Scan — index overhead not worth it for tiny table.", {
    x: 0.6, y: 4.32, w: 4.1, h: 0.88, fontSize: 10.5, color: TXTDARK, fontFace: "Calibri",
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: 3.97, w: 4.4, h: 1.28, fill: { color: BOXGREEN }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addText("10,000-row table → Index Scan", { x: 5.4, y: 4.02, w: 4.0, h: 0.28, fontSize: 12, bold: true, color: GREEN, fontFace: "Calibri" });
  s.addText("Planner cost: 8.30  (<<  seq cost 710)\nPlanner switches to Index Scan at scale — cost model, not rule.", {
    x: 5.4, y: 4.32, w: 4.1, h: 0.88, fontSize: 10.5, color: TXTDARK, fontFace: "Calibri",
  });
}

// ── SLIDE 8: B-TREE LIMITATION — FUZZY SEARCH ──────────────
{
  const s = lightSlide();
  slideTitle(s, "B-tree Limitation: Fuzzy Search (ILIKE '%...%')");

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 4.5, h: 4.2, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
  s.addText("Why B-tree Cannot Help", { x: 0.6, y: 1.12, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: RED, fontFace: "Calibri" });
  s.addText("Fuzzy ingredient search in the app:", { x: 0.6, y: 1.52, w: 4.1, h: 0.3, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri" });
  codeBox(s, "SELECT * FROM \"Ingredient\"\nWHERE \"nameEn\" ILIKE '%chick%'\nLIMIT 20", 0.55, 1.85, 4.25, 0.85);

  s.addText([
    { text: "B-tree sorts keys lexicographically — Chicken < Cod < Duck", options: { bullet: true, breakLine: true } },
    { text: "Leading wildcard means any position in string", options: { bullet: true, breakLine: true } },
    { text: "B-tree's sorted order cannot help mid-string patterns", options: { bullet: true, breakLine: true } },
    { text: "Full sequential scan required regardless of index", options: { bullet: true, breakLine: true } },
    { text: "Fix would require GIN index with pg_trgm extension", options: { bullet: true } },
  ], { x: 0.6, y: 2.8, w: 4.1, h: 2.35, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri" });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 1.05, w: 4.5, h: 4.2, fill: { color: BOXAMBER }, line: { color: BOXAMBER_BORDER, width: 1 } });
  s.addText("EXPLAIN ANALYZE Result", { x: 5.3, y: 1.12, w: 4.1, h: 0.38, fontSize: 14, bold: true, color: AMBER, fontFace: "Calibri" });
  codeBox(s,
    "Seq Scan on \"Ingredient\"\n\ncost = 0.00..710.00\nrows = 606\n\nFilter: (\"nameEn\" ~~* '%chick%')\nRows Removed by Filter: 9,400\n\nExecution Time: 14.214 ms",
    5.25, 1.52, 4.2, 2.65);

  s.addShape(pres.shapes.RECTANGLE, { x: 5.1, y: 4.3, w: 4.5, h: 0.88, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
  s.addText([
    { text: "Exact match (B-tree):  ", options: {} },
    { text: "0.053 ms", options: { bold: true, color: GREEN } },
    { text: "   |   Fuzzy ILIKE:  ", options: {} },
    { text: "14.2 ms", options: { bold: true, color: RED } },
    { text: "\n(268× slower)", options: { bold: true, color: AMBER } },
  ], { x: 5.3, y: 4.38, w: 4.1, h: 0.73, fontSize: 11.5, color: TXTDARK, fontFace: "Calibri", align: "center", valign: "middle" });
}

// ── SLIDE 9: MVCC ──────────────────────────────────────────
{
  const s = darkSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL }, line: { color: TEAL } });

  s.addText("MVCC: Multi-Version Concurrency Control", {
    x: 0.4, y: 0.2, w: 9.2, h: 0.65,
    fontSize: 26, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });
  s.addShape(pres.shapes.LINE, { x: 0.4, y: 0.9, w: 9.2, h: 0, line: { color: "334155", width: 1 } });

  s.addText("PostgreSQL never overwrites a row — it writes a new version and marks the old one dead.", {
    x: 0.4, y: 0.98, w: 9.2, h: 0.4, fontSize: 13, color: TXTLIGHT, fontFace: "Calibri", italic: true,
  });

  const states = [
    { label: "Before UPDATE", color: TEAL,
      lines: ["xmin = 1149", "xmax = 0  (active)", "ctid = (0,1)", "nameEn = Chicken", "", "(original tuple)"] },
    { label: "During UPDATE  T=1188", color: BLUE,
      lines: ["NEW version:", "xmin = 1188  (new txn)", "xmax = 0", "ctid = (36,18)  ← new slot", "", "OLD version retained"] },
    { label: "After ROLLBACK", color: AMBER,
      lines: ["xmin = 1149  (restored)", "xmax = 1188  (rolled-back)", "ctid = (0,1)", "nameEn = Chicken  (visible)", "", "Dead tuple → VACUUM later"] },
  ];

  states.forEach((st, i) => {
    const x = 0.35 + i * 3.2;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.48, w: 3.0, h: 3.7, fill: { color: DARK2 }, line: { color: st.color, width: 2 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.48, w: 3.0, h: 0.42, fill: { color: st.color }, line: { color: st.color } });
    s.addText(st.label, { x: x + 0.08, y: 1.48, w: 2.84, h: 0.42, fontSize: 11.5, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri" });
    st.lines.forEach((line, j) => {
      if (line === "") return;
      const isHeader = line.startsWith("OLD") || line.startsWith("NEW") || line.startsWith("(");
      s.addText(line, {
        x: x + 0.12, y: 2.02 + j * 0.36, w: 2.76, h: 0.35,
        fontSize: 11, color: isHeader ? st.color : TXTLIGHT,
        fontFace: "Consolas", bold: isHeader,
      });
    });
  });

  s.addText("→", { x: 3.35, y: 3.1, w: 0.5, h: 0.5, fontSize: 26, bold: true, color: BLUE, align: "center" });
  s.addText("→", { x: 6.55, y: 3.1, w: 0.5, h: 0.5, fontSize: 26, bold: true, color: AMBER, align: "center" });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.35, y: 5.23, w: 9.3, h: 0.3, fill: { color: "1E293B" }, line: { color: "334155", width: 1 } });
  s.addText("n_dead_tup = 1 after ROLLBACK  ·  autovacuum reclaims dead tuples  ·  Readers never block writers", {
    x: 0.5, y: 5.23, w: 9.0, h: 0.3, fontSize: 10.5, color: TXTMUTED, align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
  });
}

// ── SLIDE 10: INDEX MAINTENANCE ─────────────────────────────
{
  const s = lightSlide();
  slideTitle(s, "Index Maintenance");

  s.addText("INSERT, UPDATE, and DELETE on indexed columns all trigger B-tree maintenance.", {
    x: 0.4, y: 1.05, w: 9.2, h: 0.35, fontSize: 12.5, color: TXTMUTED, fontFace: "Calibri", italic: true,
  });

  const ops = [
    { title: "INSERT", subtitle: "new ingredient",
      color: GREEN, fill: BOXGREEN, border: BOXGREEN_BORDER,
      steps: ["New row written to heap page", "B-tree traversal to find leaf", "New (key, ctid) entry inserted", "Leaf may split if full → cascades up", "xmin set to current txn ID"] },
    { title: "UPDATE", subtitle: "refresh AI record",
      color: BLUE, fill: BOXBLUE, border: BOXBLUE_BORDER,
      steps: ["New row version written (new ctid)", "New index entry added", "Old entry still points to old tuple", "xmax on old version, xmin on new", "Old becomes dead after VACUUM"] },
    { title: "VACUUM", subtitle: "dead-tuple cleanup",
      color: AMBER, fill: BOXAMBER, border: BOXAMBER_BORDER,
      steps: ["Triggered by autovacuum daemon", "Removes dead tuples from heap", "Removes dead index entries", "Updates pg_statistic for planner", "Reduces bloat, better estimates"] },
  ];

  ops.forEach((op, i) => {
    const x = 0.35 + i * 3.15;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.5, w: 3.0, h: 3.75, fill: { color: op.fill }, line: { color: op.border, width: 1.5 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 1.5, w: 3.0, h: 0.55, fill: { color: op.color }, line: { color: op.color } });
    s.addText(op.title, { x: x + 0.12, y: 1.5, w: 1.5, h: 0.55, fontSize: 15, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri" });
    s.addText(op.subtitle, { x: x + 1.45, y: 1.5, w: 1.45, h: 0.55, fontSize: 9.5, color: "FFFFFF", valign: "middle", align: "right", margin: 0, italic: true, fontFace: "Calibri" });
    op.steps.forEach((step, j) => {
      const yy = 2.2 + j * 0.58;
      s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: yy + 0.04, w: 0.22, h: 0.22, fill: { color: op.color }, line: { color: op.color } });
      s.addText(String(j + 1), { x: x + 0.12, y: yy + 0.04, w: 0.22, h: 0.22, fontSize: 9, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, fontFace: "Calibri" });
      s.addText(step, { x: x + 0.42, y: yy, w: 2.5, h: 0.52, fontSize: 10.5, color: TXTDARK, fontFace: "Calibri", valign: "top" });
    });
  });
}

// ── SLIDE 11: COMPARISON ───────────────────────────────────
{
  const s = lightSlide();
  slideTitle(s, "Comparison: PostgreSQL vs MySQL vs MongoDB");

  const headers = ["Feature", "PostgreSQL (this project)", "MySQL (InnoDB)", "MongoDB"];
  const colW = [2.4, 2.4, 2.4, 2.4];
  const colX = [0.35, 2.75, 5.15, 7.55];

  headers.forEach((h, i) => {
    s.addShape(pres.shapes.RECTANGLE, { x: colX[i], y: 1.1, w: colW[i], h: 0.52, fill: { color: i === 1 ? BLUE : DARK2 }, line: { color: i === 1 ? BLUE : DARK2 } });
    s.addText(h, { x: colX[i] + 0.06, y: 1.1, w: colW[i] - 0.12, h: 0.52, fontSize: 11.5, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0, fontFace: "Calibri" });
  });

  const rows = [
    ["Storage", "Heap + secondary B-tree", "Clustered B-tree (PK)", "BSON documents"],
    ["Index type", "Secondary B-tree", "Primary + secondary B-tree", "B-tree, text, geo"],
    ["Concurrency", "MVCC (no read locks)", "MVCC (undo logs)", "MVCC (WiredTiger)"],
    ["Fuzzy search", "Seq scan (GIN needed)", "Full-text index (FULLTEXT)", "Text index / regex"],
    ["Query planner", "Cost-based (transparent)", "Cost-based", "Query optimizer"],
    ["Best fit", "Transactional + analytics", "High-volume OLTP", "Flexible schemas"],
  ];

  rows.forEach((row, r) => {
    const bgColor = r % 2 === 0 ? "F8FAFC" : "FFFFFF";
    const highlightCol = 1;
    row.forEach((cell, c) => {
      const fillColor = c === highlightCol ? (r % 2 === 0 ? "EFF6FF" : "DBEAFE") : bgColor;
      const borderColor = c === highlightCol ? "BFDBFE" : "E2E8F0";
      s.addShape(pres.shapes.RECTANGLE, { x: colX[c], y: 1.62 + r * 0.56, w: colW[c], h: 0.56, fill: { color: fillColor }, line: { color: borderColor, width: 0.75 } });
      s.addText(cell, { x: colX[c] + 0.08, y: 1.62 + r * 0.56, w: colW[c] - 0.16, h: 0.56, fontSize: 10.5, color: c === highlightCol ? DARK2 : TXTDARK, fontFace: "Calibri", bold: c === 0, valign: "middle" });
    });
  });
}

// ── SLIDE 12: LIMITATIONS & LESSONS ─────────────────────────
{
  const s = lightSlide();
  slideTitle(s, "Limitations & Lessons Learned");

  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 4.4, h: 4.2, fill: { color: "FEF2F2" }, line: { color: "FECACA", width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.4, y: 1.05, w: 4.4, h: 0.45, fill: { color: RED }, line: { color: RED } });
  s.addText("Limitations", { x: 0.55, y: 1.05, w: 4.1, h: 0.45, fontSize: 15, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri" });

  const limits = [
    ["Fuzzy search not indexed", "Leading-wildcard ILIKE forces Seq Scan. Would need GIN + pg_trgm."],
    ["AI needs API key", "Live Gemini analysis requires GOOGLE_API_KEY. Pre-seeded data covers DB demo."],
    ["MVCC write overhead", "Every UPDATE writes a new heap version. Dead tuples accumulate until VACUUM."],
    ["Single-node only", "No distribution or replication — PG supports them but not demonstrated."],
  ];
  limits.forEach(([title, desc], i) => {
    s.addText(title, { x: 0.6, y: 1.62 + i * 0.9, w: 4.0, h: 0.28, fontSize: 11.5, bold: true, color: RED, fontFace: "Calibri" });
    s.addText(desc, { x: 0.6, y: 1.9 + i * 0.9, w: 4.0, h: 0.58, fontSize: 10.5, color: TXTDARK, fontFace: "Calibri" });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.05, y: 1.05, w: 4.55, h: 4.2, fill: { color: BOXGREEN }, line: { color: BOXGREEN_BORDER, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.05, y: 1.05, w: 4.55, h: 0.45, fill: { color: GREEN }, line: { color: GREEN } });
  s.addText("Lessons Learned", { x: 5.2, y: 1.05, w: 4.3, h: 0.45, fontSize: 15, bold: true, color: "FFFFFF", valign: "middle", margin: 0, fontFace: "Calibri" });

  const lessons = [
    ["Index design reflects query patterns", "Composite (userId, createdAt) serves both filter and sort because the app always filters by user AND sorts by time."],
    ["Cost model drives plan choice", "Planner chose Seq Scan on 100 rows even with an index — cost estimation, not index existence, decides."],
    ["MVCC enables concurrency", "Old tuple versions let readers see consistent snapshots while writers insert new versions — no read locks."],
    ["EXPLAIN ANALYZE is ground truth", "Buffer hits + timing confirm assumptions that pure theory cannot."],
  ];
  lessons.forEach(([title, desc], i) => {
    s.addText(title, { x: 5.25, y: 1.62 + i * 0.9, w: 4.15, h: 0.28, fontSize: 11.5, bold: true, color: GREEN, fontFace: "Calibri" });
    s.addText(desc, { x: 5.25, y: 1.9 + i * 0.9, w: 4.15, h: 0.58, fontSize: 10.5, color: TXTDARK, fontFace: "Calibri" });
  });
}

// ── SLIDE 13: CONCLUSION ───────────────────────────────────
{
  const s = darkSlide();
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL }, line: { color: TEAL } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.545, w: 10, h: 0.08, fill: { color: TEAL }, line: { color: TEAL } });

  s.addText("Conclusion", {
    x: 0.5, y: 0.25, w: 9.0, h: 0.7,
    fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });
  s.addShape(pres.shapes.LINE, { x: 0.5, y: 1.0, w: 9.0, h: 0, line: { color: "334155", width: 1 } });

  const points = [
    [BLUE, "B-tree Indexing", "Ingredient lookup (nameEn) uses Index Scan with 3 buffer hits — 88× faster than without index at 10,000 rows."],
    [TEAL, "Composite Index", "Favorites retrieval uses Index Scan Backward — ORDER BY is free because the index is already sorted."],
    [GREEN, "Query Planner", "Planner correctly uses Seq Scan on 100 rows and Index Scan on 10,000 rows — cost-based, not rule-based."],
    [AMBER, "MVCC", "Every UPDATE creates a new tuple version. Snapshot isolation allows concurrent reads. Dead tuples accumulate until VACUUM."],
    [RED, "B-tree Limitation", "ILIKE '%chick%' forces Seq Scan — B-tree cannot serve leading-wildcard patterns. GIN + pg_trgm would fix it."],
  ];

  points.forEach(([color, label, desc], i) => {
    const y = 1.12 + i * 0.82;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.65, fill: { color }, line: { color } });
    s.addText(label, { x: 0.7, y, w: 2.4, h: 0.3, fontSize: 13, bold: true, color, fontFace: "Calibri", margin: 0 });
    s.addText(desc, { x: 0.7, y: y + 0.3, w: 8.8, h: 0.4, fontSize: 11, color: TXTLIGHT, fontFace: "Calibri", margin: 0 });
  });

  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.2, w: 9.0, h: 0.3, fill: { color: "1E293B" }, line: { color: "334155", width: 1 } });
  s.addText("Wei Xing  ·  DSCI 551 Spring 2026  ·  github.com/… /dsci551-project-meowlytics", {
    x: 0.5, y: 5.2, w: 9.0, h: 0.3,
    fontSize: 10, color: TXTMUTED, align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
  });
}

pres.writeFile({ fileName: "Meowlytics-DSCI551-Final.pptx" })
  .then(() => console.log("Created: Meowlytics-DSCI551-Final.pptx"))
  .catch((err) => { console.error(err); process.exit(1); });
