---
name: CouponEx Design System
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f0eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#594139'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0ea'
  outline: '#8d7168'
  outline-variant: '#e1bfb5'
  surface-tint: '#ab3500'
  primary: '#ab3500'
  on-primary: '#ffffff'
  primary-container: '#ff6b35'
  on-primary-container: '#5f1900'
  inverse-primary: '#ffb59d'
  secondary: '#4f5e80'
  on-secondary: '#ffffff'
  secondary-container: '#c8d7fe'
  on-secondary-container: '#4e5d7f'
  tertiary: '#755b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#cea62b'
  on-tertiary-container: '#4f3d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbd0'
  primary-fixed-dim: '#ffb59d'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#832600'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#b7c6ed'
  on-secondary-fixed: '#0a1b39'
  on-secondary-fixed-variant: '#374667'
  tertiary-fixed: '#ffe08e'
  tertiary-fixed-dim: '#ecc246'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#584400'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  price-display:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system establishes a high-trust, utilitarian aesthetic tailored for the Indian peer-to-peer digital marketplace. It blends the clinical precision of modern fintech with the approachable warmth of a premium marketplace. 

The visual direction follows a **Minimalist-Structured** approach. It avoids the "cheapness" often associated with coupon sites by utilizing a sophisticated ivory-and-navy palette. The style is defined by physical clarity: 1px hairlines replace shadows, and intentional asymmetry provides a modern, editorial rhythm. Every screen must maintain a single, undeniable focal point to reduce cognitive load during financial transactions.

## Colors
This design system operates strictly in a light-mode environment to maximize legibility and trust. 

- **Base Surface:** #FAF7F0 (Warm Ivory). This is the background for all screens, providing a softer, more premium feel than pure white.
- **Card Surface:** #FFFFFF (Pure White). Used for interactive elements and content containers to create a distinct visual lift against the ivory base.
- **Primary Accent:** #FF6B35 (Bright Orange). Reserved exclusively for Primary CTAs, discount percentages, and critical "Save" values.
- **Verification:** #C9A227 (Muted Gold). Dedicated to "Verified Seller" badges and trust-related iconography.
- **Core Text/UI:** #0B1C3A (Deep Navy). Used for all body text, icons, and the bottom navigation bar for high-contrast accessibility.

## Typography
The typography system uses a tri-font approach to differentiate between brand presence, UI clarity, and data accuracy.

1.  **Headlines (Inter):** Set with semi-bold weights and tight letter-spacing for a "confident" fintech appearance.
2.  **Body & UI (Geist):** A clean, modern grotesque used for all descriptive text, labels, and navigation. 
3.  **Data & Prices (JetBrains Mono):** All currency values (₹), discount codes, and expiry dates must use this monospaced font to ensure tabular alignment and a "technical" sense of precision.

Maintain strict hierarchy by using `label-caps` for metadata headers (e.g., "EXPIRY DATE") and `display-lg` for value propositions.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. On mobile, use a 4-column grid with 20px margins. On desktop, a 12-column grid capped at 1200px.

**Asymmetry & Rhythm:**
- Avoid perfect symmetry in marketing sections. For example, a "featured coupon" card might span 7 columns while the descriptive text spans 4, leaving a 1-column intentional gap.
- Use a base-8 spacing scale. 
- Content blocks should be separated by large vertical gaps (`stack-lg`) to maintain the "one focal point" philosophy.

## Elevation & Depth
This design system rejects shadows and blurs. Depth is communicated strictly through **Tonal Layering** and **Hairline Outlines**.

- **Level 0 (Background):** #FAF7F0.
- **Level 1 (Cards/Inputs):** #FFFFFF with a 1px solid border of #E7E2D8.
- **Active State:** Elements do not "rise" via shadows; instead, they change border color to #0B1C3A or fill to #FF6B35.

Visual separation is achieved by the contrast between the ivory background and the pure white surfaces.

## Shapes
The design uses a **Dual-Radius** strategy to distinguish between different content types:

- **Data-Dense Elements (Tables, Code blocks, Small Coupons):** Use "Sharp" (0px to 4px) radii to convey precision and technical reliability.
- **Marketing & Brand Elements (Promo cards, Primary Buttons):** Use "Soft" (8px) radii to feel approachable and modern.
- **Interactive Small Elements (Chips, Tags):** Fully rounded (Pill) for distinct clickability.

Avoid "Squishy" or overly rounded shapes; the silhouette should always feel architectural.

## Components
- **Buttons:** Primary buttons are solid #FF6B35 with white text. Secondary buttons are #FFFFFF with #0B1C3A borders. Use 8px corner radius. No gradients.
- **Coupon Cards:** Pure white background, 1px #E7E2D8 border. Use a "cut-out" notch visual metaphor on the sides (achieved via CSS masks) to signify a physical ticket.
- **Trust Badges:** Small, #C9A227 outlined or filled badges with the "Shield" or "Check" line icon.
- **Input Fields:** 1px #E7E2D8 border, Geist medium text. On focus, the border hardens to 1px #0B1C3A. No glow.
- **Bottom Navigation:** Solid #0B1C3A background with white icons. High contrast, anchored to the bottom on mobile.
- **Icons:** Custom 2px stroke line icons. Use #0B1C3A for general UI and #C9A227 for status/verification. Never use filled icons unless they represent an active toggle state.
- **Price Tags:** Displayed in JetBrains Mono. Large discounts use the Primary Orange.