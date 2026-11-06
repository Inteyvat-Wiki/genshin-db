const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { digest, publish, putJSON } = require('@inteyvat-wiki/genshin-data-scripts/cache/storage');
const db = require('../src/main');

test('map records keep namespaces and language queries while indexes contain no record bodies', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'genshin-map-query-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const upstream = path.join(root, 'upstream'), indexes = path.join(root, 'indexes'), files = {};
    for (const language of ['English', 'ChineseSimplified']) {
        for (const kind of ['floor', 'layer']) {
            const id = `${kind}-3460401`;
            const record = { schema: 1, id, kind, name: language === 'English' ? 'Same place' : '同一地点', description: '',
                texts: [], relations: [{ role: 'scene', category: 'maps', id: 'scene-3' }],
                data: { sourceId: 3460401, untouched: 'map-body-only' },
                source: { file: 'fixture.json', id: '3460401', hashes: [], fields: [] }, diagnostics: [] };
            files[`${language}/maps/${id}.json`] = { id, hash: putJSON(upstream, record) };
        }
        const unnamed = { schema: 1, id: 'scene-3', kind: 'scene', name: '', description: '', texts: [], relations: [],
            data: { scene_id: 3 }, source: { file: 'fixture.json', id: '3', hashes: [], fields: [] }, diagnostics: [] };
        files[`${language}/maps/scene-3.json`] = { id: unnamed.id, hash: putJSON(upstream, unnamed) };
    }
    const snapshot = publish(upstream, files, { key: digest('maps-test'), folders: ['maps'] });
    const client = db.createClient(snapshot, { cacheRoot: indexes });
    assert.equal(client.maps('floor-3460401', { matchIds: true }).kind, 'floor');
    assert.equal(client.maps('layer-3460401', { matchIds: true, resultLanguage: 'ChineseSimplified' }).name, '同一地点');
    assert.deepEqual(client.maps('floor', { matchCategories: true, verboseCategories: true }).map(row => row.id), ['floor-3460401']);
    assert.equal(client.getRecord('maps', 'layer-3460401', { language: 'English' }).data.untouched, 'map-body-only');
    assert.deepEqual(client.maps('names', { matchCategories: true, verboseCategories: true }).map(row => row.id),
        ['floor-3460401', 'layer-3460401', 'scene-3']);
    assert.equal(client.maps('scene-3', { matchIds: true }).name, '');
    assert.equal(client.maps('3460401', { matchIds: true, matchNames: false, matchCategories: false, matchAltNames: false, matchAliases: false, matchPartial: false }), undefined);
    const stored = fs.readdirSync(indexes, { recursive: true }).filter(file => file.endsWith('.json'));
    assert(stored.length > 0);
    for (const file of stored) assert(!fs.readFileSync(path.join(indexes, file), 'utf8').includes('map-body-only'));
});

test('map catalogue is registered independently of the compatible maplayers API', () => {
    const design = require('../src/design.json'), { FoldersEnum, format } = require('../src/folder');
    assert.equal(FoldersEnum.maps, 'maps');
    assert.equal(format('maps'), 'maps');
    assert.equal(typeof db.maps, 'function');
    assert.equal(typeof db.maplayers, 'function');
    for (const key of ['folders', 'standard']) assert(design[key].includes('maps') && design[key].includes('maplayers'));
    assert.deepEqual(design.indexByCategories.maps, ['kind']);
});
