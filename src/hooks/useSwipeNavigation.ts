import { useState, useEffect, useRef } from 'react';

interface SwipeOptions {
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
  trackMouse?: boolean;
}

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export function useSwipeNavigation(handlers: SwipeHandlers, options: SwipeOptions = {}) {
  const {
    threshold = 50,
    preventDefaultTouchmoveEvent = false,
    trackMouse = false
  } = options;

  const [isSwiping, setIsSwiping] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const deltaPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    startPos.current = { x: clientX, y: clientY };
    setIsSwiping(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!startPos.current) return;

    deltaPos.current = {
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y
    };
  };

  const handleEnd = () => {
    if (!startPos.current) return;

    const { x, y } = deltaPos.current;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (Math.max(absX, absY) > threshold) {
      if (absX > absY) {
        // Horizontal swipe
        if (x > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (y > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    startPos.current = null;
    deltaPos.current = { x: 0, y: 0 };
    setIsSwiping(false);
  };

  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (preventDefaultTouchmoveEvent) {
        e.preventDefault();
      }
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    },
    onTouchEnd: () => {
      handleEnd();
    },
    ...(trackMouse && {
      onMouseDown: (e: React.MouseEvent) => {
        handleStart(e.clientX, e.clientY);
      },
      onMouseMove: (e: React.MouseEvent) => {
        if (isSwiping) {
          handleMove(e.clientX, e.clientY);
        }
      },
      onMouseUp: () => {
        if (isSwiping) {
          handleEnd();
        }
      },
      onMouseLeave: () => {
        if (isSwiping) {
          handleEnd();
        }
      }
    })
  };

  return {
    swipeHandlers,
    isSwiping,
    deltaX: deltaPos.current.x,
    deltaY: deltaPos.current.y
  };
}