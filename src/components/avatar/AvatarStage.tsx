import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { buildAvatarSvg, hasAvatar, normalizeAvatarConfig, type AvatarConfig } from '../../lib/avatar';
import { useAppearance } from '../../hooks/useAppearance';
import { colors } from '../../theme/colors';
import { AnimatedAvatar, HEADROOM } from './AnimatedAvatar';

type Props = {
  config?: Partial<AvatarConfig> | null;
  name?: string;
  // Anima o boneco a cada troca de peça ou de cor. Só o editor liga.
  animateChanges?: boolean;
  // Ação do canto superior direito: Editar no perfil, Sortear no editor.
  children?: React.ReactNode;
  style?: ViewStyle;
};

/** Espaço acima do boneco, o mesmo do `pt-6` da web. */
const TOP_SPACE = 24;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

/**
 * Palco do avatar, porte do `AvatarPreview.vue` da web.
 *
 * A cor de fundo escolhida pinta o palco **inteiro**, senão ela vira um selo no
 * meio de uma faixa cinza e a pessoa não consegue julgar a cor que escolheu.
 *
 * O boneco encosta no **pé** do palco: o tronco termina cortado por projeto, e
 * encostado na borda de baixo o corte some — o tronco simplesmente continua
 * para fora do cartão, aparado pelo `overflow: hidden` dos cantos redondos.
 *
 * Sem avatar salvo, o palco fica neutro com as iniciais no meio: pintar de uma
 * cor que a pessoa nunca escolheu seria inventar uma preferência.
 */
export function AvatarStage({ config, name, animateChanges = false, children, style }: Props) {
  const { width } = useWindowDimensions();
  const { isDark } = useAppearance();
  const drawn = hasAvatar(config);

  // 160 px, como o `w-40` da web, sem passar de 45% da tela.
  const size = Math.min(160, width * 0.45);
  const background = drawn ? normalizeAvatarConfig(config).background : isDark ? colors.gray[900] : colors.gray[50];
  const staticXml = useMemo(
    () => (drawn && !animateChanges ? buildAvatarSvg(config, { background: false }) : null),
    [drawn, animateChanges, config],
  );

  // A sobra do `AnimatedAvatar` para a cabeça esticada sai do espaço de cima, e
  // o palco parado e o animado ficam com a mesma altura.
  const headroom = animateChanges ? (size * HEADROOM) / 200 : 0;

  return (
    <View
      style={[
        styles.stage,
        drawn ? { justifyContent: 'flex-end', paddingTop: TOP_SPACE - headroom } : styles.stageEmpty,
        { backgroundColor: background },
        style,
      ]}
    >
      {drawn && config ? (
        animateChanges ? (
          <AnimatedAvatar config={config} size={size} />
        ) : (
          <SvgXml xml={staticXml} width={size} height={size} />
        )
      ) : (
        <View
          style={[
            styles.initials,
            { width: size, height: size, backgroundColor: isDark ? colors.gray[700] : colors.gray[200] },
          ]}
        >
          <Text style={[styles.initialsText, { color: isDark ? colors.background : colors.foreground }]}>
            {name ? getInitials(name) : '?'}
          </Text>
        </View>
      )}

      {children ? <View style={styles.action}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  stageEmpty: {
    justifyContent: 'center',
    paddingVertical: TOP_SPACE,
  },
  initials: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 30,
    fontWeight: '600',
  },
  action: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
