# Research catalogues and task subtitles

Data is extracted by GenshinData-scripts, written to genshin-db, indexed here and
then queried by wiki-data. No Wiki extraction fallback is required or supported.

```js
const db = require('genshin-db');
const options = {
    resultLanguage: 'ChineseSimplified',
    queryLanguages: ['ChineseSimplified'],
    matchIds: true,
    matchNames: false,
    matchAltNames: false,
};
db.serenitea('companion-9002', options);
db.tcg('card-1101', options);
db.miliastra('suit-265348', options);
db.tasksubtitles('2017', options);
db.serenitea('names', { ...options, matchCategories: true, verboseCategories: true });
```

The first three datasets use qualified source IDs so duplicate or empty localized
names remain addressable. Images are resource references, not Wiki URLs. External
relations retain original source IDs. Task source dialogue remains in
`source_dialogue`; consumers apply their own condition/flow presentation.
`tasksubtitles` keeps original subquest IDs rather than a Wiki page's step indices.
Type declarations are in `types/folders/archives.d.ts` and `tasksubtitles.d.ts`.

Serenitea furnishings and sets also retain `classifications` as an array of
`{ id, group_id, group_name, name }`: the original furniture type/category IDs
(strings) and the two localized names. Empty arrays mean no source classification;
multiple paths and same-name groups with distinct source IDs are not merged.

After extraction, run:

```text
npm run makeIndex -- --folders serenitea tcg miliastra tasksubtitles --languages ChineseSimplified English
```

These folders participate in the ordinary standard-folder index/combine workflow.
The existing `--folders tcg` group also includes the narrative `tcg` catalogue in
addition to its older gameplay-card folders. Runtime queries work with file data
and with bundles assembled through the normal combineData workflow.
