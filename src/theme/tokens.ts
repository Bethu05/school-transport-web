/**
 * Central visual design tokens for the School Transport Platform.
 *
 * All brand, operational-status, dashboard, transparency, gradient
 * and shadow values should live here rather than being scattered
 * through individual pages.
 */

export const colors = {
  brand: {
    champagneGold: '#C9A55C',
    lightGold: '#E1C47A',
    bronze: '#9E7B36',
    deepBronze: '#A67F39',
  },

  neutral: {
    graphite950: '#121417',
    graphite900: '#17191D',
    graphite875: '#181A1D',
    graphite850: '#181B1F',
    graphite825: '#191C20',
    graphite800: '#1D2024',
    graphite775: '#202328',
    graphite750: '#22252A',
    graphite700: '#272A30',

    charcoal: '#1A1C20',

    white: '#FFFFFF',

    ivory: '#F5F1E8',
    paper: '#FFFDF8',
    warmPaper: '#F9F4E9',
    warmCanvas: '#F8F3E9',

    warmMap: '#EEE6D6',
    warmMapSoft: '#F9F5EB',

    warmHeroMid: '#F7F1E4',
    warmHeroEnd: '#EDE1C8',

    darkHeroEnd: '#302A1E',
  },

  status: {
    success: '#5F9471',
    warning: '#C28A3D',
    danger: '#C35E58',
    inactive: '#85898F',
    muted: '#8C8070',
  },

  trip: {
    active: '#65A77C',
    delayed: '#C36A63',
    lowPriority: '#718775',
  },

  dashboard: {
    tripsAccent: '#D8B768',
    vehiclesAccent: '#B3904D',
    driversAccent: '#8C8070',
    studentsAccent: '#AE9565',

    readinessMuted: '#8E806B',
    previewText: '#9B8352',

    heroTextDark: '#E3C77F',
    heroTextLight: '#80612D',

    liveMapLabel: '#D4B267',

    mapMarkerPrimary: '#C9A55C',
    mapMarkerSecondary: '#9D824D',
    mapMarkerMuted: '#807565',
  },
} as const;

export const alpha = {
  gold09: 'rgba(201,165,92,0.09)',
  gold10: 'rgba(201,165,92,0.10)',
  gold11: 'rgba(201,165,92,0.11)',
  gold15: 'rgba(201,165,92,0.15)',
  gold16: 'rgba(201,165,92,0.16)',
  gold17: 'rgba(201,165,92,0.17)',

  heroGold18: 'rgba(222,190,112,0.18)',
  heroBronze17: 'rgba(135,105,49,0.17)',

  heroGlow24: 'rgba(214,184,111,0.24)',
  heroGlow0: 'rgba(214,184,111,0)',

  lightGold25: 'rgba(225,196,122,0.25)',
  lightGold18: 'rgba(225,196,122,0.18)',

  bronze20: 'rgba(158,123,54,0.20)',

  success10: 'rgba(95,148,113,0.10)',
  success20: 'rgba(95,148,113,0.20)',

  danger10: 'rgba(195,94,88,0.10)',
  warning10: 'rgba(194,138,61,0.10)',

  white055: 'rgba(255,255,255,0.055)',
  white065: 'rgba(255,255,255,0.065)',
  white08: 'rgba(255,255,255,0.08)',

  warmBorder10: 'rgba(58,49,34,0.10)',
  warmLine10: 'rgba(84,73,55,0.10)',
  warmLine09: 'rgba(84,73,55,0.09)',

  mapMarker15: 'rgba(157,130,77,0.15)',
  mapWarm20: 'rgba(120,93,43,0.20)',
} as const;

export const gradients = {
  metricCardDark: `
    linear-gradient(
      145deg,
      #1C1F23 0%,
      #181A1D 100%
    )
  `,

  metricCardLight: `
    linear-gradient(
      145deg,
      #FFFDF8 0%,
      #F9F4E9 100%
    )
  `,

  dashboardHeroDark: `
    linear-gradient(
      120deg,
      #191C20 0%,
      #22252A 62%,
      #302A1E 100%
    )
  `,

  dashboardHeroLight: `
    linear-gradient(
      120deg,
      #FFFDF8 0%,
      #F7F1E4 60%,
      #EDE1C8 100%
    )
  `,

  liveMapDark: `
    radial-gradient(
      circle at 20% 30%,
      rgba(201,165,92,0.10),
      transparent 30%
    ),
    linear-gradient(
      145deg,
      #16191D,
      #202328
    )
  `,

  liveMapLight: `
    radial-gradient(
      circle at 20% 30%,
      rgba(201,165,92,0.16),
      transparent 30%
    ),
    linear-gradient(
      145deg,
      #EEE6D6,
      #F9F5EB
    )
  `,
} as const;

export const shadows = {
  metricCardDark:
    '0 18px 38px rgba(0,0,0,0.25)',

  metricCardLight:
    '0 18px 36px rgba(78,62,33,0.09)',
} as const;

/**
 * Convenience grouped export.
 *
 * Components may import either:
 *
 *   import { tokens } from './tokens'
 *
 * or individual groups:
 *
 *   import { colors } from './tokens'
 */
export const tokens = {
  colors,
  alpha,
  gradients,
  shadows,
} as const;

export type DesignTokens =
  typeof tokens;
