import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { usePreferencesStore } from '../stores/preferencesStore';

// Os mesmos sons da web (resources/js/lib/sounds.ts), gravados em arquivo: duas notas subindo
// no acerto e um arpejo curto no fim da fase. Respeitam a preferência de som do Perfil.
const CORRECT = require('../../assets/audio/correct.wav');
const PHASE_COMPLETE = require('../../assets/audio/phase-complete.wav');

export function useGameSounds() {
  const correct = useAudioPlayer(CORRECT);
  const complete = useAudioPlayer(PHASE_COMPLETE);

  const play = useCallback((player: typeof correct) => {
    if (!usePreferencesStore.getState().successSoundEnabled) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Sem som não atrapalha o jogo
    }
  }, []);

  return {
    playCorrect: useCallback(() => play(correct), [correct, play]),
    playPhaseComplete: useCallback(() => play(complete), [complete, play]),
  };
}
