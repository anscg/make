"use client"

import { motion } from "motion/react"
import { POPUP, SCENE, u } from "./geometry"
import type { DialogContext, PopupSpec } from "./types"

type Props = {
  spec: PopupSpec
  ctx: DialogContext
  onClose: () => void
}

export function Popup({ spec, ctx, onClose }: Props) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex items-center justify-center"
      // Centred in the room above the bubble rather than over it.
      style={{ background: "rgba(20, 16, 10, 0.45)", paddingBottom: u(SCENE.height * 0.55) }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      onClick={(event) => event.stopPropagation()}
    >
      <motion.div
        role="dialog"
        aria-modal
        className="relative font-fredoka text-white"
        style={{
          width: u(POPUP.width),
          maxWidth: "94%",
          borderRadius: u(POPUP.radius),
          background: POPUP.fill,
          padding: u(POPUP.padding),
          transformOrigin: "50% 100%",
        }}
        initial={{ scale: 0.6, y: 60, rotate: -3, opacity: 0 }}
        animate={{ scale: 1, y: 0, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 20, opacity: 0, transition: { duration: 0.14 } }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
      >
        {spec.render ? (
          spec.render({ close: onClose, ctx })
        ) : (
          <div className="flex flex-col" style={{ gap: u(22) }}>
            {spec.title && (
              <h2 className="m-0 font-semibold" style={{ fontSize: u(POPUP.titleSize), lineHeight: 1.2 }}>
                {spec.title}
              </h2>
            )}
            {spec.body && (
              <div className="font-medium text-white/85" style={{ fontSize: u(POPUP.bodySize), lineHeight: 1.35 }}>
                {spec.body}
              </div>
            )}
            <div className="flex justify-end" style={{ marginTop: u(8) }}>
              <motion.button
                type="button"
                autoFocus
                className="font-semibold text-white outline-none"
                style={{
                  fontSize: u(POPUP.buttonSize),
                  lineHeight: 1.2,
                  padding: `${u(14)} ${u(40)}`,
                  borderRadius: u(100),
                  background: POPUP.accent,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                onClick={onClose}
              >
                {spec.confirm ?? "Got it"}
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
