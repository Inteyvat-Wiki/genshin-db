const fs = require('fs');
const path = require('path');

const from = process.argv[2] || process.env.GENSHIN_DB_LEGACY_IMPORT;
const to = process.argv[3];
if (!from || !to) throw new Error('Legacy import requires explicit SOURCE and DESTINATION directories. For npm consumers use db.prepare() or db.openSnapshot() instead.');

function copyImportData() {
	if (fs.existsSync(path.resolve(to))) throw new Error('Legacy import destination must be new');
	fs.cpSync(path.resolve(from), path.resolve(to), { force: false, errorOnExist: true, recursive: true });
}

copyImportData();
