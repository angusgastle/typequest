"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Keyboard layout rows. `finger` maps a key to the finger that presses it.
// fingers: lp=left pinky, lr=left ring, lm=left middle, li=left index,
//          ri=right index, rm=right middle, rr=right ring, rp=right pinky, th=thumb
interface KeyDef {
	label: string;
	code: string;
	finger: string;
	home?: boolean;
	w?: number; // width multiplier
}

const ROWS: KeyDef[][] = [
	[
		{ label: "Q", code: "KeyQ", finger: "lp" },
		{ label: "W", code: "KeyW", finger: "lr" },
		{ label: "E", code: "KeyE", finger: "lm" },
		{ label: "R", code: "KeyR", finger: "li" },
		{ label: "T", code: "KeyT", finger: "li" },
		{ label: "Y", code: "KeyY", finger: "ri" },
		{ label: "U", code: "KeyU", finger: "ri" },
		{ label: "I", code: "KeyI", finger: "rm" },
		{ label: "O", code: "KeyO", finger: "rr" },
		{ label: "P", code: "KeyP", finger: "rp" },
	],
	[
		{ label: "A", code: "KeyA", finger: "lp", home: true },
		{ label: "S", code: "KeyS", finger: "lr", home: true },
		{ label: "D", code: "KeyD", finger: "lm", home: true },
		{ label: "F", code: "KeyF", finger: "li", home: true },
		{ label: "G", code: "KeyG", finger: "li", home: true },
		{ label: "H", code: "KeyH", finger: "ri", home: true },
		{ label: "J", code: "KeyJ", finger: "ri", home: true },
		{ label: "K", code: "KeyK", finger: "rm", home: true },
		{ label: "L", code: "KeyL", finger: "rr", home: true },
		{ label: ";", code: "Semicolon", finger: "rp", home: true },
	],
	[
		{ label: "Z", code: "KeyZ", finger: "lp" },
		{ label: "X", code: "KeyX", finger: "lr" },
		{ label: "C", code: "KeyC", finger: "lm" },
		{ label: "V", code: "KeyV", finger: "li" },
		{ label: "B", code: "KeyB", finger: "li" },
		{ label: "N", code: "KeyN", finger: "ri" },
		{ label: "M", code: "KeyM", finger: "ri" },
		{ label: ",", code: "Comma", finger: "rm" },
		{ label: ".", code: "Period", finger: "rr" },
	],
];

const FINGER_COLORS: Record<string, string> = {
	lp: "#ff6b6b",
	lr: "#ffd93d",
	lm: "#6bcb77",
	li: "#4ecdc4",
	ri: "#74c7ec",
	rm: "#a78bfa",
	rr: "#ff5a8a",
	rp: "#ff8e3c",
	th: "#c0c0c0",
};

interface KeyboardProps {
	nextChar: string | null; // the character to press next
	pressedChar: string | null; // last pressed (for pop animation)
	state: "correct" | "wrong" | null;
}

function charToKey(char: string | null): KeyDef | null {
	if (!char) return null;
	const c = char === " " ? " " : char;
	for (const row of ROWS) {
		for (const k of row) {
			if (k.label.toLowerCase() === c.toLowerCase()) return k;
		}
	}
	if (c === " ") return { label: " ", code: "Space", finger: "th" };
	return null;
}

export function Keyboard({ nextChar, pressedChar, state }: KeyboardProps) {
	const targetKey = charToKey(nextChar);
	const pressedKey = charToKey(pressedChar);

	const activeFinger = targetKey?.finger ?? null;

	return (
		<div className="w-full">
			<div className="mx-auto max-w-3xl">
				{/* Outlined hands above the home row */}
				<Hands activeFinger={activeFinger} />

				<div className="rounded-3xl bg-gradient-to-b from-ink/5 to-white/40 p-3 md:p-4 border-2 border-white shadow-inner">
					<div className="space-y-2">
						{ROWS.map((row, i) => (
							<div key={i} className="flex justify-center gap-1 md:gap-1.5">
								{row.map((key) => {
									const isNext =
										targetKey?.label === key.label &&
										key.label.toLowerCase() === (nextChar ?? "").toLowerCase();
									const isPressed =
										pressedKey?.label === key.label && key.label !== " ";
									const highlight = activeFinger && key.finger === activeFinger;
									return (
										<motion.div
											key={key.code}
											animate={
												isNext
													? { scale: [1, 1.15, 1.05], y: [0, -2, 0] }
													: isPressed
														? { scale: [1, 0.85, 1] }
														: { scale: 1, y: 0 }
											}
											transition={{ duration: 0.2 }}
											className={cn(
												"grid place-items-center rounded-xl font-display font-bold select-none border-2 transition-colors",
												key.home
													? "bg-coral/10 border-coral/40"
													: "bg-white border-white",
												state === "wrong" && isPressed
													? "bg-red-500 text-white border-red-700"
													: state === "correct" && isPressed
														? "bg-leaf/40 border-leaf"
														: "",
												isNext && "ring-4 ring-sunny",
											)}
											style={{
												width: "clamp(28px, 9vw, 44px)",
												height: "clamp(34px, 10vw, 52px)",
												fontSize: "clamp(12px, 3.5vw, 18px)",
												color:
													highlight && !isNext
														? FINGER_COLORS[key.finger]
														: undefined,
											}}
										>
											{key.label.toUpperCase()}
										</motion.div>
									);
								})}
							</div>
						))}
						{/* Space bar */}
						<div className="flex justify-center pt-1">
							<motion.div
								animate={
									targetKey?.code === "Space"
										? { scale: [1, 1.02, 1] }
										: { scale: 1 }
								}
								className={cn(
									"grid h-10 place-items-center rounded-2xl bg-white border-2 font-display font-bold text-sm select-none",
									targetKey?.code === "Space"
										? "border-sunny ring-4 ring-sunny/50"
										: "border-white",
								)}
								style={{ width: "60%" }}
							>
								space
							</motion.div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Stylized outlined hands sitting over the home row, showing proper position. */
function Hands({ activeFinger }: { activeFinger: string | null }) {
	return (
		<div className="relative mx-auto mb-[-12px] w-full max-w-3xl px-4">
			<svg
				viewBox="0 0 600 120"
				className="w-full"
				role="img"
				aria-label="Hand position guide"
			>
				<defs>
					<linearGradient id="handL" x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stopColor="#ff8e8e" />
						<stop offset="100%" stopColor="#ff6b6b" />
					</linearGradient>
					<linearGradient id="handR" x1="1" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#3fd4cb" />
						<stop offset="100%" stopColor="#4ecdc4" />
					</linearGradient>
				</defs>

				{/* Left hand */}
				<g
					transform="translate(40,10)"
					style={{
						transformOrigin: "left center",
						transform:
							activeFinger && activeFinger.startsWith("l")
								? "translate(40px,10px) translateY(-4px)"
								: "translate(40px,10px)",
						transition: "transform 0.15s ease-out",
					}}
				>
					<ellipse
						cx="80"
						cy="70"
						rx="100"
						ry="40"
						fill="url(#handL)"
						opacity="0.25"
					/>
					<path
						d="M0,80 Q0,40 40,40 L120,40 Q160,40 160,80 L160,110 L0,110 Z"
						fill="url(#handL)"
						opacity="0.45"
						stroke="#c44545"
						strokeWidth="3"
						strokeLinejoin="round"
						strokeDasharray="6 5"
					/>
					{["lp", "lr", "lm", "li"].map((f, i) => (
						<FingerPip
							key={f}
							cx={20 + i * 35}
							cy={45}
							active={activeFinger === f}
						/>
					))}
				</g>

				{/* Right hand */}
				<g
					transform="translate(300,10)"
					style={{
						transform:
							activeFinger && activeFinger.startsWith("r")
								? "translate(300px,10px) translateY(-4px)"
								: "translate(300px,10px)",
						transition: "transform 0.15s ease-out",
					}}
				>
					<ellipse
						cx="80"
						cy="70"
						rx="100"
						ry="40"
						fill="url(#handR)"
						opacity="0.25"
					/>
					<path
						d="M0,80 Q0,40 40,40 L120,40 Q160,40 160,80 L160,110 L0,110 Z"
						fill="url(#handR)"
						opacity="0.45"
						stroke="#2c8a82"
						strokeWidth="3"
						strokeLinejoin="round"
						strokeDasharray="6 5"
					/>
					{["ri", "rm", "rr", "rp"].map((f, i) => (
						<FingerPip
							key={f}
							cx={20 + i * 35}
							cy={45}
							active={activeFinger === f}
						/>
					))}
				</g>
			</svg>
		</div>
	);
}

function FingerPip({
	cx,
	cy,
	active,
}: {
	cx: number;
	cy: number;
	active: boolean;
}) {
	return (
		<motion.circle
			cx={cx}
			cy={cy}
			r={active ? 7 : 4}
			animate={{ opacity: active ? 1 : 0.5 }}
			fill="white"
			stroke={active ? "#2d2a4a" : "none"}
			strokeWidth={2}
		/>
	);
}
