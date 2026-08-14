---
name: Premium Digital Exchange
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4ae176'
  on-secondary: '#003915'
  secondary-container: '#00b954'
  on-secondary-container: '#004119'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system establishes a high-trust, high-energy environment for a peer-to-peer marketplace. It targets a tech-savvy demographic that values efficiency and digital security. The aesthetic is a fusion of **Corporate Modern** reliability and **Glassmorphism** depth, creating a premium "fintech-forward" experience. 

The UI should evoke a sense of exclusivity and verified value. By utilizing a deep dark canvas, vibrant functional accents, and generous whitespace (or "darkspace"), the system communicates sophistication and modern financial utility.

## Colors
This design system utilizes a **Dark Mode** first approach to establish a premium, high-contrast atmosphere. 

- **Primary (Indigo):** Reserved for high-intent actions, primary buttons, and active states.
- **Success (Green):** Used exclusively for "Verified" statuses, savings amounts, and successful transactions to build trust.
- **Warning (Amber):** Dedicated to urgency, such as coupon expiration alerts or restricted usage warnings.
- **Background & Surface:** The foundation is a Deep Dark Navy. Surfaces use a slightly lighter slate to create a clear visual hierarchy of layered cards.

## Typography
The system relies on **Inter** to deliver a clean, systematic, and highly legible experience. 

- **Weight Strategy:** Use Bold (700) and ExtraBold (800) for headlines to create a strong "market" feel. 
- **Scale:** Maintain high contrast between headlines and body text to guide users through complex data sets. 
- **Labels:** Use Medium (500) or SemiBold (600) for secondary metadata and status tags to ensure they remain readable at small sizes.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a standard 12-column system for desktop and a 4-column system for mobile.

- **Rhythm:** An 8px linear scale governs all padding and margins.
- **Containers:** Content should be housed in "2xl" rounded containers with a maximum width of 1280px for desktop.
- **Padding:** Use generous internal padding within cards (minimum 24px) to maintain a premium, uncluttered feel similar to high-end fintech apps.

## Elevation & Depth
Depth is achieved through a combination of **Tonal Layering** and **Ambient Shadows**.

- **Z-Index 0:** Deep Dark Navy (#0F172A) background.
- **Z-Index 1 (Cards):** Surface Navy (#1E293B) with a subtle 1px border (#334155).
- **Shadows:** Use large, soft, diffused shadows (Blur: 30px, Opacity: 25%) with a slight Y-offset to make cards appear to float.
- **Interactivity:** On hover, cards should slightly lift (decrease Y-offset) and the border-color should transition to the Primary Indigo at low opacity.

## Shapes
The shape language is defined by extremely smooth, oversized corners to evoke a modern, friendly marketplace feel.

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers (Cards):** Use `rounded-2xl` (1.5rem / 24px) for all primary content modules.
- **Badges/Chips:** Use fully pill-shaped (9999px) containers for status tags (Unique, Restricted, etc.) to differentiate them from functional buttons.

## Components
- **Buttons:** Primary buttons use solid Indigo with white text. Secondary buttons use a ghost style with an Indigo border and transparent background.
- **Marketplace Cards:** Feature a prominent "Verified" badge in Success Green in the top-right. The coupon value should use `headline-lg`.
- **Status Tags:** 
  - *Universal:* Primary Indigo background with 10% opacity and solid Indigo text.
  - *Unique:* Success Green background with 10% opacity and solid Green text.
  - *Restricted:* Warning Amber background with 10% opacity and solid Amber text.
- **Wallet Counters:** Displayed in a semi-transparent glass container with a subtle background blur and a vibrant Indigo glow effect.
- **Search Bar:** Large, full-width inputs with a `surface` background color and a search icon in the `text-secondary` color. Focus state triggers a 1px Indigo border glow.
- **Trust Badges:** Compact, circular icons with a Success Green checkmark, always paired with "Verified" label text.