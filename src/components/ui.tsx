import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "sun";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-coral text-white shadow-[0_6px_0_#c44545] hover:bg-coral-light border-b-4 border-[#c44545]",
  secondary:
    "bg-teal text-white shadow-[0_6px_0_#3aa9a1] hover:bg-[#3fd4cb] border-b-4 border-[#3aa9a1]",
  sun:
    "bg-sunny text-ink shadow-[0_6px_0_#e0a800] hover:bg-[#ffe066] border-b-4 border-[#e0a800]",
  ghost:
    "bg-white/70 text-ink hover:bg-white border-b-4 border-black/10",
};

const sizes = {
  sm: "px-4 py-2 text-sm rounded-xl",
  md: "px-6 py-3 text-base rounded-2xl",
  lg: "px-8 py-4 text-lg rounded-2xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.93, y: 4 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "font-display font-bold border-x-2 border-t-2 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-sunny/60 disabled:opacity-50 disabled:cursor-not-allowed select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white/80 backdrop-blur rounded-[2rem] border-2 border-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold font-display text-sm",
        className
      )}
    >
      {children}
    </span>
  );
}
