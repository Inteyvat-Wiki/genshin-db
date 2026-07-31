declare module "genshin-db" {
	export interface Chapter {
		id: number;
		name: string;
		numberName: string;
		taskIds: number[];
		images: {
			filename_icon: string;
		};
	}
}
