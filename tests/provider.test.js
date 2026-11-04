const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { digest, publish, putJSON } = require('genshindata-scripts/cache/storage');
const db = require('../src/main');

function fixture(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'genshin-db-provider-test-'));
    t.after(() => { db.useProvider(); fs.rmSync(root, { recursive: true, force: true }); });
    return root;
}
function make(root, suffix = '') {
    const files = {};
    const add = (key, value) => { files[key] = { hash: putJSON(root, value) }; if (value.id !== undefined) files[key].id = value.id; };
    for (const language of ['English', 'ChineseSimplified']) for (const id of ['one', 'two'])
        add(`${language}/misc/${id}.json`, { id, name: language === 'English' ? 'Same title' + suffix : '相同标题' + suffix, type: 'tutorial', description: 'body must stay upstream' });
    add('version/misc.json', { one: '3.0', two: '3.1' });
    return publish(root, files, { key: digest('plan' + suffix), folders: ['misc'] });
}
test('existing queries read provider records, retain duplicate-name matches and store indexes only', t => {
    const root = fixture(t), upstream = path.join(root, 'upstream'), indexes = path.join(root, 'indexes');
    const snapshot = make(upstream);
    db.useProvider(snapshot, { cacheRoot: indexes });
    assert.equal(db.misc('two', { matchIds: true }).id, 'two');
    assert.equal(db.misc('two', { matchIds: true }).version, '3.1');
    assert.equal(db.misc('one', { matchIds: true, resultLanguage: 'ChineseSimplified' }).name, '相同标题');
    assert.equal(db.misc('Same title').id, 'one');
    assert.deepEqual(db.misc('tutorial', { matchCategories: true, verboseCategories: true }).map(value => value.id), ['one', 'two']);
    assert.deepEqual(require('../src/provider').getIndex('English', 'misc').nameMatches['Same title'], ['one', 'two']);
    const saved = fs.readdirSync(indexes, { recursive: true }).filter(file => file.endsWith('.json'));
    assert(saved.length > 0);
    for (const file of saved) assert(!fs.readFileSync(path.join(indexes, file), 'utf8').includes('body must stay upstream'));
});

test('duplicate names and aliases retain legacy code-unit ordering despite locale-sorted manifests', t => {
    const root = fixture(t), upstream = path.join(root, 'upstream');
    const files = {};
    for (const key of ['afterword', 'afterword-01']) files[`English/misc/${key}.json`] = {
        hash: putJSON(upstream, { id: key, name: 'Afterword', alias: 'same', type: 'tutorial' }), id: key,
    };
    const snapshot = publish(upstream, files, { key: digest('duplicate-order') });
    assert.deepEqual(snapshot.keys('English', 'misc'), ['afterword-01', 'afterword']);
    const client = db.createClient(snapshot, { cacheRoot: path.join(root, 'indexes') });
    assert.equal(client.misc('Afterword').id, 'afterword');
    assert.equal(client.misc('same', { matchAliases: true }).id, 'afterword-01');
    assert.deepEqual(client.misc('tutorial', { matchCategories: true, verboseCategories: true }).map(row => row.id), ['afterword', 'afterword-01']);
});
test('switching snapshots never reuses stale indexes or records, and corrupted source records are not hidden', t => {
    const root = fixture(t), upstream = path.join(root, 'upstream'), indexes = path.join(root, 'indexes');
    const first = make(upstream);
    db.useProvider(first, { cacheRoot: indexes });
    assert.equal(db.misc('one', { matchIds: true }).name, 'Same title');
    const second = make(upstream, ' new');
    db.useProvider(second, { cacheRoot: indexes });
    assert.equal(db.misc('one', { matchIds: true }).name, 'Same title new');
    const hash = second.manifest().files['English/misc/one.json'].hash;
    fs.writeFileSync(path.join(upstream, 'objects', hash.slice(0, 2), hash + '.json'), '{}');
    assert.throws(() => db.misc('one', { matchIds: true }), /Corrupt/);
    assert.equal(first.getRecord('English', 'misc', 'one').name, 'Same title');
});
test('damaged disk indexes are rebuilt from the same pinned snapshot', t => {
    const root = fixture(t), snapshot = make(path.join(root, 'upstream')), indexes = path.join(root, 'indexes');
    db.useProvider(snapshot, { cacheRoot: indexes }); db.misc('one', { matchIds: true });
    for (const file of fs.readdirSync(indexes, { recursive: true }).filter(file => file.endsWith('.json'))) fs.writeFileSync(path.join(indexes, file), '{}');
    db.useProvider(snapshot, { cacheRoot: indexes });
    assert.equal(db.misc('two', { matchIds: true }).id, 'two');
});

test('character stat methods use snapshot-owned stats and curves, not legacy files', t => {
    const root = fixture(t), upstream = path.join(root, 'upstream');
    const values = {
        'English/characters/hu_tao.json': { id: 10000046, name: 'Hu Tao' },
        'stats/characters.json': { hu_tao: { base: { hp: 100, attack: 8, defense: 10, critdmg: 0.5 }, curve: { hp: 'hp', attack: 'attack', defense: 'defense' },
            specialized: 'FIGHT_PROP_CRITICAL_HURT', promotion: [{ maxlevel: 100, hp: 1, attack: 5, defense: 2, specialized: 0 }] } },
        'curve/characters.json': { 100: { hp: 10, attack: 10, defense: 10 } },
    };
    const files = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { hash: putJSON(upstream, value), ...(value.id === undefined ? {} : { id: value.id }) }]));
    db.useProvider(publish(upstream, files, { key: digest('stats') }), { cacheRoot: path.join(root, 'indexes') });
    const stats = db.characters('Hu Tao').stats('100');
    assert.equal(stats.attack, 85);
    assert(Number.isFinite(stats.hp));
});

test('snapshot clients isolate defaults, aliases and data across asynchronous callers and global switches', async t => {
    const root = fixture(t), upstream = path.join(root, 'upstream'), indexes = path.join(root, 'indexes');
    const first = make(upstream), second = make(upstream, ' second');
    const a = db.createClient(first, { cacheRoot: indexes }), b = db.createClient(second, { cacheRoot: indexes });
    a.setOptions({ resultLanguage: 'ChineseSimplified' });
    assert.equal(b.getOptions().resultLanguage, 'English');
    assert.equal(a.addAltName('English', 'misc', 'private-a', 'Same title'), true);
    assert.equal(b.misc('private-a', { matchNames: false, matchAltNames: true }), undefined);
    assert.equal(a.misc('private-a', { matchNames: false, matchAltNames: true }).id, 'one');
    db.useProvider(second, { cacheRoot: indexes });
    const [fromA, fromB] = await Promise.all([
        Promise.resolve().then(() => a.misc('one', { matchIds: true })),
        Promise.resolve().then(() => b.misc('one', { matchIds: true })),
    ]);
    assert.equal(fromA.name, '相同标题');
    assert.equal(fromB.name, 'Same title second');
    assert.equal(db.misc('one', { matchIds: true }).name, 'Same title second');
    assert.equal(a.snapshotId, first.snapshotId);
    assert.equal(a.addData, undefined);
    assert.equal(a.useProvider, undefined);
    assert.equal(a.characters('Hu Tao'), undefined); // No fallback to legacy game records.
});

test('batch index preparation uses the provider catalogue and does not switch default queries', t => {
    const root = fixture(t), first = make(path.join(root, 'one')), second = make(path.join(root, 'two'), ' next');
    db.useProvider(first, { cacheRoot: path.join(root, 'indexes') });
    const result = db.buildIndexes(second, { cacheRoot: path.join(root, 'indexes'), languages: ['English'] });
    assert.deepEqual(result.indexes, [{ language: 'English', folder: 'misc', count: 2 }]);
    assert.equal(db.misc('one', { matchIds: true }).name, 'Same title');
    assert.throws(() => db.buildIndexes(second, { folders: ['weapons'] }), /No indexes match/);
});

test('index CLI accepts comma-separated selections and writes only an external snapshot index', t => {
    const root = fixture(t), upstream = path.join(root, 'upstream'), snapshot = make(upstream);
    const output = require('node:child_process').execFileSync(process.execPath, [path.join(__dirname, '../scripts/generate/makeIndex.js'),
        '--cache', upstream, '--snapshot', snapshot.snapshotId, '--index-cache', path.join(root, 'indexes'), '--folders', 'misc,tcg', '--languages', 'English'], { encoding: 'utf8' });
    const summary = JSON.parse(output.slice(output.indexOf('{')));
    assert.equal(summary.snapshotId, snapshot.snapshotId);
    assert.deepEqual(summary.indexes, [{ language: 'English', folder: 'misc', count: 2 }]);
    assert(!output.includes('body must stay upstream'));
    assert(fs.readdirSync(path.join(root, 'indexes'), { recursive: true }).some(file => file.endsWith('English/misc.json') || file.endsWith('English\\misc.json')));
});

test('independent alias stores do not load records and preserve capacity on updates or missing deletions', () => {
    const { createStore } = require('../src/altnames');
    let reads = 0;
    const names = createStore(() => { reads++; return { namemap: { a: 'A', b: 'B' } }; });
    assert.equal(reads, 0);
    names.setLimit({ maxCount: 14 }); // Thirteen built-in references plus one custom name.
    assert.equal(names.addAltName('English', 'misc', 'custom', 'a'), true);
    assert.equal(names.addAltName('English', 'misc', 'custom', 'b'), true);
    assert.equal(names.addAltName('English', 'misc', 'other', 'a'), false);
    names.removeAltNames('English', 'misc', 'missing');
    assert.equal(names.addAltName('English', 'misc', 'other', 'a'), false);
    names.removeAltNames('English', 'misc', 'custom');
    assert.equal(names.addAltName('English', 'misc', 'other', 'a'), true);
    assert.equal(names.getFilename('English', 'misc', 'constructor'), undefined);
    assert.equal(names.addAltName('__proto__', 'misc', 'bad', 'a'), false);
});

test('importing genshin-db does not read game records or merged bundles to seed aliases', () => {
    const entry = require.resolve('../src/main');
    const script = `const fs=require('fs'); const original=fs.readFileSync; fs.readFileSync=function(file,...args){
        const p=String(file).replaceAll('\\\\','/');
        if(p.includes('/src/data/')||p.includes('/src/min/')) throw Error('Eager game data read: '+p);
        return original.call(this,file,...args);
    }; const db=require(${JSON.stringify(entry)}); if(typeof db.createClient!=='function')throw Error('Missing client');`;
    require('node:child_process').execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' });
});

test('public exact interaction and giving APIs replace private filesystem access', t => {
    const root = fixture(t), upstream = path.join(root, 'upstream');
    const files = {
        'interactions/Quest/a.json': { hash: putJSON(upstream, { _type: 'DIALOG', dialog: 42 }) },
        'interactions.json': { hash: putJSON(upstream, { givings: { 11: { items: [{ id: 12, count: 2 }], remove: false } } }) },
    };
    const client = db.createClient(publish(upstream, files, { key: digest('interactions') }), { cacheRoot: path.join(root, 'indexes') });
    assert.deepEqual(client.getRecord('interactions', 'Quest\\a.json'), { _type: 'DIALOG', dialog: 42 });
    assert.deepEqual(client.interactionGiving(11), { items: [{ id: 12, count: 2 }], remove: false });
    assert.equal(client.getRecord('interactions', 'Quest/missing'), undefined);
    assert.throws(() => client.getRecord('interactions', '../outside'), /Invalid cache key/);
    assert.throws(() => client.interactionGiving(-1), /positive giving ID/);
});
