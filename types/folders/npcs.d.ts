declare module "genshin-db" {
	export interface NpcDialog extends TaskDialog {
		speakerName?: string;
		showType?: string;
		optionIcon?: string;
		actionBefore?: string;
		actionWhile?: string;
		actionAfter?: string;
	}

	export interface NpcTalk {
		id: number;
		questId?: number;
		priority: number;
		beginWay: string;
		activeMode: string;
		excelActiveMode?: string;
		initDialog: number;
		nextTalks: number[];
		beginConditions: TaskTalkBeginConditionGroup;
		performCfg: string;
		finishExec: { type: string; param: string[] }[];
		trigger: TaskTalkSegment['trigger'];
		source: string;
		dialogs: NpcDialog[];
	}

	export interface NpcBirthPoint {
		sceneId: number;
		id: number;
		position: [number, number, number] | null;
		roomId?: number;
		groupId?: number;
		suiteIds?: number[];
		priority?: number;
		rawConditions?: Record<string, unknown>[][];
		platform?: { groupId: number; configId: number };
		source: string;
	}

	export interface Npc {
		id: number;
		name: string;
		title?: string;
		alias: string;
		source: { group: string; resource: string | number };
		birthPoints: NpcBirthPoint[];
		entryTalks: number[];
		talks: NpcTalk[];
		diagnostics: { type: string; id: number; dialog?: number }[];
	}
}
