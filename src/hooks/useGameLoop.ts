import { useEffect, useRef } from 'react';

export function useGameLoop(callback: (delta: number) => void) {
  const requestRef = useRef<number>(null);
  const previousTimeRef = useRef<number>(null);

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
  }, []);
}
