"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = [
	"#ff6b6b",
	"#ffd93d",
	"#4ecdc4",
	"#a78bfa",
	"#6bcb77",
	"#ff5a8a",
];

export function Confetti() {
	const pieces = useMemo(
		() =>
			Array.from({ length: 60 }, (_, i) => ({
				id: i,
				left: Math.random() * 100,
				delay: Math.random() * 0.4,
				duration: 1.8 + Math.random() * 2,
				color: COLORS[i % COLORS.length],
				size: 6 + Math.random() * 8,
				rotate: Math.random() * 360,
			})),
		[],
	);

	return (
		<div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
			{pieces.map((p) => (
				<motion.div
					key={p.id}
					initial={{ y: -40, x: `${p.left}vw`, opacity: 1, rotate: 0 }}
					animate={{
						y: "110vh",
						opacity: [1, 1, 0],
						rotate: p.rotate,
					}}
					transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
					style={{
						position: "absolute",
						left: `${p.left}%`,
						width: p.size,
						height: p.size,
						background: p.color,
						borderRadius: p.id % 2 ? "50%" : "4px",
					}}
				/>
			))}
		</div>
	);
}
