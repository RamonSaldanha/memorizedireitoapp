import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { usePreferencesStore } from '../stores/preferencesStore';

const BELL = require('../../assets/audio/bell-win.wav');

export function useSuccessSound() {
  const player = useAudioPlayer(BELL);

  const play = useCallback(() => {
    if (!usePreferencesStore.getState().successSoundEnabled) return;
    try {
      player.seekTo(0);
      player.volume = 0.7;
      player.play();
    } catch {
      // silently fail (web compat / asset missing)
    }
  }, [player]);

  return { play };
}
