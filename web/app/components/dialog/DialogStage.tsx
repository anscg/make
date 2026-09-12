"use client"

import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { SCENE, u } from "./geometry"
import { useDialog } from "./useDialog"
import { Avatar } from "./Avatar"
import { SpeechBubble } from "./SpeechBubble"
import { ChoiceBox } from "./ChoiceBox"
import { Popup } from "./Popup"
import type { Character, DialogScript, DialogVars } from "./types"

type Props = {
  script: DialogScript
  characters: Character[]
  vars?: DialogVars
  onComplete?: () => void
  // Rendered in place of the scene once the script ends.
  renderDone?: (api: { restart: () => void }) => ReactNode
  // Fraction of the stage the scene may take up, width-wise and height-wise.
  // The smaller of the two wins so the picture never crops.
  fit?: { width: number; height: number }
  bottom?: number
  // Horizontal nudge of the scene from centre, in design units.
  offsetX?: number
  className?: string
  children?: ReactNode
}

export function DialogStage({
  script,
  characters,
  vars,
  onComplete,
  renderDone,
  fit = { width: 0.94, height: 0.5 },
  bottom = 40,
  offsetX = 0,
  className = "",
  children,
}: Props) {
  const dialog = useDialog(script, { characters, vars, onComplete })
  const { node, phase } = dialog
  // Keyboard/hover selection, keyed to the node it belongs to so a new line
  // starts back at the first choice without an effect.
  const [selection, setSelection] = useState({ revealKey: dialog.revealKey, index: 0 })
  const selected = selection.revealKey === dialog.revealKey ? selection.index : 0
  const setSelected = useCallback(
    (index: number | ((s: number) => number)) =>
      setSelection((s) => {
        const current = s.revealKey === dialog.revealKey ? s.index : 0
        return { revealKey: dialog.revealKey, index: typeof index === "function" ? index(current) : index }
      }),
    [dialog.revealKey]
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return
      const choices = phase === "idle" ? node.choices ?? [] : []
      // A panel's own controls are real buttons; leave the keyboard to them.
      if (phase === "idle" && node.panel) return

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (!choices.length) return
        event.preventDefault()
        const step = event.key === "ArrowDown" ? 1 : -1
        setSelected((s) => (s + step + choices.length) % choices.length)
        return
      }
      if (/^[1-9]$/.test(event.key) && choices.length) {
        const i = Number(event.key) - 1
        if (i < choices.length) dialog.choose(i)
        return
      }
      if (event.key === "Enter" || event.key === " ") {
        if (phase === "popup") return
        event.preventDefault()
        if (choices.length) dialog.choose(selected)
        else dialog.advance()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [dialog, node, phase, selected, setSelected])

  const showChoices = phase === "idle" && !!node.choices?.length
  const showPanel = phase === "idle" && !!node.panel
  const showArrow = phase === "idle" && !node.choices?.length && !node.panel
  const showPopup = phase === "popup" && !!node.popup

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={`relative select-none overflow-hidden ${className}`}
        style={{
          containerType: "size",
          // One design unit in px — see geometry.ts. Container units keep it
          // tied to the stage rather than the viewport.
          ["--dlg-u" as string]: `min(calc(${fit.width * 100}cqw / ${SCENE.width}), calc(${fit.height * 100}cqh / ${SCENE.height}))`,
        }}
        onClick={phase === "done" ? undefined : dialog.advance}
      >
        {children}

        {/* Panels sit below the scene (z-10) so the character overlaps them. */}
        <AnimatePresence>
          {showPanel && (
            <Fragment key={`panel-${dialog.revealKey}`}>
              {node.panel!({ go: dialog.go, ctx: dialog.ctx })}
            </Fragment>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase !== "done" && (
            <motion.div
              key="scene"
              // Composited separately from whatever the caller paints behind
              // it, so the floating avatar and wobbling bubble never force
              // the (often full-screen) background to repaint. Above panels,
              // so the character stands in front of them — and click-through,
              // so its empty area never blocks a panel's controls; the bubble
              // and choice box opt back in.
              className="pointer-events-none absolute left-1/2 z-10 will-change-transform"
              style={{
                width: u(SCENE.width),
                height: u(SCENE.height),
                bottom: u(bottom),
                marginLeft: u(offsetX),
                x: "-50%",
              }}
              exit={{ y: 80, opacity: 0, transition: { duration: 0.25, ease: "easeIn" } }}
            >
              <SpeechBubble
                character={dialog.character}
                text={dialog.text}
                revealKey={dialog.revealKey}
                skipped={dialog.skipped}
                showArrow={showArrow}
                onRevealComplete={dialog.finishReveal}
              />
              {/* After the bubble so the character stands in front of it, as in the design. */}
              {dialog.character && (
                <Avatar
                  character={dialog.character}
                  emotion={dialog.emotion}
                  talking={phase === "revealing"}
                />
              )}
              <AnimatePresence>
                {showChoices && (
                  <ChoiceBox
                    key={`choices-${dialog.revealKey}`}
                    choices={node.choices!}
                    selected={selected}
                    onSelect={setSelected}
                    onChoose={dialog.choose}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPopup && (
            <Popup key={`popup-${dialog.revealKey}`} spec={node.popup!} ctx={dialog.ctx} onClose={dialog.closePopup} />
          )}
        </AnimatePresence>

        {phase === "done" && renderDone && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.2 }}
          >
            {renderDone({ restart: dialog.restart })}
          </motion.div>
        )}
      </div>
    </MotionConfig>
  )
}
