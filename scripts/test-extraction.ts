import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { extractReceipt, isMockMode } from "../src/lib/extraction";

const FIXTURES_DIR = join(__dirname, "..", "tests", "fixtures", "receipts");
const ACCURACY_THRESHOLD = 0.85;

type ExpectedItem = {
  raw_label: string;
  normalized_name: string | null;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_price: number | null;
  is_food: boolean;
};

type Expected = {
  illegible?: boolean;
  items: ExpectedItem[];
};

function closeEnough(a: number | null, b: number | null, tolerance = 0.05): boolean {
  if (a == null || b == null) return a === b;
  return Math.abs(a - b) <= tolerance;
}

function lineMatches(expected: ExpectedItem, actual: ExpectedItem | undefined): boolean {
  if (!actual) return false;
  return (
    expected.normalized_name === actual.normalized_name &&
    closeEnough(expected.quantity, actual.quantity) &&
    closeEnough(expected.total_price, actual.total_price)
  );
}

async function scoreFixture(name: string) {
  const dir = join(FIXTURES_DIR, name);
  const expected: Expected = JSON.parse(readFileSync(join(dir, "expected.json"), "utf-8"));
  const imageBuffer = readFileSync(join(dir, "receipt.png"));

  const result = await extractReceipt([
    { base64: imageBuffer.toString("base64"), mediaType: "image/png" },
  ]);

  if (expected.illegible) {
    console.log(
      `  ${name}: illegible fixture — confidence ${result.confidence.toFixed(2)} (excluded from accuracy gate)`,
    );
    return null;
  }

  let matched = 0;
  for (const expectedItem of expected.items) {
    const actualItem = result.items.find(
      (item) => item.raw_label === expectedItem.raw_label,
    );
    if (lineMatches(expectedItem, actualItem)) matched++;
  }

  const accuracy = expected.items.length === 0 ? 1 : matched / expected.items.length;
  console.log(
    `  ${name}: ${matched}/${expected.items.length} lines correct (${(accuracy * 100).toFixed(0)}%)`,
  );
  return { matched, total: expected.items.length };
}

async function main() {
  const fixtureNames = readdirSync(FIXTURES_DIR).filter((name) =>
    readdirSync(join(FIXTURES_DIR, name)).includes("expected.json"),
  );

  console.log(`Testing extraction accuracy on ${fixtureNames.length} fixtures...`);
  if (isMockMode()) {
    console.log(
      "MOCK_MODE is active (no ANTHROPIC_API_KEY) — results reflect the fixed mock extractor, not real OCR accuracy.",
    );
  }

  let totalMatched = 0;
  let totalItems = 0;
  for (const name of fixtureNames) {
    const result = await scoreFixture(name);
    if (result) {
      totalMatched += result.matched;
      totalItems += result.total;
    }
  }

  const overall = totalItems === 0 ? 0 : totalMatched / totalItems;
  console.log(
    `\nOverall accuracy: ${totalMatched}/${totalItems} lines (${(overall * 100).toFixed(1)}%)`,
  );

  if (isMockMode()) {
    console.log("Skipping the 85% gate — MOCK_MODE does not exercise real extraction.");
    return;
  }

  if (overall < ACCURACY_THRESHOLD) {
    console.error(`Below the ${ACCURACY_THRESHOLD * 100}% threshold.`);
    process.exit(1);
  }
  console.log(`Meets the ${ACCURACY_THRESHOLD * 100}% threshold.`);
}

main();
