import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";

const grammarPath = path.resolve(
  import.meta.dirname,
  "../../data/grammars/search-command.gbnf",
);

const systemPrompt = `Extract a place search command from the user's message.
Respond only with JSON matching this schema:
{ "place_type": string, "locations": string[] }

Examples:
"find bars between the airport and downtown"
-> {"place_type": "bar", "locations": ["the airport", "downtown"]}

"any restaurants near Maple St and the office"
-> {"place_type": "restaurant", "locations": ["Maple St", "the office"]}

"coffee shops between my place, hers, and the train station"
-> {"place_type": "coffee shop", "locations": ["my place", "hers", "the train station"]}`;

async function extractCommand(transcript) {
  const grammar = await readFile(grammarPath, "utf8");

  const response = await fetch(process.env.LLM_API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
      grammar,
      temperature: 0.1,
    }),
  });

  const body = await response.json();
  return JSON.parse(body.choices[0].message.content);
}

describe("llama.cpp intent extraction (Docker smoke test)", () => {
  it("extracts a place_type and two locations from a two-location prompt", async () => {
    const command = await extractCommand(
      "find bars between the airport and downtown",
    );

    assert.strictEqual(typeof command.place_type, "string");
    assert.ok(Array.isArray(command.locations));
    assert.strictEqual(command.locations.length, 2);
  });

  it("extracts three locations from a three-location prompt", async () => {
    const command = await extractCommand(
      "find sushi restaurants open now between my apartment, the gym, and Union Square",
    );

    assert.strictEqual(typeof command.place_type, "string");
    assert.ok(Array.isArray(command.locations));
    assert.strictEqual(command.locations.length, 3);
  });
});
