declare module "genshin-db" {
	export interface Dungeon {
		id: number;
        name?: string;
        description: string;
        regionId?: number;
        regionName?: string;
        tabs: {
            id: number;
            name: string;
            description: string;
        }[];

        images: {
            filename_image: string;
        };
	}
}
