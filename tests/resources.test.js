const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('scoped db entry and resource subpath forward the stable upstream API', () => {
    const db = require('@inteyvat-wiki/genshin-db');
    const resources = require('@inteyvat-wiki/genshin-data-scripts/resources');
    assert.equal(db.resources, resources);
    assert.equal(require('@inteyvat-wiki/genshin-db/resources'), resources);
    assert(resources.supportedKinds.includes('worldAreas'));
    assert(resources.supportedKinds.includes('levelTags'));
    assert.throws(() => db.resources.prepare('guess-all-blocks', {}), /Unsupported resource kind/);
    assert.equal(typeof resources.mapAtlas.prepareAtlas, 'function');
    assert.equal(typeof resources.profileFrames.prepare, 'function');
});

test('package manifests have exact scoped dependencies and keep publishing disabled', () => {
    const db = require('../package.json');
    const data = require('@inteyvat-wiki/genshin-data-scripts/package.json');
    assert.equal(db.name, '@inteyvat-wiki/genshin-db');
    assert.equal(data.name, '@inteyvat-wiki/genshin-data-scripts');
    for (const pkg of [db, data]) {
        assert.equal(pkg.version, '0.1.0');
        assert.equal(pkg.private, true);
        assert(pkg.scripts.prepublishOnly);
        assert(Object.values(pkg.dependencies).every(version => !version.startsWith('file:')));
    }
    assert.equal(db.dependencies[data.name], '0.1.0');
    assert.equal(data.dependencies['@inteyvat-wiki/resource-tools'], '0.1.0');
    assert(!fs.existsSync(path.join(__dirname, '../src/resources/config.json')));
});
