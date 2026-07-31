"use client";

import { motion } from "framer-motion";
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
			const itemId = equipped[slot];
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
				animate={{ y: [0, -3, 0], rotate: [0, -1, 1, 0] }}
				transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
			>
				<span className="text-2xl">❓</span>
			</motion.div>
		);
	}

	return (
		<motion.div
			className={`${config.container} relative inline-block overflow-hidden rounded-full bg-cream`}
			animate={{ y: [0, -3, 0], rotate: [0, -1, 1, 0] }}
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
					priority
				/>
			))}
		</motion.div>
	);
}
