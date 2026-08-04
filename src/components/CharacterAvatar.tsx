"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { getItem } from "@/lib/items";

interface CharacterAvatarProps {
	equipped: Record<string, string | null>;
	size?: "sm" | "md" | "lg";
}

export function CharacterAvatar({
	equipped,
	size = "md",
}: CharacterAvatarProps) {
	const reduceMotion = useReducedMotion();
	const sizeMap = {
		sm: { container: "w-10 h-10", canvas: 40 },
		md: { container: "w-20 h-20", canvas: 80 },
		lg: { container: "w-40 h-40", canvas: 160 },
	};
	const config = sizeMap[size];

	// Render layers in order: base, outfit, weapon, hat
	const slots = ["base", "outfit", "weapon", "hat"];
	const layers = slots
		.map((slot) => {
			let itemId = equipped[slot];
			// The base slot must always have a body.
			if (slot === "base" && !itemId) itemId = "base-boy";
			if (!itemId) return null;
			const item = getItem(itemId);
			return item;
		})
		.filter(Boolean) as any[];

	if (layers.length === 0) {
		// Fallback if no items equipped
		return (
			<motion.div
				className={`${config.container} rounded-full bg-cream flex items-center justify-center overflow-hidden`}
				animate={
					reduceMotion ? undefined : { y: [0, -3, 0], rotate: [0, -1, 1, 0] }
				}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
			>
				<span className="text-2xl">❓</span>
			</motion.div>
		);
	}

	return (
		<motion.div
			className={`${config.container} relative inline-block overflow-hidden rounded-full bg-cream`}
			animate={
				reduceMotion ? undefined : { y: [0, -3, 0], rotate: [0, -1, 1, 0] }
			}
			transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
		>
			{layers.map((item, idx) => (
				<Image
					key={item.id}
					src={item.imageUrl}
					alt={item.name}
					fill
					className="absolute"
					style={{
						zIndex: idx,
						objectFit: "contain",
					}}
				/>
			))}
		</motion.div>
	);
}
