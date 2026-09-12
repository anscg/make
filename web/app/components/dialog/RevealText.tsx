"use client"

import { Fragment, useEffect, useMemo } from "react"
import { motion } from "motion/react"
import { CountUp, COUNT_DURATION } from "./CountUp"
import { COUNT_EFFECT, parseEffects, splitWords, TEXT_EFFECTS, type Word } from "./textEffects"

// Words, not letters: each word scales down into place on an expo-style ease
// with no positional movement. Layout is reserved up front (hidden words
// still take space) so the line never reflows while it appears.
const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1]
const DURATION = 0.4
// The fade is near-instant; the scale carries the motion. A soft white glow
// flares in with the fade and dies away over the rest of the landing.
const FADE_DURATION = 0.05
const GLOW_DURATION = 0.3
const GLOW_ON = "0 0 0.18em rgba(255, 255, 255, 0.55)"
const GLOW_OFF = "0 0 0em rgba(255, 255, 255, 0)"
const STAGGER = 0.12
const FROM_SCALE = 1.35
// Extra beats after punctuation, so the cadence reads like speech: a breath
// at a comma, a full stop at the end of a sentence.
const PAUSE_SHORT = 0.18 // , ; :
const PAUSE_LONG = 0.38 // . ! ? …

function pauseAfter(word: Word) {
  const text = word.chars.map((c) => c.char).join("").replace(/["')\]»]+$/, "")
  if (/(\.{3}|…|[.!?])$/.test(text)) return PAUSE_LONG
  if (/[,;:]$/.test(text)) return PAUSE_SHORT
  return 0
}

export const REVEAL_TIMING = { duration: DURATION, stagger: STAGGER }

type Props = {
  text: string
  // Render fully revealed with no animation.
  skipped: boolean
  onComplete: () => void
}

// Letters render one span each so a CSS effect can phase per letter; a
// [count] run renders as one block instead, since its characters change.
type Segment =
  | { kind: "char"; char: string; effects: string[]; index: number }
  | { kind: "count"; text: string; effects: string[]; index: number }

function segment(word: Word): Segment[] {
  const out: Segment[] = []
  word.chars.forEach((c, index) => {
    const last = out[out.length - 1]
    if (!c.effects.includes(COUNT_EFFECT)) {
      out.push({ kind: "char", char: c.char, effects: c.effects, index })
    } else if (last?.kind === "count" && last.effects.join() === c.effects.join()) {
      last.text += c.char
    } else {
      out.push({ kind: "count", text: c.char, effects: c.effects, index })
    }
  })
  return out
}

function hasCount(word: Word) {
  return word.chars.some((c) => c.effects.includes(COUNT_EFFECT))
}

type WordContentProps = { word: Word; offset: number; delay: number; skipped: boolean }

function WordContent({ word, offset, delay, skipped }: WordContentProps) {
  if (word.chars.every((c) => c.effects.length === 0)) {
    return <>{word.chars.map((c) => c.char).join("")}</>
  }
  return (
    <>
      {segment(word).map((seg) => {
        const className = seg.effects.map((e) => TEXT_EFFECTS[e]).join(" ")
        const style = { ["--i" as string]: offset + seg.index }
        if (seg.kind === "count") {
          return (
            <CountUp key={seg.index} text={seg.text} delay={delay} skipped={skipped} className={className} style={style} />
          )
        }
        return seg.effects.length ? (
          <span key={seg.index} className={className} style={style}>
            {seg.char}
          </span>
        ) : (
          <Fragment key={seg.index}>{seg.char}</Fragment>
        )
      })}
    </>
  )
}

export function RevealText({ text, skipped, onComplete }: Props) {
  // The running letter count keeps an effect's phase rippling across word
  // boundaries instead of restarting per word.
  const { lines, totalMs } = useMemo(() => {
    const out: { word: Word; delay: number; offset: number }[][] = []
    // Each word starts one stagger after the previous, plus that word's pause.
    // A rolling number may still be ticking after the last word has landed,
    // so the reveal is not complete until it has too.
    const counters = { delay: 0, letters: 0, last: 0, countEnd: 0 }
    for (const line of text.split("\n")) {
      const words = splitWords(parseEffects(line)).map((word) => {
        const entry = { word, delay: counters.delay, offset: counters.letters }
        counters.last = counters.delay
        if (hasCount(word)) counters.countEnd = Math.max(counters.countEnd, counters.delay + COUNT_DURATION)
        counters.delay += STAGGER + pauseAfter(word)
        counters.letters += word.chars.length
        return entry
      })
      out.push(words)
    }
    const empty = out.every((line) => line.length === 0)
    return { lines: out, totalMs: empty ? 0 : Math.max(counters.last + DURATION, counters.countEnd) * 1000 }
  }, [text])

  useEffect(() => {
    if (skipped || totalMs === 0) {
      onComplete()
      return
    }
    const id = window.setTimeout(onComplete, totalMs)
    return () => window.clearTimeout(id)
  }, [skipped, totalMs, onComplete])

  return (
    <>
      {lines.map((words, lineIndex) => (
        <p key={lineIndex} className="m-0">
          {words.map(({ word, delay, offset }, wordIndex) => (
            <Fragment key={`${lineIndex}-${wordIndex}`}>
              {wordIndex > 0 && " "}
              <motion.span
                className="inline-block"
                style={{ transformOrigin: "50% 60%" }}
                initial={skipped ? false : { opacity: 0, scale: FROM_SCALE, textShadow: GLOW_OFF }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  textShadow: skipped ? GLOW_OFF : [GLOW_OFF, GLOW_ON, GLOW_OFF],
                }}
                transition={{
                  scale: { duration: DURATION, ease: EASE, delay: skipped ? 0 : delay },
                  opacity: { duration: FADE_DURATION, ease: "linear", delay: skipped ? 0 : delay },
                  textShadow: {
                    duration: GLOW_DURATION,
                    times: [0, FADE_DURATION / GLOW_DURATION, 1],
                    ease: "easeOut",
                    delay: skipped ? 0 : delay,
                  },
                }}
              >
                <WordContent word={word} offset={offset} delay={delay} skipped={skipped} />
              </motion.span>
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}
