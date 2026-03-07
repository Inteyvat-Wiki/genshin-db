declare module "genshin-db" {
	export interface Hyperlink {
        hyperlinks: {
            id: number;
            title: string;
            description: string;
            descriptionRaw: string;
            params: string[];
            color: string;
        }[];
	}
}