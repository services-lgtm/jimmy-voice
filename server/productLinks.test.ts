/**
 * productLinks.test.ts
 *
 * Tests for the client-side linkifyResponse() function.
 * We import it directly here since it's pure TypeScript with no DOM deps.
 */
import { describe, expect, it } from "vitest";
import { linkifyResponse } from "../client/src/lib/productLinks";

describe("linkifyResponse", () => {
  it("injects a Markdown link for a known keyword", () => {
    const result = linkifyResponse("You should use drywall screws for this job.");
    expect(result).toContain("[drywall screws](https://www.gobuildsupply.com/collections/drywall-screws)");
  });

  it("is case-insensitive — matches 'Drywall Screws' as well as 'drywall screws'", () => {
    const result = linkifyResponse("Use Drywall Screws for hanging panels.");
    expect(result).toContain("https://www.gobuildsupply.com/collections/drywall-screws");
  });

  it("matches longer phrase before shorter one (drywall screws before drywall)", () => {
    const result = linkifyResponse("Pick up drywall screws and drywall at the store.");
    // 'drywall screws' should be linked to its specific URL, not the generic drywall URL
    expect(result).toContain("[drywall screws](https://www.gobuildsupply.com/collections/drywall-screws)");
  });

  it("links each product category only once per response", () => {
    const result = linkifyResponse("Use paint for the walls and paint for the trim.");
    const count = (result.match(/\[paint\]/g) || []).length;
    expect(count).toBe(1);
  });

  it("does not modify text with no known keywords", () => {
    const text = "Make sure you wear your hard hat on site.";
    expect(linkifyResponse(text)).toBe(text);
  });

  it("links 'joint compound' to the correct URL", () => {
    const result = linkifyResponse("Apply joint compound over the seams.");
    expect(result).toContain("https://www.gobuildsupply.com/collections/joint-compound");
  });

  it("links 'insulation' to the insulation collection", () => {
    const result = linkifyResponse("You'll need fiberglass insulation for the attic.");
    expect(result).toContain("https://www.gobuildsupply.com/collections/fiberglass-insulation");
  });

  it("links 'semi-gloss paint' to the paint collection", () => {
    const result = linkifyResponse("Use semi-gloss paint on your deck.");
    expect(result).toContain("https://www.gobuildsupply.com/collections/paint");
  });

  it("links 'framing lumber' to the framing lumber collection", () => {
    const result = linkifyResponse("You need framing lumber for the walls.");
    expect(result).toContain("https://www.gobuildsupply.com/collections/framing-lumber");
  });

  it("does not double-link already-linked text (idempotent on second pass)", () => {
    const once = linkifyResponse("Use drywall screws for this.");
    const twice = linkifyResponse(once);
    // The second pass should not nest links
    expect(twice).not.toContain("[[");
  });
});
