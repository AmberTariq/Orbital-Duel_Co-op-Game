import { useEffect, useRef } from 'react';

export function useGameLoop(callback: (delta: number) => void) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback reference updated on every render so state closures are always fresh
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== null && previousTimeRef.current !== undefined) {
        // Cap deltaTime to 64ms to prevent physics explosions on lag spikes / tab switches
        const deltaTime = Math.min(time - previousTimeRef.current, 64);
        callbackRef.current(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
}

