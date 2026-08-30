# Package Content Pipeline — filling the 2,500-word guides

`scripts/generatePackages.mjs` produces ~130 packages under
`data/packages/generated/<region>/<slug>-<tier>.json`. Each has a full structured
body plus a **`detailed_guide` skeleton**: the correct section headings, one seed
sentence per section, and `"content_status": "skeleton"`.

The RAG engine already indexes skeletons. This doc is how cheap AI agents turn
each skeleton into a real 2,000–2,500-word guide.

## What the agent does, per file

1. Read the JSON file. It is an array with one package object.
2. Take `detailed_guide` (the skeleton) and the structured fields (`itinerary`,
   `hotel_name`, `price_inr`, `best_months`, `activities`, `nearby_attractions`,
   `shopping_places`, `food` cues in `description`/`travel_tips`).
3. Rewrite `detailed_guide` so that **every `##` heading is kept in the same
   order**, each section is expanded to the word count named in its seed
   sentence, and the whole guide totals **2,000–2,500 words**. No invented
   prices, phone numbers, or safety claims — keep it general where unsure.
4. Set `"content_status": "complete"` and `"word_count": <actual count>`.
5. Write the file back (same path, `JSON.stringify(arr, null, 2)`).

Do **not** change `package_id`, `price_inr`, `budget_tier`, `itinerary`, or any
other structured field. Only `detailed_guide`, `content_status`, `word_count`.

## Prompt template

```
You are a travel writer. Expand the SKELETON below into a complete guide.

Rules:
- Keep every "## Heading" exactly, in the same order. Start with the "# Title" line.
- Hit the word count stated in each section's seed sentence; total 2000-2500 words.
- Use ONLY the facts in CONTEXT. Do not invent prices, phone numbers, hotel names,
  operator names, or specific medical/safety guarantees. Generalise when unsure.
- Second person, warm but practical. Indian English. Currency in ₹.
- Output the guide markdown only — no preamble.

CONTEXT:
<paste the JSON object's structured fields>

SKELETON:
<paste detailed_guide>
```

## Batch driver (example)

A driver script can iterate every file where `content_status !== "complete"`,
call your cheap model with the template above, validate
`2000 <= word_count <= 2600` and that all 14 headings are present, then save.
`data/packages/generated/india/goa-premium.json` is a finished reference example.

## After filling

```bash
npm run reindex          # incremental: only re-embeds changed guides
```

or, from the running server, `POST /api/admin/reindex` with the `x-admin-key`
header. Re-running `npm run generate:packages` is safe — it skips any file whose
`content_status` is already `"complete"`.
