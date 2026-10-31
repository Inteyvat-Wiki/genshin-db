const assert = require('node:assert/strict');
const { test, mock } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const design = require('../src/design.json');

test('misc is in all public folder, query and TypeScript registries without replacing existing catalogues', () => {
    const { FoldersEnum, format } = require('../src/folder');
    assert.equal(FoldersEnum.misc, 'misc');
    assert.equal(format('misc'), 'misc');
    for (const key of ['folders', 'standard']) for (const category of ['misc', 'serenitea', 'tcg', 'miliastra', 'tasksubtitles'])
        assert(design[key].includes(category));
    assert.deepEqual(design.indexByCategories.misc, ['type']);
    const index = fs.readFileSync(path.join(__dirname, '../types/index.d.ts'), 'utf8');
    const enums = fs.readFileSync(path.join(__dirname, '../types/enums.d.ts'), 'utf8');
    const type = fs.readFileSync(path.join(__dirname, '../types/folders/misc.d.ts'), 'utf8');
    assert(index.includes('reference path="./folders/misc.d.ts"'));
    assert(index.includes('const misc: QueryFunction<MiscRecord>'));
    assert(enums.includes('misc           = "misc"'));
    assert(type.includes('export interface MiscRecord'));
    assert(!/\b(?:talks|entry_talks|layout|reward|progress|cost|count)\s*[?:]/.test(type));
});

test('public query supports exact source-qualified IDs, language results and type categories in memory', () => {
    const storage = require('../src/getdata');
    const items = {
        'achievement-80001': { id: 'achievement-80001', name: 'Same title', type: 'achievement' },
        'achievement-80002': { id: 'achievement-80002', name: 'Same title', type: 'achievement' },
        'achievement_group-0': { id: 'achievement_group-0', name: 'Wonders of the World', type: 'achievement_group' },
    };
    const index = { ids: Object.fromEntries(Object.keys(items).map(id => [id, id])),
        namemap: Object.fromEntries(Object.entries(items).map(([id, item]) => [id, item.name])),
        names: { 'Same title': 'achievement-80001', 'Wonders of the World': 'achievement_group-0' },
        categories: { achievement: ['achievement-80001', 'achievement-80002'], achievementgroup: ['achievement_group-0'] },
        properties: { type: ['achievement', 'achievement_group'] } };
    mock.method(storage, 'getIndex', (language, folder) => folder === 'misc' ? index : undefined);
    mock.method(storage, 'getData', (language, folder, id) => folder === 'misc' && items[id] ? { ...items[id], language } : undefined);
    delete require.cache[require.resolve('../src/main')];
    const db = require('../src/main');
    assert.equal(typeof db.misc, 'function');
    assert.equal(db.misc('achievement-80002', { matchIds: true }).id, 'achievement-80002');
    assert.equal(db.misc('achievement_group-0', { matchIds: true, resultLanguage: 'ChineseSimplified' }).language, 'ChineseSimplified');
    assert.deepEqual(db.misc('achievement', { matchCategories: true, verboseCategories: true }).map(item => item.id), ['achievement-80001', 'achievement-80002']);
    assert.equal(db.searchFolder('misc', 'achievement-80002', { matchIds: true }).id, 'achievement-80002');
    assert.equal(db.misc('Same title').id, 'achievement-80001');
    mock.restoreAll();
});
