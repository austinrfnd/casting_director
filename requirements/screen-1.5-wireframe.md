# Screen 1.5 Wireframe: Loading Bar Visualization

## Overview
Screen 1.5 is an intermediate "Incoming Offer" loading screen that displays while the AI analyzes the book data. The loading bar appears at the **bottom of the screen** as an overlay on the "Incoming Offer" image.

---

## Full Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    CASTING DIRECTOR                     │ ← Title area
│                                                         │
│                                                         │
│           ┌─────────────────────────────┐              │
│           │                             │              │
│           │                             │              │
│           │   [Incoming Offer Image]    │              │
│           │   (offer_accepted.png)      │              │
│           │                             │              │ ← Main image
│           │     📬 INCOMING OFFER      │              │    takes most
│           │                             │              │    of screen
│           │                             │              │
│           │                             │              │
│           ╞═════════════════════════════╡              │
│           │ ANALYZING BOOK DATA...      │              │ ← Loading bar
│           │ ┌─────────────────────────┐ │              │    overlay
│           │ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │              │    (BOTTOM)
│           │ └─────────────────────────┘ │              │
│           └─────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Loading Bar Overlay - Detailed View

The loading bar is positioned at the **bottom** of the image container as a semi-transparent dark overlay:

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│              Last part of the image...                    │ ← Bottom of
│                                                           │   offer image
├═══════════════════════════════════════════════════════════┤ ← Dark border
│                                                           │
│              ANALYZING BOOK DATA...                       │ ← Status text
│                                                           │   (Green, Bold)
│  ┌─────────────────────────────────────────────────────┐ │
│  │▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░│ │ ← Animated
│  └─────────────────────────────────────────────────────┘ │   progress bar
│                                                           │   (Diagonal
│                                                           │    stripes)
└───────────────────────────────────────────────────────────┘
   ← Overlay background: rgba(0, 0, 0, 0.85) (dark semi-transparent)
```

### Loading Bar Components:

1. **Overlay Container**
   - Position: Absolute, bottom of image
   - Background: Dark (85% opacity black)
   - Border-top: Light gray line
   - Padding: 20px

2. **Status Text**
   - Text: "ANALYZING BOOK DATA..."
   - Color: DOS Green (#00FF00)
   - Font: Bold, 16px, monospace
   - Alignment: Center
   - Animation: Dots cycle (0-3 dots)

3. **Progress Bar Container**
   - Width: 100% (minus padding)
   - Height: 30px
   - Background: DOS Blue (#000080)
   - Border: 2px solid light gray
   - Padding: 4px

4. **Progress Bar (Inner)**
   - Animated diagonal stripes (45° angle)
   - Colors: Green (#00FF00) alternating with transparent green
   - Animation: Moves left-to-right continuously
   - Glow effect: Green box-shadow
   - Type: Indeterminate (no percentage)

---

## Stripe Pattern Animation

The progress bar uses diagonal stripes that animate continuously:

```
Frame 1:
┌─────────────────────────────────────┐
│▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓│
└─────────────────────────────────────┘

Frame 2 (0.25s later):
┌─────────────────────────────────────┐
│░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓│
└─────────────────────────────────────┘

Frame 3 (0.5s later):
┌─────────────────────────────────────┐
│░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░▓▓░░│
└─────────────────────────────────────┘

...continues moving right infinitely
```

Legend:
- `▓` = Green stripe (solid)
- `░` = Transparent green stripe

---

## Screen Flow Diagram

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  Screen 1   │        │ Screen 1.5  │        │  Screen 2   │
│             │        │             │        │             │
│ Book Entry  │ ────► │  LOADING    │ ────► │   Budget    │
│             │        │  BAR HERE!  │        │   Reveal    │
│             │        │             │        │             │
│ [Book Name] │        │ ┌─────────┐ │        │ Studio Deal │
│ [Author]    │        │ │ Offer   │ │        │ Memo with   │
│             │        │ │ Image   │ │        │ cast budget │
│ [LOAD]      │        │ └─────────┘ │        │             │
│             │        │ [===LOAD==] │        │             │
└─────────────┘        └─────────────┘        └─────────────┘
                              ↑
                              │
                       Click anywhere
                       to skip waiting
                       (after API done)
```

### Trigger Flow:
1. User enters book name/author on Screen 1
2. User clicks "LOAD PROJECT" button
3. **Screen 1.5 appears** with incoming offer image
4. **Loading bar overlay fades in** at bottom
5. API call to `getBookInfo` Cloud Function starts
6. Loading bar animates while waiting
7. When API completes: status changes to "ANALYSIS COMPLETE..."
8. After 2 seconds (or immediate click): Transition to Screen 2

---

## Dimensions & Positioning

```
Screen 1.5 Container (Full Screen)
├── incoming-offer-container
│   ├── img (offer_accepted.png)
│   │   └── Width: 80% of screen max
│   │       Height: auto (maintains aspect ratio)
│   │
│   └── screen1_5-loading-overlay (LOADING BAR)
│       ├── Position: absolute
│       ├── Bottom: 0
│       ├── Left: 0
│       ├── Right: 0
│       ├── Height: auto (~100px)
│       │
│       └── Content:
│           ├── Status Text (20px height)
│           └── Progress Bar Container (30px height + padding)
```

### Key Positioning:
- Loading bar is **anchored to the bottom** of the image container
- Uses `position: absolute; bottom: 0;` to always stay at bottom
- Spans full width of image (left: 0, right: 0)
- Dark overlay makes it stand out from image

---

## Visual States

### State 1: Loading Bar Active
```
┌─────────────────────┐
│                     │
│   [Offer Image]     │
│                     │
├═════════════════════┤
│ ANALYZING BOOK...   │ ← Green text, animated dots
│ ┌─────────────────┐ │
│ │▓▓░░▓▓░░▓▓░░▓▓░░▓│ │ ← Animated stripes
│ └─────────────────┘ │
└─────────────────────┘
```

### State 2: Analysis Complete (Brief)
```
┌─────────────────────┐
│                     │
│   [Offer Image]     │
│                     │
├═════════════════════┤
│ ANALYSIS COMPLETE...│ ← Text changes
│ ┌─────────────────┐ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │ ← Bar fills completely
│ └─────────────────┘ │
└─────────────────────┘
```

### State 3: Transition to Screen 2
```
┌─────────────────────┐
│                     │
│   [Offer Image]     │
│                     │
│                     │ ← Loading bar fades out
│                     │
│                     │
│                     │
└─────────────────────┘
                ↓
          (Fade to Screen 2)
```

---

## Color Scheme (DOS Aesthetic)

| Element | Color | Hex/RGBA |
|---------|-------|----------|
| Status Text | DOS Green | `#00FF00` |
| Progress Bar Stripes | DOS Green | `#00FF00` |
| Progress Bar Container | DOS Blue | `#000080` |
| Overlay Background | Dark Black | `rgba(0, 0, 0, 0.85)` |
| Border | Light Gray | `#CCCCCC` |
| Glow Effect | Green (Transparent) | `rgba(0, 255, 0, 0.3)` |

---

## Animation Details

### Stripe Animation:
- **Duration**: 1 second per cycle
- **Direction**: Left to right
- **Type**: Infinite loop
- **Pattern**: 20px diagonal stripes at 45° angle
- **Effect**: Creates illusion of continuous movement

### Dots Animation:
- **Duration**: 1.5 seconds per cycle
- **Pattern**: `.` → `..` → `...` → (empty) → repeat
- **Text**: "ANALYZING BOOK DATA" + animated dots

### Fade In/Out:
- **Fade in**: 0.3 seconds when Screen 1.5 appears
- **Fade out**: 0.3 seconds when transitioning to Screen 2

---

## User Interaction

The entire Screen 1.5 (including the loading bar area) is **clickable** after the API call completes:

```
┌─────────────────────────────────────┐
│  ◄── CLICKABLE AFTER API DONE       │
│                                     │
│        [Offer Image]                │ ◄── Click anywhere
│                                     │     on this screen
│  ┌─────────────────────────────┐   │
│  │ ANALYZING BOOK DATA...      │   │
│  │ [====================]      │   │ ◄── Even on loading bar
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
         ↓ (Click effect)
    Skip to Screen 2 immediately
```

---

## Technical Implementation References

### Files:
- **HTML**: [index.html:61-76](../index.html#L61-L76) - Screen 1.5 structure
- **CSS**: [css/screen1_5-loading.css](../css/screen1_5-loading.css) - Loading bar styles
- **JavaScript**: [app.js:1110-1164](../app.js#L1110-L1164) - Loading bar logic
- **Tests**: [tests/casting-flow.spec.js:185-187](../tests/casting-flow.spec.js#L185-L187) - Verification

### Key CSS Classes:
- `.screen1_5-loading-overlay` - Main overlay container (bottom positioned)
- `.screen1_5-progress-bar` - Animated stripe bar
- `.screen1_5-status-text` - "ANALYZING BOOK DATA..." text
- `.active` - Class that triggers fade-in animation

---

## Summary

**The loading bar is positioned at the BOTTOM of Screen 1.5**, overlaying the "Incoming Offer" image with:

✓ Dark semi-transparent background for visibility
✓ Green status text with animated dots
✓ Animated diagonal stripe progress bar (indeterminate)
✓ Maintains DOS retro aesthetic
✓ Clickable to skip after API completes
✓ Smooth fade in/out transitions

This provides visual feedback during the AI book analysis API call, keeping users engaged while data is being processed.
