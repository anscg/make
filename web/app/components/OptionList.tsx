"use client"

import { motion } from "motion/react"
import type { ReactNode } from "react"
import { u } from "@/app/components/dialog/geometry"

// Duolingo-style single-choice list: cards with a light grey border and a
// thicker bottom edge that sinks when pressed, light blue when selected. Sizes are design units
// (`--dlg-u`, 1px when unset). Styling lives in globals.css under .dlg-option
// so the designer can tune it in one place.
// `icon` is optional; pass a filled single-colour glyph (e.g. a Heroicons
// solid icon). It inherits the card's text colour, so it turns blue with it.
export type Option = { value: string; label: ReactNode; icon?: ReactNode }

type Props = {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  // "column" is the Duolingo list. "wrap" lays equal cards in centred rows,
  // for tight spaces like the onboarding strip.
  layout?: "column" | "wrap"
  // With "wrap", fix the number of cards per row so a set that would
  // otherwise leave one orphan on the last line reads as a grid instead.
  columns?: number
  // Stagger the cards in on mount. Off by default so it also works as a
  // plain form control.
  animate?: boolean
  className?: string
}

export function OptionList({
  options,
  value,
  onChange,
  layout = "column",
  columns,
  animate = false,
  className = "",
}: Props) {
  const wrap = layout === "wrap"
  const cardWidth =
    wrap && columns !== undefined ? `calc((100% - ${u(12 * (columns - 1))}) / ${columns})` : undefined
  return (
    <div
      role="listbox"
      className={`flex w-full ${wrap ? "flex-wrap justify-center" : "flex-col"} ${className}`}
      style={{ gap: u(12), maxWidth: wrap ? (columns ? u(1000) : undefined) : u(600) }}
    >
      {options.map((option, i) => (
        // The entrance runs on a wrapper so the card's own transform stays
        // free for the CSS press-down; an inline transform would override it.
        <motion.div
          key={option.value}
          className={wrap ? "" : "w-full"}
          style={{ width: cardWidth }}
          initial={animate ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animate ? 0.3 + i * 0.05 : 0, type: "spring", stiffness: 420, damping: 30 }}
        >
          <button
            type="button"
            role="option"
            aria-selected={value === option.value}
            className={`dlg-option ${wrap ? "dlg-option-card" : ""} ${cardWidth ? "dlg-option-grid" : ""}`}
            style={{
              padding: wrap ? `${u(11)} ${u(cardWidth ? 20 : 28)}` : `${u(16)} ${u(20)}`,
              minWidth: wrap ? u(200) : undefined,
              width: cardWidth ? "100%" : undefined,
              fontSize: u(24),
              borderRadius: u(16),
              borderWidth: u(2),
            }}
            onClick={(event) => {
              event.stopPropagation()
              onChange(option.value)
            }}
          >
            {option.icon && (
              <span aria-hidden className="dlg-option-icon" style={{ width: u(28), height: u(28) }}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        </motion.div>
      ))}
    </div>
  )
}
