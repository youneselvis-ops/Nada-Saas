import { describe, expect, it } from "vitest";
import { normalizeLabel } from "@/lib/normalize";

describe("normalizeLabel", () => {
  const cases: [string, string][] = [
    // es-MX
    ["JIT TOM 1KG", "jitomate"],
    ["CEBOLLA BCA", "cebolla"],
    ["PLATANO TAB", "platano"],
    ["HUEVO SN BCO 30PZ", "huevo"],
    ["LECHE LALA 1L", "leche"],
    ["PAN BIMBO GDE", "pan"],
    ["QUESO OAX 400G", "queso oaxaca"],
    ["POLLO PIERNA/MUSLO", "pollo"],
    ["TORT MAIZ 1KG", "tortilla"],
    ["ARROZ SOS 1KG", "arroz"],
    ["FRIJOL NEGRO 900G", "frijol"],
    ["ACEITE 123 1L", "aceite"],
    ["REFRESCO COCA 600ML", "refresco"],
    ["AGUA CIEL 1L", "agua"],
    ["MANZANA ROJA KG", "manzana"],
    ["AGUACATE HASS KG", "aguacate"],
    ["LIMON SIN SEM KG", "limon"],
    ["JAMON FUD 250G", "jamon"],
    ["CREMA LALA 200ML", "crema"],
    ["YOGUR YOPLAIT 1L", "yogur"],
    // fr-FR
    ["TOMATES GRAPPE", "tomate"],
    ["LAIT DEMI ECREME 1L", "lait"],
    ["OEUFS X12", "oeuf"],
    ["PAIN COMPLET", "pain"],
    ["POULET FERMIER", "poulet"],
    ["BEURRE DOUX 250G", "beurre"],
    ["YAOURT NATURE X8", "yaourt"],
    ["FROMAGE RAPE 200G", "fromage rape"],
    ["JAMBON BLANC 4TR", "jambon"],
    ["CAROTTES BOTTE", "carotte"],
    ["POMMES GALA KG", "pomme"],
    ["OIGNONS JAUNES KG", "oignon"],
    ["COURGETTES KG", "courgette"],
    ["EAU EVIAN 1.5L", "eau"],
    ["CAFE MOULU 250G", "cafe"],
  ];

  it.each(cases)("normalizes %s -> %s", (raw, expected) => {
    expect(normalizeLabel(raw)).toBe(expected);
  });

  it("strips accents", () => {
    expect(normalizeLabel("LIMÓN")).toBe("limon");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeLabel("")).toBe("");
  });
});
