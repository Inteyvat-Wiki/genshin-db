# Misc text catalogue

Public API: `genshindb.misc(query, options)` returns the standalone `MiscRecord`
declared in `types/folders/misc.d.ts`. `Folder.misc`, `folders`, `standard` and
the `type` category index are registered. It is not an ArchiveRecord.

```js
genshindb.misc('achievement-80001', { matchIds: true });
genshindb.misc('tutorial-1771', { matchIds: true, resultLanguage: 'ChineseSimplified' });
genshindb.misc('mail_template', { matchCategories: true, verboseCategories: true });
genshindb.misc('names', { matchCategories: true, verboseCategories: true });
```

IDs are source-qualified, never translated filenames. Same-name achievement
stages are separate records; use `matchIds` to retrieve a particular stage.
The `show` flag is retained for consumers, so hidden/test records remain
available to explicit queries and catalogue enumeration. A tutorial with no
source title remains visible when it has body text or images, with `name: ''`
and missing-name diagnostics. Any fallback UI label belongs to the consumer,
not to the original source name.

Images contain resource names or exact uint64 strings, not URLs. Tutorial
sections and detail images carry platform kinds `PC`, `Mobile`, `PS`. Missing
prose remains empty with diagnostics; no translated fallback is synthesized.
Source table IDs, text hashes, asset references and foreign keys are retained.
Relations identify sources and may be unresolved by a page consumer. In
particular `outfit` is an AvatarCostume.skinId identity, not a fabricated page.
`mail_template` means client system templates, not character/birthday mail
history. No reward/cost/progress fields or dialogue/layout fields are exposed.

Extraction is owned by GenshinData-scripts (`misc.js` / normal `main.js`) and
uses its ordinary TextMap version tracking. Export and index generation must
be run separately before new source data can be queried. Registration alone
does not imply that exported data or indices already exist.

`npm run test:misc` exercises registration and the actual public query path
using an in-memory index/storage fixture; it never builds production indices.
