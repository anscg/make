"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useAnimationControls, useAnimationFrame, useReducedMotion } from "motion/react"
import { ARROW, BODY_TEXT, BUBBLE, NAME_TAG, u } from "./geometry"
import { buildWobblePath, WOBBLE_CANVAS } from "./wobble"
import { RevealText } from "./RevealText"
import type { Character } from "./types"

type Props = {
  character?: Character
  text: string
  revealKey: number
  skipped: boolean
  showArrow: boolean
  onRevealComplete: () => void
}

const SPRING = { type: "spring", stiffness: 380, damping: 24 } as const

// The generator's canvas is padded so the wobble has room to breathe; map its
// inner rectangle onto the bubble box and let the SVG overflow.
const scaleX = BUBBLE.width / (WOBBLE_CANVAS.width - 2 * WOBBLE_CANVAS.pad)
const scaleY = BUBBLE.height / (WOBBLE_CANVAS.height - 2 * WOBBLE_CANVAS.pad)
const canvasStyle = {
  left: u(-WOBBLE_CANVAS.pad * scaleX),
  top: u(-WOBBLE_CANVAS.pad * scaleY),
  width: u(WOBBLE_CANVAS.width * scaleX),
  height: u(WOBBLE_CANVAS.height * scaleY),
}
const initialPath = buildWobblePath(0)

// The edge morphs at well under one cycle per second, so 30 updates/s is
// indistinguishable from 60 and halves the raster work — every `d` change
// re-tessellates and repaints the whole bubble area at device resolution.
const WOBBLE_INTERVAL_MS = 1000 / 30

function WobbleShape() {
  const ref = useRef<SVGPathElement>(null)
  const lastFrame = useRef(0)
  const reduced = useReducedMotion()
  useAnimationFrame((time) => {
    if (reduced || time - lastFrame.current < WOBBLE_INTERVAL_MS) return
    lastFrame.current = time
    ref.current?.setAttribute("d", buildWobblePath(time / 1000))
  })
  return (
    <svg
      aria-hidden
      // Its own compositor layer, so the per-frame repaint stays inside this
      // rectangle instead of invalidating the text and background around it.
      className="absolute overflow-visible will-change-transform"
      style={canvasStyle}
      viewBox={`0 0 ${WOBBLE_CANVAS.width} ${WOBBLE_CANVAS.height}`}
      preserveAspectRatio="none"
    >
      <path ref={ref} d={initialPath} fill={BUBBLE.fill} />
    </svg>
  )
}

function NameTag({ character }: { character?: Character }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {character && (
        <motion.div
          key={character.id}
          className="absolute flex justify-center whitespace-nowrap font-fredoka font-medium text-white"
          style={{
            left: u(NAME_TAG.left),
            top: u(NAME_TAG.top),
            minWidth: u(NAME_TAG.minWidth),
            height: u(NAME_TAG.height),
            padding: `${u(NAME_TAG.paddingTop)} ${u(NAME_TAG.paddingX)} 0`,
            borderRadius: u(NAME_TAG.radius),
            fontSize: u(NAME_TAG.fontSize),
            lineHeight: NAME_TAG.lineHeight,
            background: character.color ?? NAME_TAG.fill,
            transformOrigin: "20% 100%",
          }}
          initial={{ scale: 0, rotate: 8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: -8, opacity: 0, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
        >
          {character.name}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Arrow({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute flex items-center justify-center"
          style={{ right: u(ARROW.right), bottom: u(ARROW.bottom), width: u(ARROW.width), height: u(ARROW.height) }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 520, damping: 18 }}
        >
          <motion.svg
            className="shrink-0 overflow-visible"
            style={{ width: u(ARROW.pathWidth), height: u(ARROW.pathHeight), rotate: ARROW.rotate }}
            viewBox={`0 0 ${ARROW.pathWidth} ${ARROW.pathHeight}`}
            aria-hidden
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity, delay: 0.3 }}
          >
            <path
              d="M4.66215 0C-1.44709 0.403369 -0.266408 5.88222 1.08759 8.57122C3.74143 11.5964 9.79652 18.2853 12.7861 20.8399C15.7758 23.3945 18.7979 21.9043 19.9353 20.8399C22.4266 17.9828 28.0593 11.5292 30.6589 8.57122C34.0385 1.84864 29.9007 0.0560002 27.4093 0C19.2853 1.84868 11.1614 1.84868 4.66215 0Z"
              fill={ARROW.fill}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


// Body copy reads best on two lines. RevealText reserves layout up front, so
// the wrap can be measured before the words have animated in: step the type
// down towards the floor until it fits in two lines. Copy that cannot get
// there even at the floor goes back to full size and lets `text-wrap: balance`
// even out its three lines instead.
const MAX_LINES = 2

function countLines(box: HTMLElement) {
  let lines = 0
  for (const paragraph of box.querySelectorAll("p")) {
    const tops = new Set(
      [...paragraph.querySelectorAll<HTMLElement>("span.inline-block")].map((span) =>
        Math.round(span.getBoundingClientRect().top),
      ),
    )
    lines += tops.size
  }
  return lines
}

function useFittedFontSize(text: string) {
  const ref = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(BODY_TEXT.fontSize)

  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    let candidate = BODY_TEXT.fontSize
    for (;;) {
      box.style.fontSize = u(candidate)
      if (countLines(box) <= MAX_LINES) break
      if (candidate <= BODY_TEXT.minFontSize) {
        candidate = BODY_TEXT.fontSize
        break
      }
      candidate = Math.max(candidate - BODY_TEXT.fontStep, BODY_TEXT.minFontSize)
    }
    // Leave the winning size on the element: if it matches the current state
    // React will not re-render, so nothing else would put it back.
    box.style.fontSize = u(candidate)
    setFontSize(candidate)
  }, [text])

  return { ref, fontSize }
}

export function SpeechBubble({ character, text, revealKey, skipped, showArrow, onRevealComplete }: Props) {
  const controls = useAnimationControls()
  const first = useRef(true)

  // A small bounce every time a new line lands, so the bubble reads as
  // "speaking" rather than as a static panel whose text changed.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    controls.start({ scale: [0.975, 1], transition: { type: "spring", stiffness: 600, damping: 16 } })
  }, [revealKey, controls])

  const handleComplete = useCallback(() => onRevealComplete(), [onRevealComplete])
  const { ref: textRef, fontSize: textSize } = useFittedFontSize(text)

  return (
    <motion.div
      className="pointer-events-auto absolute"
      style={{
        left: u(BUBBLE.left),
        top: u(BUBBLE.top),
        width: u(BUBBLE.width),
        height: u(BUBBLE.height),
        transformOrigin: "50% 100%",
      }}
      initial={{ scale: 0.6, y: 60, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ ...SPRING, delay: 0.1 }}
    >
      <motion.div className="relative size-full" animate={controls}>
        <WobbleShape />
        <NameTag character={character} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            ref={textRef}
            className="text-center font-fredoka font-semibold text-white [text-wrap:balance] [word-break:break-word]"
            style={{
              width: u(BODY_TEXT.width),
              fontSize: u(textSize),
              lineHeight: BODY_TEXT.lineHeight,
            }}
          >
            <div key={revealKey}>
              <RevealText text={text} skipped={skipped} onComplete={handleComplete} />
            </div>
          </div>
        </div>
        <Arrow show={showArrow} />
      </motion.div>
    </motion.div>
  )
}
