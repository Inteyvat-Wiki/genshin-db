declare module "genshin-db" {
	/** Data about a quest item. */
	export interface QuestItem {
		id: number;
		alias: string;
		name: string;
		dupealias?: string;
		sortRank?: number;
		description: string;
		fullDescription: string;
		category: 'QUEST';
		materialType: 'MATERIAL_QUEST';
		typeText: string;
		rarity?: 1 | 2 | 3 | 4 | 5;
		stackLimit?: number;
		weight?: number;
		sources: string[];
		itemUse?: QuestItemUse[];
		gadgetId?: number;
		effectGadgetId?: number;
		maxUseCount?: number;
		useOnGain?: boolean;
		useTarget?: string;
		interactionTitle?: string;
		documentId?: number;
		documentTitle: string;
		localizationIds: number[];
		readablePaths: string[];
		previewPath: string;
		splitType?: string;
		content: string[];
		gadgetInteractions?: QuestItemGadgetInteraction[];
		images: {
			filename_icon: string;
		};
		version: string;
	}

	export interface QuestItemUse {
		useOp: string;
		useParam: string[];
	}

	export interface QuestItemGadgetInteraction {
		interactId: number;
		param1?: number | null;
		uiDesc: string;
		count?: number;
		actionList?: Record<string, unknown>[] | null;
		condList?: Record<string, unknown>[] | null;
		isMpModeInteract?: boolean | null;
	}
}
