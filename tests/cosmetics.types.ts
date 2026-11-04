/// <reference path="../types/index.d.ts" />
import * as db from 'genshin-db';

const appearance: db.WeaponSkin | undefined = db.weaponskins('390003', { matchIds: true });
if (appearance) {
	const id: number = appearance.id;
	const description: string = appearance.descriptionRaw;
	const weaponType: db.Weapon['weaponType'] = appearance.weaponType;
	const icon: string = appearance.images.filename_icon;
	void [id, description, weaponType, icon];
}
const outfits: db.Outfit[] = db.outfits('names', { matchCategories: true, verboseCategories: true });
for (const outfit of outfits) {
	const story: string = outfit.story;
	const description: string = outfit.descriptionRaw;
	void [story, description];
}
const glider: db.WindGlider | undefined = db.windgliders('140001', { matchIds: true });
if (glider) {
	const story: string = glider.story;
	const description: string = glider.descriptionRaw;
	void [story, description];
}
const folder: db.Folder = db.Folder.weaponskins;
void folder;
