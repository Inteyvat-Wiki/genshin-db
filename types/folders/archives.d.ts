declare module "genshin-db" {
    export type ArchiveCategory = 'serenitea' | 'tcg' | 'miliastra';
    export interface ArchiveClassification {
        /** Original HomeWorldFurnitureType.typeID and typeCategoryID, not translated-name keys. */
        id: string;
        group_id: string;
        group_name: string;
        name: string;
    }
    export interface ArchiveSourceCondition { type: string; params: (string | number)[]; }
    export interface ArchiveSourceTalk {
        source_id: number;
        title: string;
        priority: number;
        begin_way: 'manual' | 'auto' | null;
        next_talks: number[];
        trigger_ids: string[];
        trigger_points: { scene_id: number; point_id?: number; position: [number, number, number] }[];
        objects: string[];
        /** Raw dialogue identity, content and conditions, before consumer flow conversion. */
        source_dialogue?: {
            dialogs: NpcDialog[];
            initial_dialog?: number;
            perform_cfg: string;
            menu_option: boolean;
            conditions: { logic: string; conditions: ArchiveSourceCondition[] };
            labels: { condition: ArchiveSourceCondition; title: string; subtitle: string }[];
        };
        /** Narrative battle lines have no InterAction graph. */
        dialogs?: Record<string, { role: 'npc'; content: string; speaker?: string; next_dialogs: { dialog: number }[] }>;
        conditions?: unknown[];
        initial_dialogs?: { dialog: number }[];
    }
    export interface ArchiveRecord {
        /** Stable source-qualified ID; does not depend on the translated name. */
        id: string;
        order: number;
        show: boolean;
        name: string;
        type: string;
        description: string;
        sections: { title?: string; kind?: string; text: string }[];
        classifications?: ArchiveClassification[];
        /** HomeWorldFurniture.specialFurnitureType; empty means the source default. */
        furniture_type?: string;
        card_type?: { id: string; name: string };
        tags?: { id: string; name: string; order?: number; hidden?: boolean }[];
        images: { name: string; kind?: string; replaces?: string }[];
        relations: { category: string; id: string; source_id?: number; name: string; role: string; count?: number }[];
        talks: Record<string, ArchiveSourceTalk>;
        entry_talks: number[];
        layout?: { item: string; position: [number, number, number]; rotation?: [number, number, number] }[];
        source: { table: string; id: string; hashes: string[]; references?: string[] };
        diagnostics?: string[];
        version?: string;
    }
}
