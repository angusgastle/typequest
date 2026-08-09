/**
 * Body anchor points for the character avatar.
 *
 * Every character SVG is authored against the same 160×160 canvas. These
 * anchors are the single source of truth for where accessories attach to the
 * body — draw accessories at these coordinates; the renderer simply stacks
 * the layers, so the art must match the anchor.
 *
 * Verified identical across all base bodies (base-boy, base-girl, base-curly,
 * base-ponytails, base-dark): head circle cx=80, cy=50, r=28; body rect
 * x=60, y=80, w=40, h=50; arms y=85 with left x=30 and right x=100.
 */
export const CANVAS_SIZE = 160;

export const BODY_ANCHORS = {
	/** Top of the head (head circle top edge). Hats sit here. */
	headTop: { x: 80, y: 22 },
	/** Center of the head (head circle center). */
	headCenter: { x: 80, y: 50 },
	/** Center of the torso. Outfits overlay this region. */
	bodyCenter: { x: 80, y: 105 },
	/** Left hand — tip of the left arm rect. */
	leftHand: { x: 45, y: 91 },
	/** Right hand — tip of the right arm rect. Weapons are held here. */
	rightHand: { x: 115, y: 91 },
} as const;

/**
 * The anchor each slot attaches to by default. Used as the drawing convention
 * for new accessories — draw the item so it sits at this anchor.
 */
export const SLOT_DEFAULT_ANCHOR = {
	base: null,
	hat: "headTop",
	outfit: "bodyCenter",
	weapon: "rightHand",
} as const;
