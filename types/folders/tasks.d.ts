declare module "genshin-db" {
	export interface TaskItemOperation {
		action: 'obtain' | 'give' | 'remove';
		items: { id: number; count: number | null }[];
		choices?: { id: number }[];
		count?: number;
		givingId?: number;
		rewardId?: number;
		remove?: boolean;
	}
	export interface TaskDialog {
		id: number;
		content: string;
		roleType: 'TALK_ROLE_NPC' | 'TALK_ROLE_PLAYER' | 'TALK_ROLE_BLACK_SCREEN' | string;
		speakerTitle?: string;
		speakerSubtitle?: string;
		nextDialogs: number[];
	}

	export type TaskQuestStateName = 'QUEST_STATE_NONE' | 'QUEST_STATE_UNSTARTED' | 'QUEST_STATE_UNFINISHED' | 'QUEST_STATE_FINISHED' | 'QUEST_STATE_FAILED' | string;

	export type TaskStepFinishCondition =
		| {
			type: 'QUEST_CONTENT_COMPLETE_TALK';
			talkId: number;
			rawParams: (string | number | boolean)[];
		}
		| {
			type: string;
			rawParams: (string | number | boolean)[];
		};

	export type TaskTalkBeginCondition =
		| {
			type: 'QUEST_COND_STATE_EQUAL' | 'QUEST_COND_STATE_NOT_EQUAL' | 'QUEST_COND_QUEST_STATE_NOT_EQUAL' | 'QUEST_COND_QUEST_STATE_EQUAL';
			stepId: number;
			stateName?: TaskQuestStateName;
			rawParams: (string | number | boolean)[];
		}
		| {
			type: string;
			rawParams: (string | number | boolean)[];
		};

	export interface TaskTalkBeginConditionGroup {
		logic: 'LOGIC_NONE' | 'LOGIC_AND' | 'LOGIC_OR' | 'LOGIC_A_AND_ETCOR' | 'LOGIC_A_OR_ETCAND' | string;
		conditions: TaskTalkBeginCondition[];
	}

	export interface TaskStep {
		itemOperations: TaskItemOperation[];
		id: number;
		order: number;
		listShowType: 'QUEST_SHOW' | 'QUEST_HIDDEN' | string;
		description: string;
		guide?: {
			sceneId: number;
			pointId?: number;
			position: [number, number, number];
		};
		finishConditions: TaskStepFinishCondition[];
		failConditions: TaskStepFinishCondition[];
	}

	export interface TaskTriggerPoint {
		sceneId: number;
		pointId?: number;
		position: [number, number, number];
	}

	export interface TaskTalkSegment {
		id: number;
		priority: number;
		completionStepIds: number[];
		beginWay: 'TALK_BEGIN_MANUAL' | 'TALK_BEGIN_AUTO' | string;
		nextTalks: number[];
		beginConditions: TaskTalkBeginConditionGroup;
		mark: string;
		trigger: {
			objectIds: number[];
			objectNames: string[];
			points: TaskTriggerPoint[];
		}
		dialogs: TaskDialog[];
	}

	export interface Task {
		itemOperations: TaskItemOperation[];
		id: number;
		alias: string;
		type: 'AQ' | 'LQ' | 'EQ' | 'IQ' | 'WQ' | string;
		name: string;
		description: string;
		unlockDescription: string;
		chapter: string;
		showType: 'QUEST_SHOW' | 'QUEST_HIDDEN' | string;
		activityId: number;
		mainQuestTag: 'MAINQUEST_TAG_NONE' | 'MAINQUEST_TAG_GUIDE' | 'MAINQUEST_TAG_RANK_ZERO_WQ' | 'MAINQUEST_TAG_ACTIVITY' | 'MAINQUEST_TAG_REPUTATION' | 'MAINQUEST_TAG_NATLAN_TRIBAL' | 'MAINQUEST_TAG_FLOWERLAND' | 'MAINQUEST_TAG_ANECDOTE' | 'MAINQUEST_TAG_THESPIA' | 'MAINQUEST_TAG_RESIDENT_ACTIVITY' | string;
		suggestTrackMainQuestList: number[];
		prevMainQuestList: number[];
		steps: TaskStep[];
		talks: TaskTalkSegment[];
	}
}
