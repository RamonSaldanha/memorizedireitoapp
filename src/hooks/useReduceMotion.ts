import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** "Reduzir movimento" do sistema, como o `prefers-reduced-motion` da web. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => alive && setReduce(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);

    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
