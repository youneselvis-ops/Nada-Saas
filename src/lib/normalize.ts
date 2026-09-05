/**
 * Deterministic, rule-based label normalizer. This is the fallback used in
 * MOCK_MODE and the reference implementation exercised by unit tests — real
 * extractions are normalized by the vision model itself (see
 * `src/lib/extraction/prompt.ts`), which handles far more abbreviations than
 * any fixed dictionary could.
 */

const UNIT_QUANTITY_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:kg|g|gr|l|lt|ml|pz|pza|pzas|tr|x)\b|\bx\d+\b/gi;

const NOISE_WORDS = new Set([
  "bca",
  "bco",
  "blanco",
  "blanc",
  "negro",
  "roja",
  "rojo",
  "gala",
  "hass",
  "sin",
  "sem",
  "gde",
  "grande",
  "chica",
  "pierna",
  "muslo",
  "grappe",
  "fermier",
  "doux",
  "nature",
  "demi",
  "ecreme",
  "ecrem",
  "complet",
  "jaunes",
  "jaune",
  "botte",
  "bimbo",
  "lala",
  "sos",
  "coca",
  "ciel",
  "fud",
  "yoplait",
  "evian",
  "123",
]);

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

function cleanTokens(rawLabel: string): string[] {
  const withoutUnits = rawLabel.replace(UNIT_QUANTITY_PATTERN, " ");
  const ascii = stripAccents(withoutUnits.toLowerCase());
  return ascii
    .replace(/[^a-z\s/-]/g, " ")
    .split(/[\s/-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !NOISE_WORDS.has(token));
}

/** Known raw-label fragments -> canonical `normalized_name`, keyed by the
 * cleaned, space-joined significant tokens. Covers common es-MX and fr-FR
 * receipt abbreviations. */
const KNOWN_LABELS: Record<string, string> = {
  "jit tom": "jitomate",
  jitomate: "jitomate",
  cebolla: "cebolla",
  platano: "platano",
  huevo: "huevo",
  "huevo sn": "huevo",
  leche: "leche",
  pan: "pan",
  "queso oax": "queso oaxaca",
  pollo: "pollo",
  "tort maiz": "tortilla",
  tortilla: "tortilla",
  "arroz sos": "arroz",
  arroz: "arroz",
  frijol: "frijol",
  "frijol negro": "frijol",
  aceite: "aceite",
  "refresco coca": "refresco",
  refresco: "refresco",
  agua: "agua",
  "agua ciel": "agua",
  manzana: "manzana",
  aguacate: "aguacate",
  limon: "limon",
  jamon: "jamon",
  crema: "crema",
  yogur: "yogur",
  tomates: "tomate",
  tomate: "tomate",
  lait: "lait",
  oeufs: "oeuf",
  oeuf: "oeuf",
  pain: "pain",
  poulet: "poulet",
  beurre: "beurre",
  yaourt: "yaourt",
  "fromage rape": "fromage rape",
  jambon: "jambon",
  carottes: "carotte",
  carotte: "carotte",
  pommes: "pomme",
  pomme: "pomme",
  oignons: "oignon",
  oignon: "oignon",
  courgettes: "courgette",
  courgette: "courgette",
  eau: "eau",
  cafe: "cafe",
};

function singularize(word: string): string {
  if (word.length > 3 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** Best-effort normalization of a raw receipt line into a canonical name:
 * lowercase, accent-free, singular, with quantities/brands/descriptors
 * stripped. Falls back to a singularized token join when no known mapping
 * exists. */
export function normalizeLabel(rawLabel: string): string {
  const tokens = cleanTokens(rawLabel);
  if (tokens.length === 0) return "";

  for (let length = tokens.length; length >= 1; length--) {
    const key = tokens.slice(0, length).join(" ");
    const known = KNOWN_LABELS[key];
    if (known) return known;
  }

  return tokens.map(singularize).join(" ");
}
