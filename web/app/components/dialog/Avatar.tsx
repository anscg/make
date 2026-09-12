"use client"

import Image from "next/image"
import { AnimatePresence, motion } from "motion/react"
import type { Character } from "./types"
import { u } from "./geometry"

type Props = {
  character: Character
  emotion?: string
  talking: boolean
}

const FLOAT = {
  y: [0, -7, 0],
  rotate: [0, 0.7, 0, -0.7, 0],
}

export function Avatar({ character, emotion, talking }: Props) {
  const key = emotion && character.avatars[emotion] ? emotion : character.defaultEmotion ?? Object.keys(character.avatars)[0]
  const spec = character.avatars[key]
  if (!spec) return null

  return (
    <motion.div
      // Click-through: the character overlaps the bubble and any panel below it.
      className="pointer-events-none absolute bottom-0 left-0 z-10"
      style={{ width: u(spec.width), height: u(spec.height), transformOrigin: "50% 100%" }}
      initial={{ y: 80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 1.1 }}
    >
      <motion.div
        className="size-full"
        animate={FLOAT}
        transition={{ duration: 4.4, ease: "easeInOut", repeat: Infinity }}
      >
        {/* Squash-and-stretch from the feet while words are appearing. */}
        <motion.div
          className="size-full"
          style={{ transformOrigin: "50% 100%" }}
          animate={talking ? { scaleY: [1, 1.03, 1], scaleX: [1, 0.99, 1] } : { scaleY: 1, scaleX: 1 }}
          transition={
            talking
              ? { duration: 0.3, ease: "easeInOut", repeat: Infinity }
              : { type: "spring", stiffness: 300, damping: 18 }
          }
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={key}
              className="absolute"
              style={{
                left: u(spec.offsetX ?? 0),
                top: u(spec.offsetY ?? 0),
                width: u(spec.width),
                height: u(spec.height),
                transformOrigin: "50% 100%",
              }}
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 420, damping: 20 }}
            >
              <Image
                src={spec.src}
                alt={character.name}
                fill
                priority
                sizes="(max-width: 1280px) 30vw, 420px"
                className="pointer-events-none select-none object-contain"
                draggable={false}
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
