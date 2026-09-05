import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "..", "tests", "fixtures", "receipts");

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderReceiptSvg(lines, { width = 640, blurry = false } = {}) {
  const lineHeight = 30;
  const padding = 40;
  const height = lines.length * lineHeight + padding * 2;
  const fill = blurry ? "#cfcfcf" : "#111111";
  const textLines = lines
    .map(
      (line, i) =>
        `<text x="${padding}" y="${padding + i * lineHeight + 20}" font-family="monospace" font-size="20" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join("\n");

  const noise = blurry
    ? Array.from({ length: 40 })
        .map(
          () =>
            `<rect x="${Math.random() * width}" y="${Math.random() * height}" width="${20 + Math.random() * 60}" height="2" fill="#e5e5e5"/>`,
        )
        .join("\n")
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#fdfdfa"/>
    ${textLines}
    ${noise}
  </svg>`;
}

async function writeFixture(name, lines, expected, options = {}) {
  const dir = join(FIXTURES_DIR, name);
  mkdirSync(dir, { recursive: true });
  const svg = renderReceiptSvg(lines, options);
  await sharp(Buffer.from(svg)).png().toFile(join(dir, "receipt.png"));
  writeFileSync(join(dir, "expected.json"), JSON.stringify(expected, null, 2));
  console.log("wrote fixture", name);
}

const fixtures = [];

// 1. Mexican supermarket (es-MX, MXN)
fixtures.push(
  writeFixture(
    "mx-supermercado",
    [
      "SUPERMERCADO EL AGUILA",
      "TICKET DE COMPRA",
      "------------------------",
      "JIT TOM 1.250KG",
      "  18.90/KG          23.63",
      "CEBOLLA BCA 0.800KG",
      "  22.00/KG          17.60",
      "LECHE LALA 1L           28.00",
      "HUEVO SN BCO 30PZ       95.00",
      "PAN BIMBO GDE           42.50",
      "POLLO PIERNA/MUSLO 1.100KG",
      "  65.00/KG          71.50",
      "JABON ZOTE              18.00",
      "------------------------",
      "TOTAL                  296.23",
      "01/09/2026",
    ],
    {
      store_name: "Supermercado El Aguila",
      purchased_at: "2026-09-01",
      currency: "MXN",
      total_amount: 296.23,
      confidence: 0.9,
      items: [
        { raw_label: "JIT TOM 1.250KG", normalized_name: "jitomate", category: "produce", quantity: 1.25, unit: "kg", unit_price: 18.9, total_price: 23.63, is_food: true },
        { raw_label: "CEBOLLA BCA 0.800KG", normalized_name: "cebolla", category: "produce", quantity: 0.8, unit: "kg", unit_price: 22.0, total_price: 17.6, is_food: true },
        { raw_label: "LECHE LALA 1L", normalized_name: "leche", category: "dairy", quantity: 1, unit: "l", unit_price: 28.0, total_price: 28.0, is_food: true },
        { raw_label: "HUEVO SN BCO 30PZ", normalized_name: "huevo", category: "dairy", quantity: 1, unit: "unit", unit_price: 95.0, total_price: 95.0, is_food: true },
        { raw_label: "PAN BIMBO GDE", normalized_name: "pan", category: "bakery", quantity: 1, unit: "unit", unit_price: 42.5, total_price: 42.5, is_food: true },
        { raw_label: "POLLO PIERNA/MUSLO 1.100KG", normalized_name: "pollo", category: "meat", quantity: 1.1, unit: "kg", unit_price: 65.0, total_price: 71.5, is_food: true },
        { raw_label: "JABON ZOTE", normalized_name: "jabon", category: "household", quantity: 1, unit: "unit", unit_price: 18.0, total_price: 18.0, is_food: false },
      ],
    },
  ),
);

// 2. Mexican convenience store (es-MX, MXN)
fixtures.push(
  writeFixture(
    "mx-tienda",
    [
      "OXXO SUCURSAL CENTRO",
      "------------------------",
      "AGUA CIEL 1L            15.00",
      "REFRESCO COCA 600ML     18.00",
      "SABRITAS ORIG 45G       17.00",
      "PAN BIMBO CH            22.00",
      "CIGARROS MARL           75.00",
      "------------------------",
      "TOTAL                  147.00",
      "02/09/2026",
    ],
    {
      store_name: "Oxxo Sucursal Centro",
      purchased_at: "2026-09-02",
      currency: "MXN",
      total_amount: 147.0,
      confidence: 0.88,
      items: [
        { raw_label: "AGUA CIEL 1L", normalized_name: "agua", category: "beverage", quantity: 1, unit: "l", unit_price: 15.0, total_price: 15.0, is_food: true },
        { raw_label: "REFRESCO COCA 600ML", normalized_name: "refresco", category: "beverage", quantity: 1, unit: "unit", unit_price: 18.0, total_price: 18.0, is_food: true },
        { raw_label: "SABRITAS ORIG 45G", normalized_name: "sabritas", category: "pantry", quantity: 1, unit: "unit", unit_price: 17.0, total_price: 17.0, is_food: true },
        { raw_label: "PAN BIMBO CH", normalized_name: "pan", category: "bakery", quantity: 1, unit: "unit", unit_price: 22.0, total_price: 22.0, is_food: true },
        { raw_label: "CIGARROS MARL", normalized_name: "cigarros", category: "household", quantity: 1, unit: "unit", unit_price: 75.0, total_price: 75.0, is_food: false },
      ],
    },
  ),
);

// 3. Mexican market (es-MX, MXN, no store name)
fixtures.push(
  writeFixture(
    "mx-mercado",
    [
      "MERCADO SOBRE RUEDAS",
      "AGUACATE HASS KG        45.00",
      "TOMATE BOLA KG          20.00",
      "CEBOLLA KG              18.00",
      "LIMON KG                25.00",
      "CILANTRO MANOJO          8.00",
      "TOTAL                  116.00",
    ],
    {
      store_name: "Mercado Sobre Ruedas",
      purchased_at: null,
      currency: "MXN",
      total_amount: 116.0,
      confidence: 0.85,
      items: [
        { raw_label: "AGUACATE HASS KG", normalized_name: "aguacate", category: "produce", quantity: 1, unit: "kg", unit_price: 45.0, total_price: 45.0, is_food: true },
        { raw_label: "TOMATE BOLA KG", normalized_name: "tomate", category: "produce", quantity: 1, unit: "kg", unit_price: 20.0, total_price: 20.0, is_food: true },
        { raw_label: "CEBOLLA KG", normalized_name: "cebolla", category: "produce", quantity: 1, unit: "kg", unit_price: 18.0, total_price: 18.0, is_food: true },
        { raw_label: "LIMON KG", normalized_name: "limon", category: "produce", quantity: 1, unit: "kg", unit_price: 25.0, total_price: 25.0, is_food: true },
        { raw_label: "CILANTRO MANOJO", normalized_name: "cilantro", category: "produce", quantity: 1, unit: "unit", unit_price: 8.0, total_price: 8.0, is_food: true },
      ],
    },
  ),
);

// 4. French supermarket (fr-FR, EUR)
fixtures.push(
  writeFixture(
    "fr-supermarche",
    [
      "CARREFOUR MARKET",
      "------------------------",
      "TOMATES GRAPPE 0.600KG",
      "  2.50E/KG            1.50E",
      "LAIT DEMI ECREME 1L    0.95E",
      "OEUFS X12              2.80E",
      "POULET FERMIER 1.200KG",
      "  8.90E/KG           10.68E",
      "PAIN COMPLET           1.20E",
      "SAVON DOP              2.10E",
      "------------------------",
      "TOTAL                 19.23E",
      "03/09/2026",
    ],
    {
      store_name: "Carrefour Market",
      purchased_at: "2026-09-03",
      currency: "EUR",
      total_amount: 19.23,
      confidence: 0.91,
      items: [
        { raw_label: "TOMATES GRAPPE 0.600KG", normalized_name: "tomate", category: "produce", quantity: 0.6, unit: "kg", unit_price: 2.5, total_price: 1.5, is_food: true },
        { raw_label: "LAIT DEMI ECREME 1L", normalized_name: "lait", category: "dairy", quantity: 1, unit: "l", unit_price: 0.95, total_price: 0.95, is_food: true },
        { raw_label: "OEUFS X12", normalized_name: "oeuf", category: "dairy", quantity: 1, unit: "unit", unit_price: 2.8, total_price: 2.8, is_food: true },
        { raw_label: "POULET FERMIER 1.200KG", normalized_name: "poulet", category: "meat", quantity: 1.2, unit: "kg", unit_price: 8.9, total_price: 10.68, is_food: true },
        { raw_label: "PAIN COMPLET", normalized_name: "pain", category: "bakery", quantity: 1, unit: "unit", unit_price: 1.2, total_price: 1.2, is_food: true },
        { raw_label: "SAVON DOP", normalized_name: "savon", category: "household", quantity: 1, unit: "unit", unit_price: 2.1, total_price: 2.1, is_food: false },
      ],
    },
  ),
);

// 5. French superette (fr-FR, EUR)
fixtures.push(
  writeFixture(
    "fr-superette",
    [
      "SUPERETTE DU COIN",
      "EAU EVIAN 1.5L          0.80E",
      "BAGUETTE                1.10E",
      "JAMBON BLANC 4TR        2.60E",
      "FROMAGE RAPE 200G       2.30E",
      "TOTAL                   6.80E",
      "04/09/2026",
    ],
    {
      store_name: "Superette du Coin",
      purchased_at: "2026-09-04",
      currency: "EUR",
      total_amount: 6.8,
      confidence: 0.87,
      items: [
        { raw_label: "EAU EVIAN 1.5L", normalized_name: "eau", category: "beverage", quantity: 1.5, unit: "l", unit_price: 0.8, total_price: 0.8, is_food: true },
        { raw_label: "BAGUETTE", normalized_name: "baguette", category: "bakery", quantity: 1, unit: "unit", unit_price: 1.1, total_price: 1.1, is_food: true },
        { raw_label: "JAMBON BLANC 4TR", normalized_name: "jambon", category: "meat", quantity: 1, unit: "unit", unit_price: 2.6, total_price: 2.6, is_food: true },
        { raw_label: "FROMAGE RAPE 200G", normalized_name: "fromage rape", category: "dairy", quantity: 1, unit: "unit", unit_price: 2.3, total_price: 2.3, is_food: true },
      ],
    },
  ),
);

// 6. French market (fr-FR, EUR) — includes an item absent from the catalog
fixtures.push(
  writeFixture(
    "fr-marche",
    [
      "MARCHE DE PROVENCE",
      "POMMES GALA KG          2.20E",
      "CAROTTES BOTTE          1.50E",
      "POIREAUX BOTTE          1.80E",
      "OIGNONS JAUNES KG       1.40E",
      "TOTAL                   6.90E",
    ],
    {
      store_name: "Marche de Provence",
      purchased_at: null,
      currency: "EUR",
      total_amount: 6.9,
      confidence: 0.83,
      items: [
        { raw_label: "POMMES GALA KG", normalized_name: "pomme", category: "produce", quantity: 1, unit: "kg", unit_price: 2.2, total_price: 2.2, is_food: true },
        { raw_label: "CAROTTES BOTTE", normalized_name: "carotte", category: "produce", quantity: 1, unit: "unit", unit_price: 1.5, total_price: 1.5, is_food: true },
        { raw_label: "POIREAUX BOTTE", normalized_name: "poireau", category: "produce", quantity: 1, unit: "unit", unit_price: 1.8, total_price: 1.8, is_food: true },
        { raw_label: "OIGNONS JAUNES KG", normalized_name: "oignon", category: "produce", quantity: 1, unit: "kg", unit_price: 1.4, total_price: 1.4, is_food: true },
      ],
    },
  ),
);

// 7. Illegible / blurry receipt — scored separately, not part of the 85% gate
fixtures.push(
  writeFixture(
    "illegible",
    ["? ? ? ? ? ? ?", "?????? ??? ??", "??? ??????", "??? ???"],
    {
      illegible: true,
      store_name: null,
      purchased_at: null,
      currency: "MXN",
      total_amount: null,
      confidence: 0.2,
      items: [],
    },
    { blurry: true },
  ),
);

// 8. Very long receipt (stress test)
const longItems = [
  ["JIT TOM 1KG", "jitomate", "produce", 1, "kg", 19.0],
  ["CEBOLLA BCA KG", "cebolla", "produce", 1, "kg", 21.0],
  ["PAPA BLANCA KG", "papa", "produce", 2, "kg", 16.0],
  ["ZANAHORIA KG", "zanahoria", "produce", 1, "kg", 14.0],
  ["MANZANA ROJA KG", "manzana", "produce", 1, "kg", 38.0],
  ["PLATANO TAB KG", "platano", "produce", 1, "kg", 17.0],
  ["NARANJA KG", "naranja", "produce", 2, "kg", 15.0],
  ["LECHE LALA 1L", "leche", "dairy", 2, "unit", 28.0],
  ["YOGUR YOPLAIT 1L", "yogur", "dairy", 1, "unit", 45.0],
  ["QUESO OAX 400G", "queso oaxaca", "dairy", 1, "unit", 68.0],
  ["HUEVO SN BCO 30PZ", "huevo", "dairy", 1, "unit", 95.0],
  ["MANTEQUILLA LALA", "mantequilla", "dairy", 1, "unit", 39.0],
  ["POLLO PIERNA/MUSLO KG", "pollo", "meat", 1.5, "kg", 62.0],
  ["CARNE MOLIDA KG", "carne molida", "meat", 1, "kg", 145.0],
  ["JAMON FUD 250G", "jamon", "meat", 1, "unit", 42.0],
  ["PAN BIMBO GDE", "pan", "bakery", 1, "unit", 42.5],
  ["TORT MAIZ 1KG", "tortilla", "bakery", 1, "unit", 22.0],
  ["ARROZ SOS 1KG", "arroz", "pantry", 1, "unit", 28.0],
  ["FRIJOL NEGRO 900G", "frijol", "pantry", 1, "unit", 32.0],
  ["ACEITE 123 1L", "aceite", "pantry", 1, "unit", 45.0],
  ["REFRESCO COCA 600ML", "refresco", "beverage", 3, "unit", 18.0],
  ["AGUA CIEL 1L", "agua", "beverage", 2, "unit", 15.0],
];
const longLines = ["SUPERMERCADO EL AGUILA", "TICKET LARGO", "------------------------"];
let longTotal = 0;
for (const [raw, , , qty, , price] of longItems) {
  const total = Math.round(qty * price * 100) / 100;
  longTotal += total;
  longLines.push(raw.padEnd(24) + total.toFixed(2).padStart(8));
}
longLines.push("------------------------", "TOTAL" + longTotal.toFixed(2).padStart(27), "05/09/2026");

fixtures.push(
  writeFixture(
    "mx-largo",
    longLines,
    {
      store_name: "Supermercado El Aguila",
      purchased_at: "2026-09-05",
      currency: "MXN",
      total_amount: Math.round(longTotal * 100) / 100,
      confidence: 0.88,
      items: longItems.map(([raw, normalized_name, category, quantity, unit, unit_price]) => ({
        raw_label: raw,
        normalized_name,
        category,
        quantity,
        unit,
        unit_price,
        total_price: Math.round(quantity * unit_price * 100) / 100,
        is_food: true,
      })),
    },
    { width: 700 },
  ),
);

await Promise.all(fixtures);
console.log(`Generated ${fixtures.length} fixtures.`);
