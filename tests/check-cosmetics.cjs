// Opt-in source integration check. No history, no image extraction, no persistent cache.
// node tests/check-cosmetics.cjs <committed GenshinData root>
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const upstream = require('genshindata-scripts');
const db = require('../src/main');

async function main() {
	if (!process.argv[2]) throw new Error('Pass a committed GenshinData source root');
	const sourceRoot = path.resolve(process.argv[2]);
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'genshin-cosmetics-source-'));
	try {
		const folders = ['outfits', 'windgliders', 'weaponskins'];
		const snapshot = await upstream.prepare({ sourceRoot, cacheRoot: path.join(root, 'upstream'), folders,
			languages: ['CHS', 'EN'], versions: false, log: console.log });
		assert.equal(snapshot.verify(), true);
		const client = db.createClient(snapshot, { cacheRoot: path.join(root, 'indexes') });
		const excel = name => JSON.parse(fs.readFileSync(path.join(sourceRoot, `ExcelBinOutput/${name}.json`), 'utf8'));
		const counts = { outfits: excel('AvatarCostumeExcelConfigData').length,
			windgliders: excel('AvatarFlycloakExcelConfigData').length, weaponskins: excel('AvatarWeaponSkinExcelConfigData').length };
		for (const resultLanguage of ['ChineseSimplified', 'English']) {
			for (const folder of folders) {
				const records = client[folder]('names', { matchCategories: true, verboseCategories: true, resultLanguage });
				assert.equal(records.length, counts[folder]);
				assert.equal(new Set(records.map(row => row.id)).size, records.length);
				for (const row of records) {
					assert(Number.isSafeInteger(row.id) && row.id > 0);
					assert.equal(typeof row.descriptionRaw, 'string');
					assert.equal(client[folder](String(row.id), { matchIds: true, resultLanguage }).id, row.id);
					if (row.name) assert.equal(client[folder](row.name, { queryLanguages: [resultLanguage], resultLanguage }).name, row.name);
					assert(row.images.filename_icon);
					assert(!Object.values(row.images).some(value => typeof value === 'string' && /[{}]/.test(value)));
					if (folder !== 'weaponskins') assert.equal(typeof row.story, 'string');
				}
				console.log(JSON.stringify({ language: resultLanguage, folder, count: records.length,
					defaults: records.filter(row => row.isDefault).length, stories: records.filter(row => row.story).length,
					missingNames: records.filter(row => !row.name).map(row => row.id),
					emptyDescriptions: records.filter(row => !row.descriptionRaw).map(row => row.id) }));
			}
		}
		assert(!fs.existsSync(path.join(root, 'upstream', 'history')));
		console.log('Cosmetics source → cache → db queries verified; temporary outputs will be removed.');
	} finally {
		// This is the unique temporary directory created by this invocation only.
		fs.rmSync(root, { recursive: true, force: true });
	}
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
