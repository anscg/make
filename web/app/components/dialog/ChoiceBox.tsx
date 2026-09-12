"use client"

import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { CHOICES, u } from "./geometry"
import type { Choice } from "./types"

type Props = {
  choices: Choice[]
  selected: number
  onSelect: (index: number) => void
  onChoose: (index: number) => void
}

export function ChoiceBox({ choices, selected, onSelect, onChoose }: Props) {
  const [pressed, setPressed] = useState<number | null>(null)
  // The highlight tracks the pointer, so it has to clear when the pointer
  // leaves the card entirely — keyboard focus brings it back.
  const [active, setActive] = useState(false)

  // Arrow keys are handled by the stage, not by focus, so the highlight has to
  // come back on its own when someone switches from the mouse to the keyboard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") setActive(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <motion.div
      className="pointer-events-auto absolute flex items-center justify-center"
      style={{ right: u(CHOICES.right), bottom: u(CHOICES.bottom) }}
      initial={{ scale: 0.4, opacity: 0, y: 40, rotate: CHOICES.rotate + 10 }}
      animate={{ scale: 1, opacity: 1, y: 0, rotate: CHOICES.rotate }}
      exit={{ scale: 0.8, opacity: 0, y: 12, transition: { duration: 0.14 } }}
      transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.9 }}
    >
      <div
        role="listbox"
        aria-label="Responses"
        aria-activedescendant={`dialog-choice-${selected}`}
        className="flex flex-col items-start overflow-hidden"
        onPointerLeave={() => {
          setActive(false)
          setPressed(null)
        }}
        style={{
          width: "max-content",
          minWidth: u(CHOICES.minWidth),
          maxWidth: u(CHOICES.maxWidth),
          borderRadius: u(CHOICES.radius),
          background: CHOICES.fill,
          transformOrigin: "0% 100%",
        }}
      >
        {choices.map((choice, i) => (
          <motion.button
            key={`${i}-${choice.label}`}
            id={`dialog-choice-${i}`}
            role="option"
            aria-selected={selected === i}
            type="button"
            className="relative flex w-full items-center text-left font-fredoka font-semibold text-white outline-none [word-break:break-word]"
            style={{
              padding: `${u(CHOICES.itemPaddingY)} ${u(CHOICES.itemPaddingX)}`,
              fontSize: u(CHOICES.fontSize),
              lineHeight: CHOICES.lineHeight,
              // The dashed divider is a static border on the row so the
              // highlight sliding underneath never nudges it.
              borderBottom:
                i < choices.length - 1
                  ? `max(1px, ${u(1)}) dashed ${CHOICES.divider}`
                  : "none",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 26, delay: i * 0.04 }}
            onPointerEnter={() => {
              setActive(true)
              onSelect(i)
            }}
            onPointerDown={() => setPressed(i)}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed((p) => (p === i ? null : p))}
            onFocus={() => {
              setActive(true)
              onSelect(i)
            }}
            onBlur={() => {
              setActive(false)
              setPressed((p) => (p === i ? null : p))
            }}
            onClick={(event) => {
              event.stopPropagation()
              onChoose(i)
            }}
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${CHOICES.highlight}, transparent)`,
              }}
              initial={false}
              animate={{ opacity: active && selected === i ? 1 : 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            />
            <motion.span
              className="relative"
              // The nudge is in design units, so it rides a custom property
              // rather than a px `x` that would not scale with the stage.
              style={{ x: "calc(var(--dlg-u, 1px) * var(--dlg-nudge, 0))" }}
              initial={false}
              animate={
                {
                  "--dlg-nudge": pressed === i ? -6 : active && selected === i ? 10 : 0,
                } as never
              }
              transition={{ type: "spring", stiffness: 700, damping: 24, mass: 0.6 }}
            >
              {choice.label}
            </motion.span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
