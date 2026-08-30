/**
 * Shared framer-motion variants + a reduced-motion helper.
 * Import `useMotion()` in a component to get variants that automatically
 * collapse to no-ops when the user prefers reduced motion.
 */
import { useReducedMotion } from 'framer-motion';

export const spring = { type: 'spring', stiffness: 320, damping: 30 };
export const springSoft = { type: 'spring', stiffness: 210, damping: 26 };

export const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: springSoft },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
};

export const slideInLeft = {
  hidden: { x: '-100%' },
  show: { x: 0, transition: spring },
  exit: { x: '-100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

export const backdrop = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const staggerParent = {
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } },
};

export const cardHover = {
  rest: { y: 0 },
  hover: { y: -4, transition: { duration: 0.2 } },
  tap: { scale: 0.985 },
};

const NONE = { hidden: {}, show: {}, exit: {}, rest: {}, hover: {}, tap: {} };

/**
 * Returns motion variants, neutralised if the user prefers reduced motion.
 */
export function useMotion() {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      reduce,
      fadeInUp: NONE,
      scaleIn: NONE,
      slideInLeft: NONE,
      backdrop,
      staggerParent: {},
      cardHover: NONE,
    };
  }
  return { reduce, fadeInUp, scaleIn, slideInLeft, backdrop, staggerParent, cardHover };
}
