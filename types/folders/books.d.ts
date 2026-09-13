declare module "genshin-db" {
	export interface Book {
		id: number;
		materialId: number;
		name: string;
		description: string;

		setId?: number;
		setName: string;
		codexId: number;
		sortOrder: number;
		isDisuse?: boolean;

		materialType: string;
		typeText: string;
		gadgetId?: number;
		documentId: number;
		documentTitle: string;
		localizationIds: number[];
		readablePaths: string[];
		previewPath: string;
		splitType?: string;
		content: string;

		images: {
			filename_icon: string;
		};
	}
}
