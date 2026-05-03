import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Scale, BookOpen, Users, User, Shield, ShieldAlert, ShieldCheck,
  FileText, ScrollText, Receipt, DollarSign, Landmark, Gavel, Building2,
  Briefcase, Heart, Baby, Home, Car, Building, Globe, Lock,
  Book, BookMarked, Leaf, Coins, Truck, Plane, Hammer,
  Banknote, HeartHandshake, UserCheck, FileCheck,
  BadgeCheck, ClipboardList, Handshake, Award, Star,
  AlertCircle, Info, UserCog, FolderOpen, Network,
} from 'lucide-react-native';

// ─── Icon map (Lucide PascalCase name → component) ──────────────────────────

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Scale, BookOpen, Users, User, Shield, ShieldAlert, ShieldCheck,
  FileText, ScrollText, Receipt, DollarSign, Landmark, Gavel, Building2,
  Briefcase, Heart, Baby, Home, Car, Building, Globe, Lock,
  Book, BookMarked, Leaf, Coins, Truck, Plane, Hammer,
  Banknote, HeartHandshake, UserCheck, FileCheck,
  BadgeCheck, ClipboardList, Handshake, Award, Star,
  AlertCircle, Info, UserCog, FolderOpen, Network,
};

// ─── Color helpers (mirrors DisciplineBadge.vue) ────────────────────────────

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(Math.min(255, r + (255 - r) * amount))}, ${Math.round(Math.min(255, g + (255 - g) * amount))}, ${Math.round(Math.min(255, b + (255 - b) * amount))})`;
}

function tint(hex: string, opacity: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ─── Grey palette for locked state ──────────────────────────────────────────

const GREY = {
  outer: '#9CA3AF',
  band: '#E5E7EB',
  inner: '#D1D5DB',
  fill: '#F3F4F6',
  shieldBorder: '#D1D5DB',
  shieldFill: '#E5E7EB',
};

// ─── Sizes (mirrors sizeMap in the Vue component) ───────────────────────────

const SIZE_MD = {
  badge: 112,
  icon: 52,
  shieldW: 36,
  shieldH: 40,
  shieldOverflow: 8,
  shieldFontSize: 11,
};

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  icon: string;
  color: string;
  level?: number;
  locked?: boolean;
  isDark?: boolean;
};

export function DisciplineBadge({ icon, color, level = 1, locked = false, isDark = false }: Props) {
  const s = SIZE_MD;
  const IconComponent = ICON_MAP[icon] ?? BookOpen;
  const iconColor = locked ? '#9CA3AF' : (isDark ? '#E5E7EB' : '#1F2937');

  const shieldLeft = (s.badge - s.shieldW) / 2;

  const greyDark = { band: '#2D2D2D', fill: '#1F1F1F', shieldBorder: '#3A3A3A', shieldFill: '#2D2D2D' };

  const outerColor = locked ? GREY.outer : color;
  const bandFill   = locked ? (isDark ? greyDark.band  : GREY.band)  : (isDark ? tint(color, 0.18) : lighten(color, 0.82));
  const innerColor = locked ? GREY.inner : color;
  const innerFill  = locked ? (isDark ? greyDark.fill  : GREY.fill)  : (isDark ? tint(color, 0.10) : lighten(color, 0.93));

  const shieldOuterFill = locked ? (isDark ? greyDark.shieldBorder : GREY.shieldBorder) : (isDark ? lighten(color, 0.2) : lighten(color, 0.4));
  const shieldInnerFill = locked ? (isDark ? greyDark.shieldFill   : GREY.shieldFill)   : (isDark ? lighten(color, 0.5) : lighten(color, 0.7));
  const shieldStroke      = locked ? '#9CA3AF'          : color;

  return (
    <View style={{ width: s.badge, height: s.badge }}>
      {/* Concentric circles */}
      <Svg width={s.badge} height={s.badge} viewBox="0 0 112 112">
        {/* Outer thick ring */}
        <Circle cx={56} cy={56} r={53} fill="none" stroke={outerColor} strokeWidth={5} />
        {/* Middle light band */}
        <Circle cx={56} cy={56} r={48} fill={bandFill} />
        {/* Inner ring */}
        <Circle cx={56} cy={56} r={42} fill="none" stroke={innerColor} strokeWidth={2} />
        {/* Inner fill */}
        <Circle cx={56} cy={56} r={40} fill={innerFill} />
      </Svg>

      {/* Lucide icon overlay */}
      <View style={[StyleSheet.absoluteFillObject, styles.iconOverlay]}>
        {locked
          ? <Lock size={s.icon} color={iconColor} strokeWidth={1.5} />
          : <IconComponent size={s.icon} color={iconColor} strokeWidth={1.5} />
        }
      </View>

      {/* Shield with level */}
      <View style={[styles.shield, { left: shieldLeft, bottom: -s.shieldOverflow }]}>
        <Svg width={s.shieldW} height={s.shieldH} viewBox="0 0 36 40">
          {/* Outer shield */}
          <Path
            d="M18 1 L34 7 L34 18 Q34 32 18 39 Q2 32 2 18 L2 7 Z"
            fill={shieldOuterFill}
            stroke={shieldStroke}
            strokeWidth={1.5}
          />
          {/* Inner shield */}
          <Path
            d="M18 4.5 L31 9.5 L31 18 Q31 30 18 36 Q5 30 5 18 L5 9.5 Z"
            fill={shieldInnerFill}
            stroke={shieldStroke}
            strokeWidth={0.8}
          />
        </Svg>
        <Text style={[styles.shieldText, { fontSize: s.shieldFontSize }]}>{level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldText: {
    position: 'absolute',
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    paddingBottom: 1,
  },
});
