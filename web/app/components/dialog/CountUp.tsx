"use client"

import { useEffect, type CSSProperties } from "react"
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import { parseCount } from "./textEffects"

// A number that rolls up from zero to the value written in the script, so
// "[count]83%[/count]" reads 0% → 83%. The digits ease out so the last few
// ticks are legible, then the figure pops once it lands. The final text sits
// underneath, invisible, to reserve its width — the line never reflows.
const DURATION = 0.9
const EASE: [number, number, number, number] = [0.25, 1, 0.5, 1]
const POP_SCALE = 1.2
const POP_SPRING = { type: "spring", stiffness: 600, damping: 16 } as const

export const COUNT_DURATION = DURATION

type Props = {
  text: string
  // Seconds until the word this sits in starts revealing.
  delay: number
  skipped: boolean
  className?: string
  style?: CSSProperties
}

export function CountUp({ text, delay, skipped, className, style }: Props) {
  const spec = parseCount(text)
  const reduced = useReducedMotion()
  const instant = skipped || reduced === true || !spec
  const target = spec?.value ?? 0
  const decimals = spec?.decimals ?? 0
  const value = useMotionValue(instant ? target : 0)
  const scale = useMotionValue(1)
  const digits = useTransform(value, (v) => v.toFixed(decimals))

  useEffect(() => {
    if (instant) {
      value.set(target)
      return
    }
    let pop: { stop: () => void } | undefined
    const roll = animate(value, target, {
      duration: DURATION,
      ease: EASE,
      delay,
      onComplete: () => {
        scale.set(POP_SCALE)
        pop = animate(scale, 1, POP_SPRING)
      },
    })
    return () => {
      roll.stop()
      pop?.stop()
    }
  }, [instant, target, delay, value, scale])

  if (!spec) return <>{text}</>

  return (
    // Inline style, not a class: an effect class like .dlg-fx-wobble sets
    // display: inline-block and would flatten the two stacked cells.
    <span className={className} style={{ ...style, display: "inline-grid" }}>
      <span className="col-start-1 row-start-1 select-none opacity-0">{text}</span>
      <motion.span
        aria-hidden
        className="col-start-1 row-start-1"
        // A prefix ("$") holds still while digits grow to its right; a bare
        // number or a suffix ("%") reads better anchored right, like an odometer.
        style={{ scale, transformOrigin: "50% 60%", textAlign: spec.prefix ? "left" : "right" }}
      >
        {spec.prefix}
        <motion.span>{digits}</motion.span>
        {spec.suffix}
      </motion.span>
    </span>
  )
}
