"use client"

import { motion } from "motion/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { u } from "@/app/components/dialog/geometry"

// The chunky 3D button from the slides, replicated from the Figma "Invite!"
// button (fallout file, node 4543-23): a 343 x 158 frame with a white stroke
// outside it and a soft drop shadow, a glossy gradient face 10 shorter than
// the frame, and the face's hard 10-unit drop shadow forming the bevel it
// sinks onto when pressed. Every measurement is a share of the frame height,
// so one `height` reproduces the design at any size. Heights and widths are
// design units (`--dlg-u`, 1px when unset) like the rest of the dialog.
export const GAME_BUTTON_DESIGN = {
  height: 158,
  // Drawn outside the frame, as in Figma, so the rendered box is one stroke
  // larger on every side than `height` and `width`.
  shellStroke: 5,
  shellShadowY: 3,
  shellShadowBlur: 10,
  radius: 31,
  bevel: 10,
  faceStroke: 4,
  fontSize: 64,
  // Outside the glyphs.
  textStroke: 4,
  textShadowY: 3,
  // The room either side of "Invite!" (177 wide) in its 343 frame, used when
  // a button hugs its label instead of taking a fixed width.
  paddingX: 83,
}

const D = GAME_BUTTON_DESIGN
// A Figma measurement as its share of the button's height.
const share = (n: number) => `calc(var(--gb-h) * ${n} / ${D.height})`
// How far the face has sunk onto the bevel. The spring drives a 0..1 factor,
// because it cannot interpolate a calc() distance directly.
const sink = `calc(${share(D.bevel)} * var(--gb-press, 0))`

export type GameButtonSize = "lg" | "md" | "sm"
// Frame sizes from the onboarding slides at 85%, without the outside stroke.
export const GAME_BUTTON_SIZES: Record<GameButtonSize, { height: number; width?: number }> = {
  lg: { height: 88, width: 449 },
  md: { height: 71, width: 201 },
  sm: { height: 64 },
}

export type GameButtonColors = {
  faceTop: string
  faceBottom: string
  faceBorder: string
  bevel: string
  // Text outline and drop.
  ink: string
  shell: string
  text: string
}
export type GameButtonTone = "blue" | "pink"
export const GAME_BUTTON_TONES: Record<GameButtonTone, GameButtonColors> = {
  blue: {
    faceTop: "#20C7FF",
    faceBottom: "#1CB0F6",
    faceBorder: "rgba(32, 198, 255, 0.7)",
    bevel: "#2A96D3",
    ink: "#09476E",
    shell: "#FFFFFF",
    text: "#FFFFFF",
  },
  pink: {
    faceTop: "#FF6B99",
    faceBottom: "#FF427D",
    faceBorder: "rgba(255, 140, 175, 0.7)",
    bevel: "#C92C5D",
    ink: "#6E0F30",
    shell: "#FFFFFF",
    text: "#FFFFFF",
  },
}

type Props = {
  children: ReactNode
  onClick?: () => void
  size?: GameButtonSize
  // Frame height and width in design units; either overrides the preset.
  height?: number
  width?: number | "auto"
  tone?: GameButtonTone
  // Per-colour overrides on top of the tone.
  colors?: Partial<GameButtonColors>
  // Held down: the face stays sunk on the bevel. For toggles.
  selected?: boolean
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export function GameButton({
  children,
  onClick,
  size = "lg",
  height,
  width,
  tone = "blue",
  colors: overrides,
  selected = false,
  disabled = false,
  autoFocus,
  className = "",
}: Props) {
  const preset = GAME_BUTTON_SIZES[size]
  const frameHeight = height ?? preset.height
  const frameWidth = width === undefined ? preset.width : width === "auto" ? undefined : width
  const colors = { ...GAME_BUTTON_TONES[tone], ...overrides }
  const faceHeight = D.height - D.bevel

  // A light sweeps across the face when the button comes alive, so the eye is
  // drawn to the thing that just became possible. Keyed so a quick
  // disable/enable restarts it instead of being swallowed.
  const [sweep, setSweep] = useState(0)
  const wasDisabled = useRef(disabled)
  useEffect(() => {
    if (wasDisabled.current && !disabled) setSweep((n) => n + 1)
    wasDisabled.current = disabled
  }, [disabled])

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-pressed={selected || undefined}
      // A column, not the button default of centring content: the face must
      // sit flush under the top stroke so the bevel shows only beneath it.
      className={`relative flex flex-col shrink-0 select-none outline-none transition-opacity duration-200 disabled:opacity-60 ${className}`}
      style={{
        ["--gb-h" as string]: u(frameHeight),
        width: frameWidth === undefined ? "auto" : `calc(${u(frameWidth)} + ${share(2 * D.shellStroke)})`,
        // As max-width rather than min(): a percentage inside width: min()
        // counts as auto while a shrink-wrapping parent measures its content,
        // which left a fixed-width button at its label's width.
        maxWidth: "100%",
        height: share(D.height + 2 * D.shellStroke),
        padding: share(D.shellStroke),
      }}
      initial={false}
      animate={selected ? "selected" : "rest"}
      whileHover={disabled ? undefined : "hover"}
      whileTap={disabled ? undefined : "press"}
      whileFocus="hover"
      // The press factor lives here so the shell and the face, plain spans,
      // read the same value; the layout box itself never changes.
      variants={{
        rest: { "--gb-press": 0 },
        selected: { "--gb-press": 1 },
        hover: { scale: 1.035 },
        press: { scale: 0.985, "--gb-press": 1 },
      }}
      transition={{
        type: "spring",
        stiffness: 600,
        damping: 22,
        "--gb-press": { type: "spring", stiffness: 700, damping: 30 },
      }}
    >
      {/* The white stroke around face and bevel. It follows the face down, so
          a pressed button is the face with the same border sitting on the
          bevel, not a face sunk inside a taller frame. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0"
        style={{
          top: sink,
          borderRadius: share(D.radius + D.shellStroke),
          background: colors.shell,
          boxShadow: `0 ${share(D.shellShadowY)} ${share(D.shellShadowBlur)} rgba(0, 0, 0, 0.25)`,
        }}
      />
      {/* The face's hard drop shadow in Figma: its own shape, one bevel lower. */}
      <span
        aria-hidden
        className="absolute"
        style={{
          left: share(D.shellStroke),
          right: share(D.shellStroke),
          top: share(D.shellStroke + D.bevel),
          height: share(faceHeight),
          borderRadius: share(D.radius),
          background: colors.bevel,
        }}
      />
      <span
        className="relative flex items-center justify-center whitespace-nowrap text-center font-fredoka font-semibold"
        style={{
          height: share(faceHeight),
          padding: frameWidth === undefined ? `0 ${share(D.paddingX)}` : 0,
          borderRadius: share(D.radius),
          color: colors.text,
          background: `linear-gradient(180deg, ${colors.faceTop} 0%, ${colors.faceBottom} 100%)`,
          border: `${share(D.faceStroke)} solid ${colors.faceBorder}`,
          fontSize: share(D.fontSize),
          lineHeight: "normal",
          // Figma strokes the glyphs on the outside. A centred CSS stroke of
          // twice the width, painted under the fill, leaves the same outline.
          WebkitTextStroke: `${share(2 * D.textStroke)} ${colors.ink}`,
          paintOrder: "stroke fill",
          transform: `translateY(${sink})`,
          filter: selected ? "brightness(0.92)" : "none",
        }}
      >
        {/* Figma's hard drop is a copy of the stroked glyphs. text-shadow
            copies only the fill in Chrome, so the outline would swallow it;
            a drop-shadow filter copies what is actually painted. */}
        <span style={{ filter: `drop-shadow(0 ${share(D.textShadowY)} 0 ${colors.ink})` }}>{children}</span>
        {sweep > 0 && (
          <span
            key={sweep}
            aria-hidden
            className="gb-sweep-clip"
            // inset-0 is the padding box, so the clip's corner sits inside the
            // face stroke by one stroke width.
            style={{ borderRadius: share(D.radius - D.faceStroke) }}
          >
            <span className="gb-sweep" onAnimationEnd={() => setSweep(0)} />
          </span>
        )}
      </span>
    </motion.button>
  )
}
