/**
 * productLinks.ts
 *
 * Instant client-side keyword → Go Build Supply URL map.
 * Loaded once at startup, zero latency on every AI response.
 *
 * Rules:
 * - Keys are lowercase, matched case-insensitively against AI text
 * - Longer / more specific phrases must come BEFORE shorter ones
 *   (the linkify function processes them in order)
 * - URLs use /collections/ for categories, /products/ for specific items
 * - Only link terms that are genuinely purchasable at gobuildsupply.com
 */

const BASE = "https://www.gobuildsupply.com";

export type ProductLink = {
  url: string;
  label?: string; // optional display override
};

// Ordered from most specific to least specific so longer phrases match first
export const PRODUCT_KEYWORD_MAP: Array<[string, string]> = [
  // ── Drywall ────────────────────────────────────────────────────────────────
  ["drywall screws",           `${BASE}/collections/drywall-screws`],
  ["drywall tape",             `${BASE}/collections/drywall-tape-repair-mesh`],
  ["drywall repair mesh",      `${BASE}/collections/drywall-tape-repair-mesh`],
  ["drywall tools",            `${BASE}/collections/drywall-tools`],
  ["drywall board",            `${BASE}/collections/drywall-board`],
  ["drywall anchors",          `${BASE}/collections/drywall-anchors`],
  ["drywall",                  `${BASE}/collections/drywall`],
  ["sheetrock",                `${BASE}/collections/drywall`],
  ["gypsum board",             `${BASE}/collections/drywall-board`],
  ["joint compound",           `${BASE}/collections/joint-compound`],
  ["all-purpose compound",     `${BASE}/collections/joint-compound`],
  ["corner bead",              `${BASE}/collections/corner-bead-trim`],
  ["corner trim",              `${BASE}/collections/corner-bead-trim`],
  ["mesh tape",                `${BASE}/collections/drywall-tape-repair-mesh`],
  ["paper tape",               `${BASE}/collections/drywall-tape-repair-mesh`],

  // ── Paint & Painting Supplies ──────────────────────────────────────────────
  ["semi-gloss paint",         `${BASE}/collections/paint`],
  ["semi gloss paint",         `${BASE}/collections/paint`],
  ["exterior paint",           `${BASE}/collections/paint`],
  ["interior paint",           `${BASE}/collections/interior-paint`],
  ["deck paint",               `${BASE}/collections/paint`],
  ["latex paint",              `${BASE}/collections/paint`],
  ["primer",                   `${BASE}/collections/paint`],
  ["paint primer",             `${BASE}/collections/paint`],
  ["paint roller",             `${BASE}/collections/painting-supplies`],
  ["roller refill",            `${BASE}/collections/painting-supplies`],
  ["paint brush",              `${BASE}/collections/painting-supplies`],
  ["paintbrush",               `${BASE}/collections/painting-supplies`],
  ["paint brushes",            `${BASE}/collections/painting-supplies`],
  ["painters tape",            `${BASE}/collections/painters-tape`],
  ["masking tape",             `${BASE}/collections/painters-tape`],
  ["drop cloth",               `${BASE}/collections/floor-protection-drop-cloths`],
  ["drop cloths",              `${BASE}/collections/floor-protection-drop-cloths`],
  ["floor protection",         `${BASE}/collections/floor-protection-drop-cloths`],
  ["rosin paper",              `${BASE}/collections/floor-protection-drop-cloths`],
  ["sanding sponge",           `${BASE}/collections/abrasives`],
  ["sandpaper",                `${BASE}/collections/abrasives`],
  ["sanding block",            `${BASE}/collections/abrasives`],
  ["abrasives",                `${BASE}/collections/abrasives`],
  ["paint",                    `${BASE}/collections/paint`],
  ["painting supplies",        `${BASE}/collections/painting-supplies`],
  ["painting tools",           `${BASE}/collections/painting-sanding-tools`],

  // ── Insulation ────────────────────────────────────────────────────────────
  ["rigid insulation",         `${BASE}/collections/insulation`],
  ["foam insulation",          `${BASE}/collections/insulation`],
  ["spray foam",               `${BASE}/collections/insulation`],
  ["fiberglass insulation",    `${BASE}/collections/fiberglass-insulation`],
  ["batt insulation",          `${BASE}/collections/fiberglass-insulation`],
  ["stone wool insulation",    `${BASE}/collections/insulation`],
  ["mineral wool",             `${BASE}/collections/insulation`],
  ["rockwool",                 `${BASE}/collections/insulation`],
  ["roxul",                    `${BASE}/collections/insulation`],
  ["owens corning",            `${BASE}/collections/owens-corning-insulation`],
  ["r-value",                  `${BASE}/collections/insulation`],
  ["insulation",               `${BASE}/collections/insulation`],
  ["housewrap",                `${BASE}/collections/housewrap-insulation-membrane`],
  ["house wrap",               `${BASE}/collections/housewrap-insulation-membrane`],
  ["vapor barrier",            `${BASE}/collections/housewrap-insulation-membrane`],
  ["poly sheeting",            `${BASE}/collections/housewrap-insulation-membrane`],

  // ── Lumber & Wood ─────────────────────────────────────────────────────────
  ["pressure treated lumber",  `${BASE}/collections/framing-lumber`],
  ["pressure-treated lumber",  `${BASE}/collections/framing-lumber`],
  ["framing lumber",           `${BASE}/collections/framing-lumber`],
  ["2x4 lumber",               `${BASE}/collections/2-in-x-4-in`],
  ["2x6 lumber",               `${BASE}/collections/2-in-x-6-in`],
  ["2x8 lumber",               `${BASE}/collections/2-in-x-8-in`],
  ["2x10 lumber",              `${BASE}/collections/2-in-x-10-in`],
  ["2x12 lumber",              `${BASE}/collections/2-in-x-12-in`],
  ["2 x 4",                    `${BASE}/collections/2-in-x-4-in`],
  ["2 x 6",                    `${BASE}/collections/2-in-x-6-in`],
  ["plywood",                  `${BASE}/collections/plywood-osb-mdf`],
  ["osb",                      `${BASE}/collections/osb`],
  ["oriented strand board",    `${BASE}/collections/osb`],
  ["cdx plywood",              `${BASE}/collections/plywood-osb-mdf`],
  ["mdf",                      `${BASE}/collections/mdf-hardboard`],
  ["hardboard",                `${BASE}/collections/mdf-hardboard`],
  ["cedar",                    `${BASE}/collections/cedar`],
  ["finishing lumber",         `${BASE}/collections/finishing-lumber`],
  ["lumber",                   `${BASE}/collections/framing-lumber`],

  // ── Fasteners ─────────────────────────────────────────────────────────────
  ["framing nails",            `${BASE}/collections/framing-nails`],
  ["finish nails",             `${BASE}/collections/finish-nails`],
  ["common nails",             `${BASE}/collections/common-nails`],
  ["masonry nails",            `${BASE}/collections/masonry-nails`],
  ["deck screws",              `${BASE}/collections/deck-screws`],
  ["construction screws",      `${BASE}/collections/construction-screws`],
  ["concrete screws",          `${BASE}/collections/concrete-screws`],
  ["cement board screws",      `${BASE}/collections/cement-board-screws`],
  ["lag bolts",                `${BASE}/collections/lag-bolts`],
  ["carriage bolts",           `${BASE}/collections/carriage-bolts-and-threaded-rods`],
  ["bolts",                    `${BASE}/collections/bolts-nuts-washers`],
  ["nuts and washers",         `${BASE}/collections/nuts-washers`],
  ["anchors",                  `${BASE}/collections/anchors`],
  ["concrete anchors",         `${BASE}/collections/concrete-anchors`],
  ["screws",                   `${BASE}/collections/construction-screws`],
  ["nails",                    `${BASE}/collections/nails`],
  ["fasteners",                `${BASE}/collections/fasteners`],

  // ── Steel Framing ─────────────────────────────────────────────────────────
  ["steel studs",              `${BASE}/collections/framing-lumber-steel-stud`],
  ["metal studs",              `${BASE}/collections/framing-lumber-steel-stud`],
  ["steel stud",               `${BASE}/collections/framing-lumber-steel-stud`],
  ["wall track",               `${BASE}/collections/framing-lumber-steel-stud`],
  ["framing track",            `${BASE}/collections/framing-lumber-steel-stud`],
  ["furring channel",          `${BASE}/collections/framing-lumber-steel-stud`],
  ["utility angle",            `${BASE}/collections/framing-lumber-steel-stud`],

  // ── Concrete & Masonry ────────────────────────────────────────────────────
  ["concrete mix",             `${BASE}/collections/concrete-cement-mortar-mix`],
  ["mortar mix",               `${BASE}/collections/concrete-cement-mortar-mix`],
  ["mortar",                   `${BASE}/collections/mortar-grout`],
  ["grout",                    `${BASE}/collections/mortar-grout`],
  ["concrete repair",          `${BASE}/collections/concrete-repairs-sealers`],
  ["concrete sealer",          `${BASE}/collections/concrete-repairs-sealers`],
  ["masonry tools",            `${BASE}/collections/cement-masonry-tools`],
  ["cement board",             `${BASE}/collections/cement-board`],
  ["concrete",                 `${BASE}/collections/concrete-cement-mortar`],
  ["cement",                   `${BASE}/collections/cement-masonry`],

  // ── Caulk & Adhesive ──────────────────────────────────────────────────────
  ["construction adhesive",    `${BASE}/collections/construction-adhesive`],
  ["caulk",                    `${BASE}/collections/caulk-sealants`],
  ["caulking",                 `${BASE}/collections/caulking-adhesive`],
  ["sealant",                  `${BASE}/collections/caulk-sealants`],
  ["silicone caulk",           `${BASE}/collections/caulk-sealants`],
  ["wood filler",              `${BASE}/collections/caulking-adhesive`],
  ["wood putty",               `${BASE}/collections/caulking-adhesive`],
  ["glue",                     `${BASE}/collections/glue-epoxy`],
  ["epoxy",                    `${BASE}/collections/glue-epoxy`],

  // ── Decking & Fencing ─────────────────────────────────────────────────────
  ["composite decking",        `${BASE}/collections/composite-decking`],
  ["deck boards",              `${BASE}/collections/deck-boards`],
  ["deck railing",             `${BASE}/collections/deck-railing-stairs`],
  ["fence boards",             `${BASE}/collections/fence-boards`],
  ["fence hardware",           `${BASE}/collections/fence-hardware`],
  ["decking",                  `${BASE}/collections/fencing-decking`],
  ["fencing",                  `${BASE}/collections/fencing-decking`],

  // ── Doors & Hardware ──────────────────────────────────────────────────────
  ["door hardware",            `${BASE}/collections/door-hardware`],
  ["door hinges",              `${BASE}/collections/door-hinges`],
  ["door stops",               `${BASE}/collections/door-stops`],
  ["interior doors",           `${BASE}/collections/interior-doors`],
  ["exterior doors",           `${BASE}/collections/exterior-doors`],
  ["bifold door",              `${BASE}/collections/bifold-door`],
  ["door locks",               `${BASE}/collections/handles-locks`],
  ["door handles",             `${BASE}/collections/handles-locks`],
  ["door",                     `${BASE}/collections/doors-accessories`],

  // ── Electrical ────────────────────────────────────────────────────────────
  ["electrical wire",          `${BASE}/collections/electrical-wires`],
  ["electrical boxes",         `${BASE}/collections/electrical-boxes`],
  ["conduit",                  `${BASE}/collections/conduits`],
  ["outlets",                  `${BASE}/collections/outlets`],
  ["light switches",           `${BASE}/collections/light-switches-dimmers`],
  ["dimmers",                  `${BASE}/collections/light-switches-dimmers`],
  ["breakers",                 `${BASE}/collections/breakers-panels`],
  ["electrical panel",         `${BASE}/collections/breakers-panels`],
  ["electrical",               `${BASE}/collections/electrical`],

  // ── Plumbing ──────────────────────────────────────────────────────────────
  ["pex pipe",                 `${BASE}/collections/pex-pipes`],
  ["pex fittings",             `${BASE}/collections/pex-fittings`],
  ["copper fittings",          `${BASE}/collections/copper-fittings`],
  ["ball valves",              `${BASE}/collections/ball-valves`],
  ["plumbing",                 `${BASE}/collections/plumbing`],

  // ── Tools ─────────────────────────────────────────────────────────────────
  ["circular saw blades",      `${BASE}/collections/circular-saw-blades`],
  ["drill bits",               `${BASE}/collections/drill-bits`],
  ["hole saws",                `${BASE}/collections/hole-saws`],
  ["jigsaw blades",            `${BASE}/collections/jigsaw-blade`],
  ["oscillating blades",       `${BASE}/collections/oscillating-multi-tool-blades`],
  ["hand tools",               `${BASE}/collections/hand-tools`],
  ["air tools",                `${BASE}/collections/air-tools-compressors`],
  ["drills",                   `${BASE}/collections/drills-impact-drivers`],
  ["impact driver",            `${BASE}/collections/drills-impact-drivers`],
  ["measuring tools",          `${BASE}/collections/measuring-detecting-tools`],
  ["caulking gun",             `${BASE}/collections/caulking-tools`],
  ["tools",                    `${BASE}/collections/hand-tools`],

  // ── Safety & Site Management ──────────────────────────────────────────────
  ["n95 mask",                 `${BASE}/collections/personal-protective-equipment`],
  ["respirator",               `${BASE}/collections/personal-protective-equipment`],
  ["safety glasses",           `${BASE}/collections/personal-protective-equipment`],
  ["work gloves",              `${BASE}/collections/personal-protective-equipment`],
  ["ppe",                      `${BASE}/collections/personal-protective-equipment`],
  ["garbage bags",             `${BASE}/collections/cleaning-supplies`],
  ["contractor bags",          `${BASE}/collections/cleaning-supplies`],
  ["cleaning supplies",        `${BASE}/collections/cleaning-supplies`],
  ["ice melt",                 `${BASE}/collections/cleaning-supplies`],

  // ── Moulding & Trim ───────────────────────────────────────────────────────
  ["crown moulding",           `${BASE}/collections/crown-moulding`],
  ["baseboard",                `${BASE}/collections/baseboard`],
  ["door casing",              `${BASE}/collections/door-window-casing`],
  ["window casing",            `${BASE}/collections/door-window-casing`],
  ["moulding",                 `${BASE}/collections/mouldings`],
  ["trim",                     `${BASE}/collections/mouldings`],

  // ── Structural ────────────────────────────────────────────────────────────
  ["joist hangers",            `${BASE}/collections/joist-hangers`],
  ["joist hanger",             `${BASE}/collections/joist-hangers`],
  ["angles and clips",         `${BASE}/collections/angles-clips-straps`],
  ["braces",                   `${BASE}/collections/braces-mending-plates`],
  ["mending plates",           `${BASE}/collections/braces-mending-plates`],
  ["flashings",                `${BASE}/collections/flashings`],
  ["flashing",                 `${BASE}/collections/flashings`],
  ["gutters",                  `${BASE}/collections/gutters-fascia-soffits`],
  ["fascia",                   `${BASE}/collections/gutters-fascia-soffits`],
  ["soffits",                  `${BASE}/collections/gutters-fascia-soffits`],

  // ── Flooring ──────────────────────────────────────────────────────────────
  ["hardwood flooring",        `${BASE}/collections/hardwood-flooring`],
  ["laminate flooring",        `${BASE}/collections/laminate-flooring`],
  ["flooring",                 `${BASE}/collections/flooring-tile-ceiling`],
  ["ceiling tiles",            `${BASE}/collections/ceiling-tiles`],
  ["tile",                     `${BASE}/collections/flooring-tile-ceiling`],
];

/**
 * linkifyResponse(text)
 *
 * Scans the AI response text for known product keywords and wraps them
 * in Markdown-style links. Processes longer phrases first to avoid
 * partial matches. Each keyword is only linked ONCE per response.
 *
 * Strategy: collect all non-overlapping match positions in the ORIGINAL
 * text, then rebuild the string by inserting link markup. This guarantees
 * we never touch URLs or already-linked text.
 *
 * Returns the modified text with [keyword](url) Markdown links injected.
 */
export function linkifyResponse(text: string): string {
  // Build a set of "protected" ranges — positions covered by existing
  // Markdown links [label](url) — so we never match inside them.
  const EXISTING_LINK_RE = /\[[^\]]*\]\([^)]*\)/g;
  const protected_ranges: Array<[number, number]> = [];
  let em: RegExpExecArray | null;
  while ((em = EXISTING_LINK_RE.exec(text)) !== null) {
    protected_ranges.push([em.index, em.index + em[0].length]);
  }

  function isProtected(start: number, end: number): boolean {
    return protected_ranges.some(([s, e]) => start < e && end > s);
  }

  // Collect replacements: { start, end, replacement }
  type Replacement = { start: number; end: number; replacement: string };
  const replacements: Replacement[] = [];
  const usedUrls = new Set<string>();
  const coveredRanges: Array<[number, number]> = [];

  function overlaps(start: number, end: number): boolean {
    return coveredRanges.some(([s, e]) => start < e && end > s);
  }

  for (const [keyword, url] of PRODUCT_KEYWORD_MAP) {
    if (usedUrls.has(url)) continue;

    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word-boundary aware: keyword must not be immediately adjacent to
    // alphanumeric chars (prevents matching "screws" inside "drywall-screws")
    const regex = new RegExp(`(?<![\\w\\-])(${escaped})(?![\\w\\-])`, "gi");

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end   = start + match[0].length;
      if (isProtected(start, end)) continue;
      if (overlaps(start, end))    continue;
      // Only link the FIRST occurrence per URL
      replacements.push({ start, end, replacement: `[${match[0]}](${url})` });
      coveredRanges.push([start, end]);
      usedUrls.add(url);
      break; // first occurrence only
    }
  }

  if (replacements.length === 0) return text;

  // Sort by position and rebuild the string
  replacements.sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  for (const { start, end, replacement } of replacements) {
    result += text.slice(cursor, start) + replacement;
    cursor = end;
  }
  result += text.slice(cursor);
  return result;
}
