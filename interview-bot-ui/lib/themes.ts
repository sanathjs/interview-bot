// ================================================================
// Chat Theme Definitions
// Each theme defines the full color palette consumed by chat components.
// The property name 'amber' is kept as the accent key for compatibility —
// it maps to the theme's primary accent (amber, blue, gold, green, coral).
// ================================================================

export interface ChatTheme {
  id: string;
  name: string;
  tagline: string;
  palette: string;          // e.g. "Obsidian · Amber · Gold"
  mode: "dark" | "light";

  // Core surfaces
  bg: string;
  card: string;
  header: string;
  border: string;
  input: string;

  // Text
  text: string;
  muted: string;
  subtle: string;

  // Accent (all themes use 'amber' key for backward compat)
  amber: string;
  amberDark: string;
  amberBg: string;
  amberBorder: string;
  amberGlow: string;

  // Text rendering
  boldHighlight: string;    // **bold** text in messages
  listBullet: string;       // bullet marker color

  // Status indicators
  liveDot: string;          // live/online dot
  kbDot: string;            // knowledge base source dot
  aiDot: string;            // AI/fallback source dot

  // Typography
  fontBody: string;
  fontHeading: string;

  // Preview colors for the theme picker card
  previewBg: string;
  previewAccent: string;
}

// ────────────────────────────────────────────────────────────────
// 1. OBSIDIAN — Current default (Dark · Amber)
// ────────────────────────────────────────────────────────────────
export const obsidian: ChatTheme = {
  id: "obsidian",
  name: "Obsidian",
  tagline: "Warm amber on deep black. The original.",
  palette: "Obsidian \u00B7 Amber \u00B7 Gold",
  mode: "dark",

  bg:     "#0d0d0f",
  card:   "#1c1c21",
  header: "#141417",
  border: "#32323c",
  input:  "#141417",

  text:   "#e8e8ef",
  muted:  "#6b6b7d",
  subtle: "#9292a4",

  amber:       "#f59e0b",
  amberDark:   "#d97706",
  amberBg:     "rgba(245,158,11,0.12)",
  amberBorder: "rgba(245,158,11,0.25)",
  amberGlow:   "rgba(245,158,11,0.3)",

  boldHighlight: "#fcd34d",
  listBullet:    "#f59e0b",

  liveDot: "#34d399",
  kbDot:   "#34d399",
  aiDot:   "#818cf8",

  fontBody:    "'DM Sans', system-ui, sans-serif",
  fontHeading: "'Playfair Display', serif",

  previewBg:     "#0d0d0f",
  previewAccent: "#f59e0b",
};

// ────────────────────────────────────────────────────────────────
// 2. MONOLITH — Obsidian · Platinum · Electric Blue
// Cold intellect. Commands attention. Zero noise.
// ────────────────────────────────────────────────────────────────
export const monolith: ChatTheme = {
  id: "monolith",
  name: "Monolith",
  tagline: "Cold intellect. Commands attention. Zero noise.",
  palette: "Obsidian \u00B7 Platinum \u00B7 Electric Blue",
  mode: "dark",

  bg:     "#07070c",
  card:   "#111118",
  header: "#0c0c12",
  border: "#1c1c2c",
  input:  "#0c0c12",

  text:   "#d0d0de",
  muted:  "#555570",
  subtle: "#8080a0",

  amber:       "#3b82f6",
  amberDark:   "#2563eb",
  amberBg:     "rgba(59,130,246,0.10)",
  amberBorder: "rgba(59,130,246,0.22)",
  amberGlow:   "rgba(59,130,246,0.3)",

  boldHighlight: "#93c5fd",
  listBullet:    "#3b82f6",

  liveDot: "#3b82f6",
  kbDot:   "#3b82f6",
  aiDot:   "#a78bfa",

  fontBody:    "'Inter', system-ui, sans-serif",
  fontHeading: "'Inter', system-ui, sans-serif",

  previewBg:     "#07070c",
  previewAccent: "#3b82f6",
};

// ────────────────────────────────────────────────────────────────
// 3. COUNSEL — Charcoal · Gold · Aged Serif
// Gravitas through typography. Evokes a senior partner's office.
// ────────────────────────────────────────────────────────────────
export const counsel: ChatTheme = {
  id: "counsel",
  name: "Counsel",
  tagline: "Gravitas through typography. A senior partner's office.",
  palette: "Charcoal \u00B7 Gold \u00B7 Aged Serif",
  mode: "dark",

  bg:     "#12110e",
  card:   "#1c1a16",
  header: "#171510",
  border: "#2e2a22",
  input:  "#171510",

  text:   "#e6e2d8",
  muted:  "#786e5e",
  subtle: "#a09480",

  amber:       "#c9a84c",
  amberDark:   "#a88a32",
  amberBg:     "rgba(201,168,76,0.10)",
  amberBorder: "rgba(201,168,76,0.22)",
  amberGlow:   "rgba(201,168,76,0.3)",

  boldHighlight: "#e8d48b",
  listBullet:    "#c9a84c",

  liveDot: "#c9a84c",
  kbDot:   "#6ee7b7",
  aiDot:   "#a78bfa",

  fontBody:    "'Georgia', 'Times New Roman', serif",
  fontHeading: "'Playfair Display', serif",

  previewBg:     "#12110e",
  previewAccent: "#c9a84c",
};

// ────────────────────────────────────────────────────────────────
// 4. SIGNAL — Navy · White · Verified Green
// Trust-first. Clean light mode. Corporate-safe and modern.
// ────────────────────────────────────────────────────────────────
export const signal: ChatTheme = {
  id: "signal",
  name: "Signal",
  tagline: "Trust-first. Clean light mode. Corporate-safe.",
  palette: "Navy \u00B7 White \u00B7 Verified Green",
  mode: "light",

  bg:     "#f5f7fa",
  card:   "#ffffff",
  header: "#ffffff",
  border: "#e2e8f0",
  input:  "#f1f5f9",

  text:   "#1e293b",
  muted:  "#94a3b8",
  subtle: "#64748b",

  amber:       "#16a34a",
  amberDark:   "#15803d",
  amberBg:     "rgba(22,163,74,0.08)",
  amberBorder: "rgba(22,163,74,0.20)",
  amberGlow:   "rgba(22,163,74,0.25)",

  boldHighlight: "#166534",
  listBullet:    "#16a34a",

  liveDot: "#16a34a",
  kbDot:   "#16a34a",
  aiDot:   "#7c3aed",

  fontBody:    "'Inter', system-ui, sans-serif",
  fontHeading: "'Inter', system-ui, sans-serif",

  previewBg:     "#f5f7fa",
  previewAccent: "#16a34a",
};

// ────────────────────────────────────────────────────────────────
// 5. SLATE EDITORIAL — Near-Black · Off-White · Coral Accent
// Editorial confidence. Coral is the only pop. Feels like a
// product that shipped, not a demo.
// ────────────────────────────────────────────────────────────────
export const slate: ChatTheme = {
  id: "slate",
  name: "Slate Editorial",
  tagline: "Editorial confidence. Coral is the only pop.",
  palette: "Near-Black \u00B7 Off-White \u00B7 Coral",
  mode: "dark",

  bg:     "#0e0e11",
  card:   "#191920",
  header: "#131316",
  border: "#28282f",
  input:  "#131316",

  text:   "#e0ded9",
  muted:  "#6a6a78",
  subtle: "#8e8e9e",

  amber:       "#f97066",
  amberDark:   "#e85d52",
  amberBg:     "rgba(249,112,102,0.10)",
  amberBorder: "rgba(249,112,102,0.22)",
  amberGlow:   "rgba(249,112,102,0.3)",

  boldHighlight: "#fca5a0",
  listBullet:    "#f97066",

  liveDot: "#f97066",
  kbDot:   "#34d399",
  aiDot:   "#818cf8",

  fontBody:    "'Inter', system-ui, sans-serif",
  fontHeading: "'Playfair Display', serif",

  previewBg:     "#0e0e11",
  previewAccent: "#f97066",
};

// ────────────────────────────────────────────────────────────────
// Registry
// ────────────────────────────────────────────────────────────────
export const THEMES: ChatTheme[] = [obsidian, monolith, counsel, signal, slate];

export function getThemeById(id: string): ChatTheme {
  return THEMES.find(t => t.id === id) ?? obsidian;
}
