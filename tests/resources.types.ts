import * as db from '@inteyvat-wiki/genshin-db';
import * as resources from '@inteyvat-wiki/genshin-db/resources';

const worldAreas = db.resources.prepare('worldAreas', {
    sourceRoot: 'source', studio: 'studio', map: 'client.map', output: 'new-output', dotnet: 'dotnet',
});
const cachePath: string = worldAreas.cachePath;
const kind: 'worldAreas' = worldAreas.kind;
resources.prepare('images', { cacheFile: cachePath, output: 'new-images', studio: 'studio', dotnet: 'dotnet', game: 'GI' });
resources.profileFrames.prepare('index', 'map.json', 'cache.json', 'source');
// @ts-expect-error sceneIds must be explicit, not guessed by orchestration.
resources.prepare('mapFog', { baseCacheFile: 'base.json', studio: 'studio', map: 'client.map', output: 'new-fog' });
// @ts-expect-error Lua discovery is not a supported GDS preparer.
resources.prepare('lua', { output: 'new-lua' });
void kind;
