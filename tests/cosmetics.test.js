const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { digest, publish, putJSON } = require('@inteyvat-wiki/genshin-data-scripts/cache/storage');
const db = require('../src/main');

test('cosmetics queries preserve raw text, stories, duplicate IDs and separate image storage', t => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'genshin-cosmetics-query-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const upstream = path.join(root, 'upstream'), files = {};
	for (const language of ['English', 'ChineseSimplified']) {
		const rows = {
			outfits: [{ id: 200300, name: 'Wind and Snow', description: 'Default outfit', descriptionRaw: '<i>Default outfit</i>', story: '', isDefault: true, characterId: 10000003, characterName: 'Jean' }],
			windgliders: [{ id: 140001, name: 'Wings', description: 'Glider', descriptionRaw: '<i>Glider</i>', story: 'Actual readable story', source: [], rarity: 4 }],
			weaponskins: [390002, 390003].map(id => ({ id, itemId: id + 1, name: language === 'English' ? 'Exaiphanes Blade' : '星锋剑', description: `Skin ${id}`, descriptionRaw: `<i>Skin ${id}</i>`, weaponType: 'WEAPON_SWORD_ONE_HAND', rarity: 4, source: [], groups: [{ id: 1001, name: 'Game group' }] })),
		};
		for (const [folder, records] of Object.entries(rows)) for (const record of records) {
			files[`${language}/${folder}/${record.id}.json`] = { id: record.id, hash: putJSON(upstream, record) };
			files[`image/${folder}.json`] = { hash: putJSON(upstream, Object.fromEntries(records.map(row => [row.id, { filename_icon: `UI_Test_${row.id}` }]))) };
		}
	}
	const snapshot = publish(upstream, files, { key: digest('cosmetics-test'), folders: ['outfits', 'windgliders', 'weaponskins'] });
	const client = db.createClient(snapshot, { cacheRoot: path.join(root, 'indexes') });
	const outfit = client.outfits('200300', { matchIds: true });
	assert.equal(outfit.isDefault, true);
	assert.equal(outfit.descriptionRaw, '<i>Default outfit</i>');
	assert.equal(outfit.story, '');
	assert.equal(outfit.images.filename_icon, 'UI_Test_200300');
	assert.equal(client.windgliders('Wings').story, 'Actual readable story');
	assert.equal(client.weaponskins('390002', { matchIds: true }).id, 390002);
	assert.equal(client.weaponskin('390003', { matchIds: true }).id, 390003);
	assert.equal(client.weaponskins('Exaiphanes Blade').name, 'Exaiphanes Blade');
	assert.equal(client.weaponskins('星锋剑', { queryLanguages: ['ChineseSimplified'], resultLanguage: 'ChineseSimplified' }).name, '星锋剑');
	assert.equal(client.weaponskins('390003', { matchIds: true, resultLanguage: 'ChineseSimplified' }).images.filename_icon, 'UI_Test_390003');
	assert.deepEqual(client.weaponskins('names', { matchCategories: true, verboseCategories: true }).map(row => row.id), [390002, 390003]);
	assert.equal(client.weaponskins('WEAPON_SWORD_ONE_HAND', { matchCategories: true, verboseCategories: true }).length, 2);
	assert.equal(client.weaponskins('Game group', { matchCategories: true, verboseCategories: true }).length, 2);
	assert.equal(client.getRecord('weaponskins', '390003', { language: 'English' }).descriptionRaw, '<i>Skin 390003</i>');
	const indexes = require('../src/provider').buildIndex(snapshot, 'English', 'weaponskins');
	assert.deepEqual(indexes.nameMatches[require('../src/helper').normalizeSearchText('Exaiphanes Blade')], ['390002', '390003']);
});

test('weapon appearances are registered as a public folder independently of weapons', () => {
	const design = require('../src/design.json'), { FoldersEnum, format } = require('../src/folder');
	assert.equal(FoldersEnum.weaponskins, 'weaponskins');
	assert.equal(format('weaponskins'), 'weaponskins');
	assert.equal(typeof db.weaponskins, 'function');
	assert.equal(typeof db.weapons, 'function');
	for (const key of ['folders', 'standard', 'hasImage']) assert(design[key].includes('weaponskins'));
	assert.deepEqual(design.indexByCategories.weaponskins, ['weaponType', 'groups[].name']);
});
