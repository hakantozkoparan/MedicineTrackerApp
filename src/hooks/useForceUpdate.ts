import { useCallback, useState } from 'react';

/**
 * Hook that forces a component to re-render when called
 * Useful for scenarios where we need to manually trigger re-renders
 */
export const useForceUpdate = () => {
  const [, setTick] = useState(0);
  
  const forceUpdate = useCallback(() => {
    setTick(tick => tick + 1);
  }, []);
  
  return forceUpdate;
};
