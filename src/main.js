const fuzzysort = require('fuzzysort');
//const design = require('./design.json');
const language = require('./language.js');
const Folder = require('./folder.js').FoldersEnum;
const FolderFormat = require('./folder.js').format;
const altnames = require('./altnames.js');
const Options = require('./Options.js');
const helper = require('./helper.js');
const { getData, getIndex, addData } = require('./getdata.js');

// object that will be exported
const genshin = {};

// Default options
const baseoptions = new Options(
    false, // dumpResult
    true, // matchNames
    false, // matchIds
    true, // matchAltNames
    false, // matchAliases
    false, // matchCategories
    false, // verboseCategories
    ["English"], // queryLanguages
    "English", // resultLanguage
    false, // v4Props
    false // v4PropsOnly
);

// returns an array of strings used for autocomplete aka fuzzy searching
function buildQueryDict(querylangs, folder, opts) {
    let dict = opts.matchCategories ? ['names'] : [];
    for (const lang of querylangs) {
        const index = getIndex(lang, folder);
        if (index === undefined) continue;
        if (opts.matchNames && index.namemap)
            dict = dict.concat(Object.values(index.namemap));
        if (opts.matchAltNames)
            dict = dict.concat(altnames.getAltNamesList(lang, folder));
        if (opts.matchAliases && index.aliases)
            dict = dict.concat(Object.keys(index.aliases));
        if (opts.matchCategories && index.categories)
            dict = dict.concat(Object.keys(index.categories));
    }
    return dict;
}

function autocomplete(input, dict, key) {
	const searchDict = dict.map(item => ({
		item: item,
		value: helper.normalizeSearchText(key ? item[key] : item)
	}));
	const result = fuzzysort.go(helper.normalizeSearchText("" + input), searchDict, { limit: 1, key: 'value' })[0];
	return result === undefined ? undefined : result.obj.item;
}

function getIndexedValue(index, property, value) {
	if (index === undefined || index[property] === undefined) return undefined;
	const indexed = index[property];
	const normalized = helper.normalizeSearchText("" + value);
	if (Object.prototype.hasOwnProperty.call(indexed, normalized)) return indexed[normalized];
	return indexed[value];
}

/**
* Gets rid of unnecessary properties.
* @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/)
* @returns {object} - A well-formatted object that matches the same properties as an Option instance
*/
function sanitizeOptions(opts) {
    //Even if opts property is an instance of Options, the type is still 'object'
    if (!opts || typeof opts !== 'object') return;

    let sanOpts = {};
    ['dumpResult', 'matchNames', 'matchIds', 'matchAltNames', 'matchAliases', 'matchCategories', 'verboseCategories', 'v4Props', 'v4PropsOnly'].forEach(prop => {
        if (typeof opts[prop] === 'boolean') sanOpts[prop] = opts[prop];
    });
    opts.resultLanguage = language.format(opts.resultLanguage);
    if (opts.resultLanguage !== undefined)
        sanOpts.resultLanguage = opts.resultLanguage;
    opts.queryLanguages = language.format(opts.queryLanguages);
    if (opts.queryLanguages !== undefined)
        sanOpts.queryLanguages = Array.isArray(opts.queryLanguages) ? opts.queryLanguages : [opts.queryLanguages];
    return sanOpts;
}

const MatchType = {
    None: "none",
    Ids: "ids",
    Names: "names",
    AltNames: "altnames",
    Aliases: "aliases",
    Categories: "categories"
}

function getIdMatch(query, folders, opts) {
    if (!opts.matchIds) return undefined;
    const queryId = ("" + query).trim();
    if (queryId === "") return undefined;

    const folderList = Array.isArray(folders) ? folders : [folders];
    for (const folder of folderList) {
        for (const lang of opts.queryLanguages) {
            const index = getIndex(lang, folder);
            if (index === undefined || !index.ids) continue;
            if (index.ids[queryId] !== undefined) {
                return { folder, lang, filename: index.ids[queryId] };
            }
        }
    }
    return undefined;
}

// TODO: if folder is undefined, search through every folder
/**
 * @param query {string}
 * @param folders {string|string[]}
 * @param opts {object|Options}
 */
function retrieveData(query, folders, opts, getfilename) {
    opts = Object.assign({}, baseoptions, sanitizeOptions(opts));
    const idMatch = getIdMatch(query, folders, opts);
    if (idMatch) {
        if (getfilename) return idMatch.filename;
        const result = getData(opts.resultLanguage, idMatch.folder, idMatch.filename, opts.v4Props, opts.v4PropsOnly);
        return opts.dumpResult
            ? getDump(query, folders, query, idMatch.folder, MatchType.Ids, opts, idMatch.filename, result)
            : result;
    }

    let queryMatch;
    let folderMatch;
    if (Array.isArray(folders)) {
        const qdict = folders.reduce((accum, f) => {
            return accum.concat(buildQueryDict(opts.queryLanguages, f, opts).map(e => ({ name: e, folder: f })));
        }, []);
        const result = autocomplete("" + query, qdict, 'name');
        if (result) {
            folderMatch = result.folder;
            queryMatch = result.name;
        }
    } else {
        folderMatch = folders;
        queryMatch = autocomplete("" + query, buildQueryDict(opts.queryLanguages, folderMatch, opts));
    }

    if (queryMatch === undefined) { // no result;
        return opts.dumpResult ? getDump(query, folders, undefined, folderMatch, MatchType.None, opts, undefined, undefined) : undefined;
    }

    for (let lang of opts.queryLanguages) {
        let langindex = getIndex(lang, folderMatch);
        if (langindex === undefined) continue;

		if (opts.matchNames && langindex.names) {
			const filename = getIndexedValue(langindex, 'names', queryMatch);
			if (filename !== undefined) {
				if (getfilename) return filename;
				let result = getData(opts.resultLanguage, folderMatch, filename, opts.v4Props, opts.v4PropsOnly);
				return opts.dumpResult ? getDump(query, folders, queryMatch, folderMatch, MatchType.Names, opts, filename, result) : result;
			}
		}

        if (opts.matchAltNames && altnames.getFilename(lang, folderMatch, queryMatch)) {
            const filename = altnames.getFilename(lang, folderMatch, queryMatch);
            if (getfilename) return filename;
            let result = getData(opts.resultLanguage, folderMatch, filename, opts.v4Props, opts.v4PropsOnly);
            return opts.dumpResult ? getDump(query, folders, queryMatch, folderMatch, MatchType.AltNames, opts, filename, result) : result;
        }

		if (opts.matchAliases && langindex.aliases) {
			const filename = getIndexedValue(langindex, 'aliases', queryMatch);
			if (filename !== undefined) {
				if (getfilename) return filename;
				let result = getData(opts.resultLanguage, folderMatch, filename, opts.v4Props, opts.v4PropsOnly);
				return opts.dumpResult ? getDump(query, folders, queryMatch, folderMatch, MatchType.Aliases, opts, filename, result) : result;
			}
		}

		const categoryResult = getIndexedValue(langindex, 'categories', queryMatch);
		if (opts.matchCategories && (helper.normalizeSearchText(queryMatch) === 'names' || categoryResult !== undefined)) {
			let reslangindex = getIndex(opts.resultLanguage, folderMatch);
			if (reslangindex === undefined) return undefined;

			let tmparr = helper.normalizeSearchText(queryMatch) === 'names' ? Object.keys(reslangindex.namemap) : categoryResult;
            let result = tmparr.reduce((accum, filename) => {
                let res = opts.verboseCategories ? getData(opts.resultLanguage, folderMatch, filename, opts.v4Props, opts.v4PropsOnly) : reslangindex.namemap[filename];
                if (res !== undefined) accum.push(res);
                return accum;
            }, []);
            return opts.dumpResult ? getDump(query, folders, queryMatch, folderMatch, MatchType.Categories, opts, tmparr, result) : result;
        }
    }

    return opts.dumpResult ? getDump(query, folders, queryMatch, folderMatch, MatchType.None, opts, undefined, undefined) : undefined;
}

function getDump(query, folders, match, matchfolder, matchtype, options, filename, result) {
    return {
        query: query,
        folder: folders,
        match: match,
        matchfolder: matchfolder,
        matchtype: matchtype,
        options: JSON.parse(JSON.stringify(options)),
        filename: filename !== undefined ? JSON.parse(JSON.stringify(filename)) : filename,
        result: result
    }
}

/**
 * Change default library options
 * @param {object|Options} options - See [default options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts) format
 * @returns {void} Nothing
 */
genshin.setOptions = function (options) {
    Object.assign(baseoptions, sanitizeOptions(options));
}

/**
 * @returns {object} - The library's options
 */
genshin.getOptions = function () {
    return JSON.parse(JSON.stringify(baseoptions));
}

/**
 * Get list of possible values for a category property.
 * @param {string} query -
 * @param {string|Folder} - 
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {array|undefined} - 
 */
genshin.categories = genshin.category = function (query, folder, opts) {
    if (typeof folder !== 'string' || Folder[folder] === undefined) return undefined; // invalid folder
    opts = Object.assign({}, baseoptions, sanitizeOptions(opts));

    const index = getIndex(opts.resultLanguage, folder);
    const queryDict = Object.keys(index.properties);
	if (helper.normalizeSearchText("" + query) === 'names') {
		return queryDict;
	} else {
		let queryMatch = autocomplete("" + query, queryDict);
		if (queryMatch === undefined) return undefined;
		return getIndexedValue(index, 'properties', queryMatch);
	}
}

/**
 * Get character(s)' information.
 * @param {string} query - The name of the character, character title, elements, birthday months [, ...] see [possible query inputs for character(s) method](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts) 
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.characters = genshin.character = function (query, opts) {
    return retrieveData(query, Folder.characters, opts);
}

/**
 * Get outfit's information.
 * @param {string} query - The name of the outfit, or character name, elements, birthday months [, ...] see [possible query inputs for character(s) method](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts) 
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.outfits = genshin.outfit = function (query, opts) {
    return retrieveData(query, Folder.outfits, opts);
}

/**
 * Get the data about talent(s) for character(s).
 * @param {string} query - character name or upgrade material.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - the combat skills and passive skills for a character(s).
 */
genshin.talents = genshin.talent = function (query, opts) {
    return retrieveData(query, Folder.talents, opts);
}

/**
 * Get data about hyperlinks.
 * @param {string} query - useless
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.hyperlinks = genshin.hyperlink = function (query, opts) {
    return retrieveData('hyperlinks', Folder.hyperlinks, opts);
}

/**
 * Get data about a story(s).
 * @param {string} query - Character name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.stories = genshin.story = function (query, opts) {
    return retrieveData(query, Folder.stories, opts);
}

/**
 * Get data about a chapter.
 * @param {string} query - Chapter name or chapter id.
 * @param {object|Options} opts - The library options, see Valid Options.
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.chapters = genshin.chapter = function (query, opts) {
    return retrieveData(query, Folder.chapters, opts);
}

/**
 * Get data about a book.
 * @param {string} query - Book name, book collection, or book id.
 * @param {object|Options} opts - The library options, see Valid Options.
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.books = genshin.book = function (query, opts) {
    return retrieveData(query, Folder.books, opts);
}

/**
 * Get a document's title and readable contents.
 * @param {string} query - Document title, id, or alias.
 * @param {object|Options} opts - The library options, see Valid Options.
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.documents = genshin.document = function (query, opts) {
    return retrieveData(query, Folder.documents, opts);
}

/**
 * Get data about a task / quest.
 * @param {string} query - Task title or task id.
 * @param {object|Options} opts - The library options, see Valid Options.
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.tasks = genshin.task = function (query, opts) {
    return retrieveData(query, Folder.tasks, opts);
}

/**
 * Get an InterAction configuration by a dialog id or indexed alias.
 * @param {string} query - InterAction dialog id or alias.
 * @param {object|Options} opts - The library options, see Valid Options.
 * @returns {object} - The raw InterAction configuration found by id or alias.
 */
genshin.interactions = genshin.interaction = function (query, opts) {
    return retrieveData(query, Folder.interactions, opts);
}

/**
 * Get data about a weapon(s).
 * 
 * The returned object also includes a method to calculate the stats of the weapon at each level, namely .stats().
 * @param {string} query - Weapon name, type, rarity or ascension material type.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} The data found based on the query string and options parameter.
 */
genshin.weapons = genshin.weapon = function (query, opts) {
    return retrieveData(query, Folder.weapons, opts);
}

/**
 * Get data about weapon material type(s).
 * @param {string} query - Weapon ascension material name, days of the week, region, or domain of forgery.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.weaponmaterialtypes = genshin.weaponmaterialtype = function (query, opts) {
    return retrieveData(query, Folder.weaponmaterialtypes, opts);
}

/**
 * Get data about talent material type(s).
 * @param {string} query - Talent book name, days of the week, region, or name of domain of mastery.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.talentmaterialtypes = genshin.talentmaterialtype = function (query, opts) {
    return retrieveData(query, Folder.talentmaterialtypes, opts);
}

/**
 * Get data about a material(s).
 * @param {string} query - Material rairty, type, "WOOD", ingredient, specialty liyue, domain, days of the week, talent books...
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.materials = genshin.material = function (query, opts) {
    return retrieveData(query, Folder.materials, opts);
}

/**
 * Get data about a quest item(s).
 * @param {string} query - Quest item name or id.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.questitems = genshin.questitem = function (query, opts) {
    return retrieveData(query, Folder.questitems, opts);
}

/**
 * Get data about an element.
 * @param {string} query - Name of the element.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - Data about the element.
 */
genshin.elements = genshin.element = function (query, opts) {
    return retrieveData(query, Folder.elements, opts);
}

/**
 * Get data about constellation for a character.
 * @param {string} query - Name of the character.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - Constellation data for the character.
 */
genshin.constellations = genshin.constellation = function (query, opts) {
    return retrieveData(query, Folder.constellations, opts);
}

/**
 * Get data about an artifact(s)
 * @param {string} query - Artifact name or rarity.
 * @param {object|Options} opts  - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.artifacts = genshin.artifact = function (query, opts) {
    return retrieveData(query, Folder.artifacts, opts);
}

/**
 * Get data about a rarity.
 * @param {string} query - The rarity you want to get information about.
 * @param {object|Options} opts  - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.rarity = function (query, opts) {
    return retrieveData(query, Folder.rarity, opts);
}

/**
 * Get data about a food. 
 * @param {string} query - Recipe name, food rarity, recipe type, food ingredients, buffs or character name with a specialty dish.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.foods = genshin.food = function (query, opts) {
    return retrieveData(query, Folder.foods, opts);
}

/**
 * Get data about a domain.
 * @param {string} query - Domain name, domain entrance name, domain type, recommended elements or days of the week.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.domains = genshin.domain = function (query, opts) {
    return retrieveData(query, Folder.domains, opts);
}

/**
 * Get data about an enemy or boss.
 * @param {string} query - Enemy name, enemy type ("COMMON", "ELITE", "BOSS") or enemy category.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.enemies = genshin.enemy = function (query, opts) {
    return retrieveData(query, Folder.enemies, opts);
}

/**
 * Get data about an achievement
 * @param {string} query - Achievement name, achievement group.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.achievements = genshin.achievement = function (query, opts) {
    return retrieveData(query, Folder.achievements, opts);
}

/**
 * Get data about an achievement group
 * @param {string} query - Achievement group name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.achievementgroups = genshin.achievementgroup = function (query, opts) {
    return retrieveData(query, Folder.achievementgroups, opts);
}

/**
 * Get data about a wind glider
 * @param {string} query - Wind glider name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.windgliders = genshin.windglider = function (query, opts) {
    return retrieveData(query, Folder.windgliders, opts);
}

/**
 * Get data about animals
 * @param {string} query - Animal name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.animals = genshin.animal = genshin.wildlife = function (query, opts) {
    return retrieveData(query, Folder.animals, opts);
}

/**
 * Get data about namecards
 * @param {string} query - Namecard name
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.namecards = genshin.namecard = function (query, opts) {
    return retrieveData(query, Folder.namecards, opts);
}

/**
 * Get data about geographies
 * @param {string} query - viewpoint name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.geographies = genshin.geography = genshin.viewpoints = genshin.viewpoint = function (query, opts) {
    return retrieveData(query, Folder.geographies, opts);
}

/**
 * Get data about dungeons
 * @param {string} query - dungeon name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @return {object} - The data found based on the query string and options parameter.
 */
genshin.dungeons = genshin.dungeon = function (query, opts) {
    return retrieveData(query, Folder.dungeons, opts);
}

/**
 * Get data about map layers
 * @param {string} query - map layer name.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.maplayers = genshin.maplayer = function (query, opts) {
    return retrieveData(query, Folder.maplayers, opts);
}

/**
 * Get data about adventure ranks
 * @param {string} query - adventure level
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.adventureranks = genshin.adventurerank = function (query, opts) {
    return retrieveData(query, Folder.adventureranks, opts);
}

/**
 * Get data about crafting recipes at the crafting bench
 * @param {string} query - item to craft
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.crafts = genshin.craft = function (query, opts) {
    return retrieveData(query, Folder.crafts, opts);
}

/**
 * Get data about emojis
 * @param {string} query - emoji name to search
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.emojis = genshin.emoji = function (query, opts) {
    return retrieveData(query, Folder.emojis, opts);
}

/**
 * Get data about voiceovers for characters
 * @param {string} query - character name of the voiceover you want to search for
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.voiceovers = genshin.voiceover = function (query, opts) {
    return retrieveData(query, Folder.voiceovers, opts);
}


genshin.tcgactioncards = genshin.tcgactioncard = function (query, opts) {
    return retrieveData(query, Folder.tcgactioncards, opts);
}
genshin.tcgcardbacks = genshin.tcgcardback = function (query, opts) {
    return retrieveData(query, Folder.tcgcardbacks, opts);
}
genshin.tcgcardboxes = genshin.tcgcardbox = function (query, opts) {
    return retrieveData(query, Folder.tcgcardboxes, opts);
}
genshin.tcgcharactercards = genshin.tcgcharactercard = function (query, opts) {
    return retrieveData(query, Folder.tcgcharactercards, opts);
}
genshin.tcgdetailedrules = genshin.tcgdetailedrule = function (query, opts) {
    return retrieveData(query, Folder.tcgdetailedrules, opts);
}
genshin.tcgenemycards = genshin.tcgenemycard = function (query, opts) {
    return retrieveData(query, Folder.tcgenemycards, opts);
}
genshin.tcgkeywords = genshin.tcgkeyword = function (query, opts) {
    return retrieveData(query, Folder.tcgkeywords, opts);
}
genshin.tcglevelrewards = genshin.tcglevelreward = function (query, opts) {
    return retrieveData(query, Folder.tcglevelrewards, opts);
}
genshin.tcgstatuseffects = genshin.tcgstatuseffect = function (query, opts) {
    return retrieveData(query, Folder.tcgstatuseffects, opts);
}
genshin.tcgsummons = genshin.tcgsummon = function (query, opts) {
    return retrieveData(query, Folder.tcgsummons, opts);
}

/**
 * Get data in any specified folder.
 * @param {string} folder - Folder name. For example: 'characters'.
 * @param {object|Options} opts - The library options, see [Valid Options](https://github.com/theBowja/genshin-db/blob/main/readme.md#genshindbsetoptionsopts)
 * @returns {object} - The data found based on the query string and options parameter.
 */
genshin.searchFolder = function (folder, query, opts) {
    folder = FolderFormat(folder);
    if(typeof folder !== 'string') return undefined;
    return retrieveData(query, folder, opts);
}

genshin.searchMultipleFolders = function (folders, query, opts) {
    folders = FolderFormat(folders);
    if(!Array.isArray(folders)) return undefined;
    return retrieveData(query, folders, opts);
}


genshin.helper = require('./helper.js');

// EXPORT ENUMS
genshin.Language = genshin.Languages = language.LanguagesEnum;
genshin.Folder = genshin.Folders = Folder;
genshin.MatchType = genshin.MatchTypes = MatchType;

//TODO: documentate the three methods below
/**
 * 
 * @param {*} language 
 * @param {*} folder 
 * @param {*} altname 
 * @param {*} query 
 * @returns 
 */
genshin.addAltName = function (language, folder, altname, query) {
    const options = new Options(
        false, // dumpResult
        true, // matchNames
        false, // matchIds
        false, // matchAltNames
        false, // matchAliases
        false, // matchCategories
        false, // verboseCategories
        [language], // queryLanguages
    );

    const filename = retrieveData(query, folder, options, true);
    if (filename)
        return altnames.addAltName(language, folder, altname, filename);
    else
        return false;
}
genshin.removeAltNames = altnames.removeAltNames;
genshin.setAltNameLimits = altnames.setLimit;

//Class Options will serve as a template for the library's options.
genshin.Options = Options;

genshin.addData = addData;

module.exports = genshin;
