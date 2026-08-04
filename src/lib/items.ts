import type { Item } from "./types";

export const ITEMS: Item[] = [
	// Base bodies (free, always owned)
	{
		id: "base-boy",
		slot: "base",
		name: "Alex",
		cost: 0,
		imageUrl: "/characters/base-boy.svg",
	},
	{
		id: "base-girl",
		slot: "base",
		name: "Sam",
		cost: 0,
		imageUrl: "/characters/base-girl.svg",
	},
	{
		id: "base-curly",
		slot: "base",
		name: "Curly",
		cost: 0,
		imageUrl: "/characters/base-curly.svg",
	},
	{
		id: "base-ponytails",
		slot: "base",
		name: "Pigtails",
		cost: 0,
		imageUrl: "/characters/base-ponytails.svg",
	},
	{
		id: "base-dark",
		slot: "base",
		name: "Scout",
		cost: 0,
		imageUrl: "/characters/base-dark.svg",
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
	{
		id: "hat-cap",
		slot: "hat",
		name: "Baseball Cap",
		cost: 40,
		imageUrl: "/characters/hat-cap.svg",
	},
	{
		id: "hat-helmet",
		slot: "hat",
		name: "Horned Helmet",
		cost: 80,
		imageUrl: "/characters/hat-helmet.svg",
	},
	{
		id: "hat-flower",
		slot: "hat",
		name: "Flower Crown",
		cost: 50,
		imageUrl: "/characters/hat-flower.svg",
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
	{
		id: "outfit-super",
		slot: "outfit",
		name: "Hero Cape",
		cost: 80,
		imageUrl: "/characters/outfit-super.svg",
	},
	{
		id: "outfit-pirate",
		slot: "outfit",
		name: "Pirate",
		cost: 90,
		imageUrl: "/characters/outfit-pirate.svg",
	},
	{
		id: "outfit-wizard",
		slot: "outfit",
		name: "Wizard Robe",
		cost: 110,
		imageUrl: "/characters/outfit-wizard.svg",
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
	{
		id: "weapon-shield",
		slot: "weapon",
		name: "Shield",
		cost: 60,
		imageUrl: "/characters/weapon-shield.svg",
	},
	{
		id: "weapon-axe",
		slot: "weapon",
		name: "Battle Axe",
		cost: 80,
		imageUrl: "/characters/weapon-axe.svg",
	},
	{
		id: "weapon-wand",
		slot: "weapon",
		name: "Star Wand",
		cost: 50,
		imageUrl: "/characters/weapon-wand.svg",
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
