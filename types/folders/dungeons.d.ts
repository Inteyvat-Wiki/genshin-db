declare module "genshin-db" {
	export interface Dungeon {
		id: number;
        /** Unique DungeonEntry configuration ID; present in prepared snapshots. */
        entryId?: number;
        /** Scene containing the entrance; id remains the legacy point ID. */
        sceneId?: number;
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
