declare module "@inteyvat-wiki/genshin-db" {
	export interface WeaponSkin {
		/** AvatarWeaponSkin ID, not its inventory material ID. */
		id: number;
		itemId: number;
		name: string;
		description: string;
		/** Original text markup, with escaped newlines decoded. */
		descriptionRaw: string;
		weaponType: Weapon['weaponType'];
		rarity: 4 | 5;
		source: string[];
		/** Explicit memberships from AvatarWeaponSkinGroupExcelConfigData. */
		groups: { id: number; name: string }[];
		images: {
			filename_icon: string;
			filename_gacha: string;
			filename_card?: string;
		};
		version?: string;
	}
}
