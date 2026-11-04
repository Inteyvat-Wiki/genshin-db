declare module "genshin-db" {
    export type MapRecordKind = 'scene' | 'world_area' | 'map_area' | 'layer_group' | 'floor' | 'layer'
        | 'label' | 'point' | 'point_collection' | 'level_tag' | 'scene_tag' | 'limit_region' | 'open_state' | 'quest_event'
        | 'map_tag' | 'map_icon' | 'map_settings' | 'resource'
        | 'viewpoint' | 'npc_instance' | 'layer_region' | 'ability_map' | 'boundary_geometry' | 'map_trigger' | 'map_place';

    /** Parsed source record, not a Wiki display document or a visibility predicate. */
    export interface MapRecord {
        schema: 1;
        /** Kind-qualified source identity; unrelated ID namespaces never collapse. */
        id: string;
        kind: MapRecordKind;
        name: string;
        description: string;
        texts: Array<{ role: string; text: string; hash?: string }>;
        relations: Array<{ role: string; category: string; id: string }>;
        /** Kind-specific parsed data. Consumers must explicitly narrow and map accepted fields. */
        data: Record<string, unknown>;
        source: { file: string; id: string; hashes: string[]; fields: string[] };
        diagnostics: string[];
        version?: string;
    }
}
