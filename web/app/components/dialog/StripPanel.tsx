"use client"

import { motion, type Variants } from "motion/react"
import type { ReactNode } from "react"
import { u } from "./geometry"

// The full-width "strip window" from the onboarding slides: a slanted cyan
// band with a drifting checkered weave, a white plate with clipped corners, a
// message on top and controls below. Vertical sizes are design units of the
// 1920x1080 slide; the corner cuts and side padding are a share of the stage
// width so the shape keeps its angle and the content never runs into a cut.
// The band anchors to the stage bottom and grows upward when its content
// wraps, so its distance to the speech bubble never changes.
export const STRIP = {
  bottom: 427,
  minHeight: 355,
  plateInset: 10,
  cutWidthPct: (298 / 1920) * 100,
  cutHeightPct: (120 / 1920) * 100, // of the width, to keep the diagonal's angle
  messageTop: 39,
  messageSize: 24,
  messageLineHeight: 1.2,
  paddingBottom: 31, // with the Confirm shell border, lands the band at 355
  controlsTop: 207,
  checkerSize: 100,
  checkerAngle: 10.96,
}

const SPRING = { type: "spring", stiffness: 210, damping: 24, mass: 1 } as const
const FULL_CLIP = "inset(0% 0% 0% 0%)"

const panelVariants: Variants = {
  hidden: { clipPath: FULL_CLIP, opacity: 1 },
  show: { clipPath: FULL_CLIP, opacity: 1 },
  // Shutters closed: top and bottom edges race to the middle, then it is gone.
  exit: {
    clipPath: "inset(50% 0% 50% 0%)",
    opacity: 0,
    transition: {
      clipPath: { duration: 0.26, ease: [0.55, 0, 1, 0.45] },
      opacity: { duration: 0.06, delay: 0.22 },
    },
  },
}

const bandVariants: Variants = {
  hidden: { x: "-100%", skewX: -16 },
  show: { x: 0, skewX: 0, transition: SPRING },
}

const plateVariants: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { ...SPRING, stiffness: 240, delay: 0.06 } },
}

const sheenVariants: Variants = {
  hidden: { x: "-60%", opacity: 0 },
  show: { x: "160%", opacity: [0, 0.55, 0], transition: { duration: 0.7, delay: 0.3, ease: "easeOut" } },
}

const messageVariants: Variants = {
  hidden: { y: 18, opacity: 0, scale: 0.96 },
  show: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 26, delay: 0.24 } },
}

const controlsVariants: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.3, staggerChildren: 0.07 } },
}

export const panelItemVariants: Variants = {
  hidden: { scale: 0.5, y: 46, opacity: 0, rotate: -4 },
  show: { scale: 1, y: 0, opacity: 1, rotate: 0, transition: { type: "spring", stiffness: 520, damping: 20, mass: 0.9 } },
}

// Wrap each control so it pops in on the panel's stagger.
export function PanelItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={`flex justify-center ${className}`} variants={panelItemVariants} style={{ transformOrigin: "50% 100%" }}>
      {children}
    </motion.div>
  )
}

// "Make" set in Borel, as the slides do.
export function MakeWord() {
  return (
    <span className="font-borel" style={{ lineHeight: 1 }}>
      Make
    </span>
  )
}

type Props = {
  message?: ReactNode
  children?: ReactNode
  // Where the controls start, as a y within the band on the slide (assumes a
  // one-line message). Content that wraps pushes them down and grows the band.
  controlsTop?: number
}

export function StripPanel({ message, children, controlsTop = STRIP.controlsTop }: Props) {
  const messageHeight = message ? STRIP.messageSize * STRIP.messageLineHeight : 0
  const sidePadding = `${STRIP.cutWidthPct}cqw`
  const cut = STRIP.cutWidthPct
  const cutH = STRIP.cutHeightPct

  return (
    <motion.div
      className="absolute inset-x-0 z-[5]"
      style={{ bottom: u(STRIP.bottom), minHeight: u(STRIP.minHeight) }}
      initial="hidden"
      animate="show"
      exit="exit"
      variants={panelVariants}
      onClick={(event) => event.stopPropagation()}
    >
      {/* Band: base tone, drifting checker weave, cyan gradient over it. Wider
          than the stage so the spring's overshoot never shows an edge. */}
      <motion.div
        className="absolute inset-y-0 overflow-hidden"
        style={{ left: "-10%", right: "-10%", background: "#01A5FE" }}
        variants={bandVariants}
      >
        <div aria-hidden className="absolute" style={{ inset: "-60% -20%", rotate: `${STRIP.checkerAngle}deg` }}>
          <div
            className="dlg-checker-drift absolute"
            style={{
              // One extra tile period on each side so the loop never shows a seam.
              inset: `0 ${u(-STRIP.checkerSize * 2)}`,
              backgroundImage: "repeating-conic-gradient(#01BBFE 0 25%, transparent 0 50%)",
              backgroundSize: `${u(STRIP.checkerSize * 2)} ${u(STRIP.checkerSize * 2)}`,
            }}
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(1, 206, 242, 0) 0%, rgba(1, 206, 242, 0.7) 100%)" }}
        />
      </motion.div>

      {/* Plate: white with the two clipped corners. The shadow lives on the
          wrapper so the clip does not cut it off. */}
      <motion.div
        className="absolute inset-x-0"
        style={{
          top: u(STRIP.plateInset),
          bottom: u(STRIP.plateInset),
          filter: `drop-shadow(0 0 ${u(5)} rgba(0, 0, 0, 0.25))`,
          transformOrigin: "0% 50%",
        }}
        variants={plateVariants}
      >
        <div
          className="relative size-full overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #FFFFFF 0%, #F3F3F3 100%)",
            clipPath: `polygon(${cut}cqw 0, 100% 0, 100% calc(100% - ${cutH}cqw), calc(100% - ${cut}cqw) 100%, 0 100%, 0 ${cutH}cqw)`,
          }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-[28%]"
            style={{
              background: "linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)",
              skewX: -18,
            }}
            variants={sheenVariants}
          />
        </div>
      </motion.div>

      <div
        className="relative flex flex-col"
        style={{ padding: `${u(STRIP.messageTop)} ${sidePadding} ${u(STRIP.paddingBottom)}` }}
      >
        {message && (
          <motion.p
            className="m-0 text-center font-fredoka font-medium text-black"
            style={{ fontSize: u(STRIP.messageSize), lineHeight: STRIP.messageLineHeight }}
            variants={messageVariants}
          >
            {message}
          </motion.p>
        )}

        {children && (
          <motion.div
            className="flex flex-wrap items-start justify-center"
            style={{ marginTop: u(controlsTop - STRIP.messageTop - messageHeight), gap: u(24) }}
            variants={controlsVariants}
          >
            {children}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
