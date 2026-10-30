import { z } from "zod";

export const BOARD_ELEMENT_KINDS = [
  "person",
  "object",
  "table",
  "door",
  "window",
  "light",
  "vehicle",
  "tree",
  "building",
  "water",
] as const;

export const CAMERA_MOVEMENTS = [
  "static",
  "pan-left",
  "pan-right",
  "tilt-up",
  "tilt-down",
  "push-in",
  "pull-out",
  "track-left",
  "track-right",
  "handheld",
] as const;

export const BoardElementSchema = z.object({
  kind: z.enum(BOARD_ELEMENT_KINDS).catch("object"),
  /** Short on-frame label, e.g. a character name. */
  label: z.string().max(40).default(""),
  /** Position as a percentage of the frame (0 left/top, 100 right/bottom). */
  x: z.coerce.number().min(0).max(100).catch(50),
  y: z.coerce.number().min(0).max(100).catch(70),
  /** Relative size, 1 (small/far) to 6 (fills the frame). */
  scale: z.coerce.number().min(1).max(6).catch(2),
  facing: z.enum(["left", "right", "camera", "away"]).catch("camera").default("camera"),
});

export const StoryboardPanelSchema = z.object({
  shotType: z.string().min(1).max(60),
  cameraAngle: z.string().max(60).default("eye level"),
  movement: z.enum(CAMERA_MOVEMENTS).catch("static"),
  setting: z.enum(["interior", "exterior"]).catch("interior"),
  time: z.enum(["day", "night"]).catch("day"),
  /** Horizon / floor line as a percentage of frame height. */
  horizon: z.coerce.number().min(20).max(80).catch(55),
  elements: z.array(BoardElementSchema).max(10),
  /** What the audience sees and what happens in this frame. */
  caption: z.string().min(1).max(300),
  dialogue: z.string().max(240).default(""),
});

export type StoryboardPanel = z.infer<typeof StoryboardPanelSchema>;
export type BoardElement = z.infer<typeof BoardElementSchema>;

export const StoryboardSchema = z.object({
  panels: z.array(StoryboardPanelSchema).min(1).max(10),
});

export type Storyboard = z.infer<typeof StoryboardSchema>;
