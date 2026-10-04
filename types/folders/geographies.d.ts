declare module "genshin-db" {
	export interface Geography {
		id: number;
		name: string;
		areaId: number;
		areaName: string;
		description: string;
		regionId: number;
		regionName: string;
		showOnlyUnlocked?: true;
		sortOrder: number;
		images: {
			filename_image: string;
		};
		version: string;
	}
}
