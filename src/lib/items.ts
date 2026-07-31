import type { Item } from "./types";

export const ITEMS: Item[] = [
	// Base bodies (free, always owned)
	{
		id: "base-boy",
		slot: "base",
		name: "Boy",
		cost: 0,
		imageUrl: "/characters/base-boy.svg",
	},
	{
		id: "base-girl",
		slot: "base",
		name: "Girl",
		cost: 0,
		imageUrl: "/characters/base-girl.svg",
	},

	// Hats
	{
		id: "hat-wizard",
		slot: "hat",
		name: "Wizard Hat",
		cost: 50,
		imageUrl: "/characters/hat-wizard.svg",
	},
	{
		id: "hat-party",
		slot: "hat",
		name: "Party Hat",
		cost: 30,
		imageUrl: "/characters/hat-party.svg",
	},
	{
		id: "hat-crown",
		slot: "hat",
		name: "Crown",
		cost: 100,
		imageUrl: "/characters/hat-crown.svg",
	},

	// Outfits
	{
		id: "outfit-explorer",
		slot: "outfit",
		name: "Explorer Vest",
		cost: 75,
		imageUrl: "/characters/outfit-explorer.svg",
	},
	{
		id: "outfit-knight",
		slot: "outfit",
		name: "Knight Armor",
		cost: 120,
		imageUrl: "/characters/outfit-knight.svg",
	},
	{
		id: "outfit-ninja",
		slot: "outfit",
		name: "Ninja Suit",
		cost: 100,
		imageUrl: "/characters/outfit-ninja.svg",
	},

	// Weapons
	{
		id: "weapon-sword",
		slot: "weapon",
		name: "Wooden Sword",
		cost: 40,
		imageUrl: "/characters/weapon-sword.svg",
	},
	{
		id: "weapon-staff",
		slot: "weapon",
		name: "Magic Staff",
		cost: 90,
		imageUrl: "/characters/weapon-staff.svg",
	},
	{
		id: "weapon-bow",
		slot: "weapon",
		name: "Bow",
		cost: 70,
		imageUrl: "/characters/weapon-bow.svg",
	},
];

export const DEFAULT_EQUIPPED: Record<string, string | null> = {
	base: "base-boy",
	hat: null,
	outfit: null,
	weapon: null,
};

export function getItem(id: string): Item | undefined {
	return ITEMS.find((i) => i.id === id);
}

export function getItemsBySlot(slot: string): Item[] {
	return ITEMS.filter((i) => i.slot === slot);
}
