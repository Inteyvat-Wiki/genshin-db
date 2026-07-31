declare module "genshin-db" {
	export interface MapLayer {
		id: number;
        layers: {
            id: number;
            name: string;
            name_new?: string;
            floor: number;
            filename_images: string[];
        }[];
	}
}