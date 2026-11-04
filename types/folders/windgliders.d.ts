declare module "genshin-db" {
	export interface WindGlider {
		id: number;
		name: string;
		description: string;
		/** Original text markup, with escaped newlines decoded. */
		descriptionRaw: string;
		rarity: 4;
		story: string; // Document/Localization readable; empty string when absent
		isHidden?: true;
		source: string[];
		
		images: {
			filename_icon: string;
			filename_gacha: string;
		};

		version: string;
	}
}
