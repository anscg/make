import type { ReactNode } from "react"

// One image of a character. Sizes are design units (see geometry.ts); the
// default avatar in the Figma frame is 331 x 541 sitting at the scene's
// bottom-left corner, and offsets nudge other poses to line up with it.
export type AvatarSpec = {
  src: string
  width: number
  height: number
  offsetX?: number
  offsetY?: number
}

export type Character = {
  id: string
  name: string
  // Name tag fill. Defaults to the design's pink.
  color?: string
  // Keyed by emotion — "neutral", "happy", "shocked", whatever the script
  // asks for. A missing emotion falls back to `defaultEmotion`.
  avatars: Record<string, AvatarSpec>
  defaultEmotion?: string
}

export type DialogVars = Record<string, string | number | boolean | undefined>

export type DialogContext = {
  vars: DialogVars
  setVar: (key: string, value: DialogVars[string]) => void
  // Node ids visited so far, oldest first.
  history: string[]
}

export type Choice = {
  label: string
  next?: string
  onSelect?: (ctx: DialogContext) => void
}

export type PopupSpec = {
  title?: ReactNode
  body?: ReactNode
  confirm?: string
  // Escape hatch for anything richer than title/body/confirm. Call
  // `close()` to continue the script.
  render?: (api: { close: () => void; ctx: DialogContext }) => ReactNode
}

// Handed to a node's `panel` renderer. `go()` continues the script — to an
// explicit node, or to the node's own `next` when called with no argument.
export type PanelApi = {
  go: (next?: string) => void
  ctx: DialogContext
}

export type DialogNode = {
  id: string
  // Character id. Omit to keep the previous speaker.
  speaker?: string
  emotion?: string
  // "\n" forces a line break; `{{var}}` is replaced from ctx.vars; `[wobble]…[/wobble]`
  // and `[shake]…[/shake]` animate letters; `[count]83%[/count]` rolls a number
  // up from zero (see textEffects.ts).
  text?: string | ((ctx: DialogContext) => string)
  // Shown once the text has finished revealing. A node with choices does not
  // advance on click — the choice decides where to go.
  choices?: Choice[]
  // Opens after the text is acknowledged (or immediately if there is no
  // text), then continues to `next`.
  popup?: PopupSpec
  // Free-form UI shown once the text has finished revealing — a form, a
  // strip of buttons, anything. Like choices, it owns the advance: the stage
  // stops advancing on click until the panel calls `go()`.
  panel?: (api: PanelApi) => ReactNode
  // Where to go on advance. Omit to end the script.
  next?: string | ((ctx: DialogContext) => string | undefined)
  // Milliseconds to wait after the reveal before advancing on its own.
  autoAdvance?: number
  onEnter?: (ctx: DialogContext) => void
}

export type DialogScript = {
  start: string
  nodes: DialogNode[]
}

export type DialogPhase = "revealing" | "idle" | "popup" | "done"
