declare module "@inteyvat-wiki/genshin-db" {
	export interface Document {
		id: number;
		alias: string;
		name: string;
		dupealias?: string;
		content: string[];
	}
}
