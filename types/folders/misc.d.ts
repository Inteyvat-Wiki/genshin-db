declare module "genshin-db" {
    export type MiscType = 'achievement' | 'achievement_group' | 'namecard' | 'profile_picture' | 'profile_frame'
        | 'expedition' | 'gallant_path' | 'loading_tip' | 'tutorial' | 'graeae_message';

    /** Client-source text catalogue, not an ArchiveRecord or a history of server mail. */
    export interface MiscRecord {
        /** type + '-' + the real source ID; independent of translated names. */
        id: string;
        order: number;
        show: boolean;
        type: MiscType;
        name: string;
        description: string;
        sections: { title?: string; kind?: string; text: string }[];
        tutorial_category?: string;
        message_thread?: { initial: string[]; nodes: { id: string; kind: string; text: string; preview?: string;
            speaker?: string; next: string[]; requires?: string; location?: string; image?: { name: string; kind?: string } }[] };
        loading_situations?: { id: string; action: string; areas: { id: string; name: string }[]; terrain?: string;
            scene_ids?: string[]; dungeon_type?: string; dungeons?: { id: string; name: string }[];
            image?: { name: string; kind?: string } }[];
        /** Resource names or exact uint64 strings only. No URLs. */
        images: { name: string; kind?: string }[];
        relations: { category: string; id: string; name: string; role: string; source_id?: number }[];
        source: { table: string; id: string; hashes: string[]; references?: string[] };
        diagnostics?: string[];
        version?: string;
    }
}
