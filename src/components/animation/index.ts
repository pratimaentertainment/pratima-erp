import { type Variants } from 'framer-motion';

export const FADE_IN_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }
};

export const SLIDE_UP_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2, ease: 'easeIn' } }
};

export const SCALE_IN_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: 'easeIn' } }
};

export const DRAWER_VARIANTS = {
  left: {
    hidden: { x: '-100%' },
    visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
    exit: { x: '-100%', transition: { type: 'spring', damping: 25, stiffness: 200 } }
  },
  right: {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
    exit: { x: '100%', transition: { type: 'spring', damping: 25, stiffness: 200 } }
  }
};
