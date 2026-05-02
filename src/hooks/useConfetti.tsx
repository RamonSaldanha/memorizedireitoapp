import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

export function useConfetti() {
  const cannonRef = useRef<any>(null);
  const keyRef = useRef(0);
  const [renderKey, setRenderKey] = React.useState(0);

  const fire = useCallback(() => {
    keyRef.current += 1;
    setRenderKey(keyRef.current);
  }, []);

  const ConfettiView = useCallback(() => {
    if (renderKey === 0) return null;
    return (
      <View pointerEvents="none" style={styles.overlay}>
        <ConfettiCannon
          key={renderKey}
          ref={cannonRef}
          count={80}
          origin={{ x: width / 2, y: -10 }}
          explosionSpeed={350}
          fallSpeed={2200}
          fadeOut
          autoStart
        />
      </View>
    );
  }, [renderKey]);

  return { ConfettiView, fire };
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 200,
  },
});
