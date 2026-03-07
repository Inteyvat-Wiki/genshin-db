declare module "genshin-db" {
	export interface Story {
		id: number;
        stories: {
            title: string;
            description: string;
            descriptionRaw: string;
            tips: string[];
        }[];
	}
}