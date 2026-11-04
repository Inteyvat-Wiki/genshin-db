const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const design = require('./design.json');
const { normalizeSearchText } = require('./helper');
const { localeMap } = require('./language');
const { AsyncLocalStorage } = require('node:async_hooks');

let active;
const contexts = new AsyncLocalStorage();
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const RULES = digest(fs.readFileSync(__filename) + JSON.stringify(design) + fs.readFileSync(require.resolve('./helper')) + JSON.stringify(localeMap));
function defaultCache() {
    const base = process.platform === 'win32' ? (process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'))
        : process.platform === 'darwin' ? path.join(os.homedir(), 'Library/Caches') : (process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'));
    return path.join(base, 'Inteyvat-Wiki', 'genshin-db');
}
function createContext(snapshot, options = {}) {
    if (!/^[a-f0-9]{64}$/.test(snapshot.snapshotId || '') || typeof snapshot.getRecord !== 'function' || typeof snapshot.keys !== 'function' || typeof snapshot.entries !== 'function' || typeof snapshot.getAuxiliary !== 'function')
        throw new Error('Expected a prepared GenshinData-scripts snapshot');
    return { snapshot, root: path.resolve(options.cacheRoot || process.env.GENSHIN_DB_CACHE || defaultCache()), indexes: new Map() };
}
function useProvider(snapshot, options = {}) {
    active = snapshot === undefined ? undefined : createContext(snapshot, options);
}
function nested(data, prop) {
    return prop.split('.').reduce((value, key) => value?.[key], data);
}
function categoryValues(data, prop, language) {
    let values;
    if (prop.includes('[].')) {
        const [array, child] = prop.split('[].');
        values = nested(data, array)?.map(item => nested(item, child));
    } else values = nested(data, prop);
    if (values === undefined || values === '') return [];
    if (prop === 'costs') values = Object.values(values).flat();
    if (prop === 'altrecipes') values = values.flat();
    if (!Array.isArray(values)) values = [values];
    return values.filter(value => value !== undefined && value !== null).map(value => {
        if (['ingredients', 'recipe', 'altrecipes'].includes(prop)) return value.name;
        if (prop === 'birthday' && data.birthdaymmdd) {
            const [month, day] = data.birthdaymmdd.split('/');
            return new Date(Date.UTC(2000, month - 1, day)).toLocaleString(localeMap[language], { timeZone: 'UTC', month: 'long' });
        }
        return value;
    }).filter(value => value !== undefined);
}
function interactionIds(data, result = []) {
    if (!data || typeof data !== 'object') return result;
    if (data._type === 'DIALOG') {
        const values = Object.entries(data).filter(([key, value]) => !key.startsWith('_') && !key.startsWith('$') && Number.isInteger(value) && value > 0).map(([, value]) => value);
        if (values.length === 1) result.push(values[0]);
    }
    for (const child of Object.values(data)) interactionIds(child, result);
    return result;
}
function buildIndex(snapshot, language, folder) {
    const index = { namemap: {}, ids: {}, names: {}, aliases: {}, categories: {}, properties: {}, nameMatches: {}, idMatches: {} };
    function addMatch(table, key, filename) {
        if (!Object.hasOwn(table, key)) Object.defineProperty(table, key, { value: [], enumerable: true, writable: true, configurable: true });
        if (!table[key].includes(filename)) table[key].push(filename);
    }
    function put(table, key, value) { Object.defineProperty(table, key, { value, enumerable: true, writable: true, configurable: true }); }
    // Match the legacy indexer's code-unit filename order, not manifest locale order.
    // Only keys are retained; full records are still consumed one at a time.
    for (const filename of snapshot.keys(language, folder).sort()) {
        const data = snapshot.getRecord(language, folder, filename);
        const name = folder === 'interactions' ? filename : (data.name || '');
        put(index.namemap, filename, name);
        const ids = folder === 'interactions' ? interactionIds(data) : data.id === undefined ? [] : [data.id];
        for (const id of ids) {
            addMatch(index.idMatches, String(id), filename);
            if (!Object.hasOwn(index.ids, id)) put(index.ids, id, filename);
        }
        if (name) {
            const key = normalizeSearchText(name);
            if (key) {
                addMatch(index.nameMatches, key, filename);
                if (!Object.hasOwn(index.names, key)) put(index.names, key, filename);
            }
        }
        for (const prop of new Set([...(design.aliases[folder] || []), 'alias', 'dupealias'])) {
            const raw = nested(data, prop), values = Array.isArray(raw) ? raw : [raw];
            for (const value of values) if (value !== undefined && value !== '') {
                const key = normalizeSearchText(String(value));
                if (key) put(index.aliases, key, filename);
            }
        }
        for (const prop of design.indexByCategories[folder] || []) {
            for (const value of categoryValues(data, prop, language)) {
                const key = normalizeSearchText(String(value));
                if (!key) continue;
                addMatch(index.categories, key, filename);
                addMatch(index.properties, prop, value);
            }
        }
    }
    return index;
}
function getIndex(language, folder) {
    const state = contexts.getStore() || active;
    if (!state) return undefined;
    if (!/^[A-Za-z]+$/.test(language) || !/^[a-z]+$/.test(folder)) throw new Error('Invalid index language or folder');
    const key = `${folder === 'interactions' ? 'Shared' : language}/${folder}`;
    if (state.indexes.has(key)) return state.indexes.get(key);
    const file = path.join(state.root, 'indexes', state.snapshot.snapshotId, RULES, `${key}.json`);
    let index;
    if (fs.existsSync(file)) {
        try {
            const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (saved.snapshotId === state.snapshot.snapshotId && saved.rules === RULES && saved.schema === 1 && digest(JSON.stringify(saved.index)) === saved.digest) index = saved.index;
        } catch { /* A reproducible index can be rebuilt; record corruption is never suppressed. */ }
    }
    if (!index) {
        index = buildIndex(state.snapshot, language, folder);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const temporary = `${file}.${crypto.randomUUID()}.tmp`;
        fs.writeFileSync(temporary, JSON.stringify({ schema: 1, snapshotId: state.snapshot.snapshotId, rules: RULES, digest: digest(JSON.stringify(index)), index }), { flag: 'wx' });
        try { fs.renameSync(temporary, file); }
        finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
    }
    state.indexes.set(key, index);
    return index;
}
function buildIndexes(snapshot, options = {}) {
    if (typeof snapshot.catalog !== 'function') throw new Error('Snapshot does not provide a catalogue');
    const state = createContext(snapshot, options);
    const catalog = snapshot.catalog().filter(item => (!options.folders || options.folders.includes(item.folder))
        && (item.language === 'Shared' || !options.languages || options.languages.includes(item.language)));
    if (!catalog.length) throw new Error('No indexes match the snapshot selection');
    contexts.run(state, () => { for (const { language, folder } of catalog) getIndex(language, folder); });
    return { snapshotId: snapshot.snapshotId, indexes: catalog };
}
module.exports = { useProvider, getIndex, getSnapshot: () => (contexts.getStore() || active)?.snapshot,
    createContext, withContext: (context, callback) => contexts.run(context, callback), buildIndex, buildIndexes };
