declare module "genshin-db" {
    export type TaskSubtitleCondition = { type: 'boolean'; id: string; title: string; subtitle: string; value: boolean } | 'and';
    export interface TaskSubtitleDialog {
        content: string;
        role: 'npc' | 'text' | 'black_screen';
        speaker?: string;
        next_dialogs: { dialog: number }[];
        duration?: number;
    }
    export interface TaskSubtitleNarration {
        type: 'narration';
        /** Original subquest ID, not a consumer's local step index. */
        step: number;
        event: 'start' | 'finish' | 'failed';
        source: string;
        conditions: TaskSubtitleCondition[];
        delay?: number;
        after?: string;
        dialogs: Record<string, TaskSubtitleDialog>;
    }
    export interface TaskSubtitleBubbleBase {
        type: 'speech_bubble';
        step: number;
        event: 'start' | 'finish' | 'failed';
        source: string;
        api: string;
        scope: 'quest' | 'npc';
        conditions: TaskSubtitleCondition[];
        delay?: number;
        delay_unknown?: true;
        after?: string;
        after_source?: string;
        callbacks?: { source: string; method: string; argument: number; kind?: 'delay' | 'safe_call' | 'narration_finish' }[];
    }
    export type TaskSubtitleBubble = TaskSubtitleBubbleBase & ({
        action: 'create' | 'trigger';
        npc_id: number;
        dialog_id: number;
        dialog: TaskSubtitleDialog;
        dialog_speaker?: { id?: string; type: string };
        text_sources: string[];
        parameters?: (number | boolean | string | null | { reference: string } | { unknown: true })[];
    } | { action: 'clear_task'; scope: 'quest'; npc_id?: never; dialog_id?: never; dialog?: never; parameters?: never }
      | { action: 'clear_npc'; npc_id: number; dialog_id?: never; dialog?: never; parameters?: never });
    export interface TaskSubtitleRecord {
        id: number;
        name: string;
        narrations: Record<string, TaskSubtitleNarration>;
        bubbles: Record<string, TaskSubtitleBubble>;
        version?: string;
    }
}
