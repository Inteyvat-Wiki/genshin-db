const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const helper = require('./helper.js');

const argv = require('yargs-parser')(process.argv.slice(2), {
	alias: { folder: ['folders'], language: ['languages'] },
	array: [ 'folders', 'languages' ],
	default: { folders: ['standard'], languages: ['all'], outdir: 'src/min' }
});

let specificlanguages = helper.sanitizeLanguages(argv.languages);
let specificfolders = helper.sanitizeFolders(argv.folders);

const gzipfilepath = argv.gzipfilepath;
if (gzipfilepath) console.log('Specified gzipfilepath: ' + gzipfilepath);

const outdir = argv.outdir ; // The directory where data.min.json and data.min.json.gzip will be outputted.
const maxRequireableJsonLength = 0x1fffffe8;

async function combineData() {
	console.log("Combining and minifying data, index, image, stats, curve, url, version");
	let mydata = {}, myindex = {}, myimage = {}, mystats = {}, mycurve = {}, myurl = {}, myversion = {};

	for(const lang of specificlanguages) {
		mydata[lang] = {};
		myindex[lang] = {};
		for(const folder of specificfolders) {
			if (!fs.existsSync(`../../src/data/${lang}/${folder}`)) continue;
			mydata[lang][folder] = {};
			myindex[lang][folder] = require(`../../src/data/index/${lang}/${folder}.json`);

			fs.readdirSync(`../../src/data/${lang}/${folder}`)
				.filter(filename => filename.endsWith('.json'))
				.map(filename => filename.substring(0, filename.length-5))
				.sort()
				.forEach(filename => {
					mydata[lang][folder][filename] = require(`../../src/data/${lang}/${folder}/${filename}`);
				});
		}
	}
	for(const folder of specificfolders) {
		if(fs.existsSync(`../../src/data/image/${folder}.json`))
			myimage[folder] = require(`../../src/data/image/${folder}.json`);
		if(fs.existsSync(`../../src/data/stats/${folder}.json`))
			mystats[folder] = require(`../../src/data/stats/${folder}.json`);
		if(fs.existsSync(`../../src/data/curve/${folder}.json`))
			mycurve[folder] = require(`../../src/data/curve/${folder}.json`);
		if(fs.existsSync(`../../src/data/url/${folder}.json`))
			myurl[folder] = require(`../../src/data/url/${folder}.json`);
		if(fs.existsSync(`../../src/data/version/${folder}.json`))
			myversion[folder] = require(`../../src/data/version/${folder}.json`);
	}

	const all = {
		data: mydata,
		index: myindex,
		image: myimage,
		stats: mystats,
		curve: mycurve,
		url: myurl,
		version: myversion
	};

	const genshindbroot = path.resolve(__dirname, '../../');
	const outputdir = path.resolve(genshindbroot, outdir);
	const jsonfilepath = gzipfilepath ? `${gzipfilepath}.tmp-json-${process.pid}` : path.resolve(outputdir, `data.min.json`);
	const gzipoutputpath = gzipfilepath || path.resolve(outputdir, `data.min.json.gzip`);

	if (gzipfilepath) {
		fs.mkdirSync(path.dirname(gzipfilepath), { recursive: true });
	} else {
		fs.mkdirSync(outputdir, { recursive: true });
	}

	try {
		writeJsonFile(jsonfilepath, all);
		await gzipFile(jsonfilepath, gzipoutputpath);

		const uncompressedsize = fs.statSync(jsonfilepath).size / 1000 / 1000;
		const compressedsize = fs.statSync(gzipoutputpath).size / 1000 / 1000;
		console.log(`compression: ${roundFour(compressedsize)}MB/${roundFour(uncompressedsize)}MB = ${roundFour(compressedsize / uncompressedsize * 100)}%`)
		if(!gzipfilepath && fs.statSync(jsonfilepath).size > maxRequireableJsonLength) {
			console.warn(`Warning: ${jsonfilepath} is too large for Node.js to require(). Use fewer folders or keep oversized folders out of the default bundle.`);
		}
	} finally {
		if (gzipfilepath && fs.existsSync(jsonfilepath)) fs.unlinkSync(jsonfilepath);
	}
}

function writeJsonFile(filepath, value) {
	fs.mkdirSync(path.dirname(filepath), { recursive: true });
	const fd = fs.openSync(filepath, 'w');
	const writer = new JsonFileWriter(fd);
	try {
		writeJsonValue(writer, value);
		writer.flush();
	} finally {
		fs.closeSync(fd);
	}
}

function writeJsonValue(writer, value) {
	if(value === null) return writer.write('null');

	switch(typeof value) {
		case 'string':
			return writer.write(JSON.stringify(value));
		case 'number':
			return writer.write(Number.isFinite(value) ? String(value) : 'null');
		case 'boolean':
			return writer.write(value ? 'true' : 'false');
		case 'object':
			if(Array.isArray(value)) return writeJsonArray(writer, value);
			return writeJsonObject(writer, value);
		default:
			return writer.write('null');
	}
}

function writeJsonArray(writer, array) {
	writer.write('[');
	for(let i = 0; i < array.length; i++) {
		if(i !== 0) writer.write(',');
		writeJsonValue(writer, array[i]);
	}
	writer.write(']');
}

function writeJsonObject(writer, object) {
	writer.write('{');
	let first = true;
	for(const key of Object.keys(object)) {
		const value = object[key];
		if(value === undefined || typeof value === 'function' || typeof value === 'symbol') continue;
		if(!first) writer.write(',');
		first = false;
		writer.write(JSON.stringify(key));
		writer.write(':');
		writeJsonValue(writer, value);
	}
	writer.write('}');
}

function gzipFile(inputpath, outputpath) {
	return pipeline(
		fs.createReadStream(inputpath),
		zlib.createGzip(),
		fs.createWriteStream(outputpath)
	);
}

class JsonFileWriter {
	constructor(fd) {
		this.fd = fd;
		this.buffer = '';
		this.bufferLength = 0;
		this.maxBufferLength = 1024 * 1024;
	}

	write(chunk) {
		this.buffer += chunk;
		this.bufferLength += chunk.length;
		if(this.bufferLength >= this.maxBufferLength) this.flush();
	}

	flush() {
		if(this.bufferLength === 0) return;
		fs.writeSync(this.fd, this.buffer);
		this.buffer = '';
		this.bufferLength = 0;
	}
}

function roundFour(num) {
	return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

combineData().catch(err => {
	console.error('Failed to combine data:');
	console.error(err && err.stack ? err.stack : err);
	process.exitCode = 1;
});
