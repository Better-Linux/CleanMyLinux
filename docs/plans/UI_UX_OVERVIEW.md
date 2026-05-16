# CleanMyLinux — Complete UI/UX Specification

> **Purpose**: This document is a pixel-level UI/UX blueprint for CleanMyLinux, ready to hand to Claude Code (or any developer) for implementation. It covers layout, color system, typography, every screen/module, component library, animations, and interaction patterns.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System — Orange Gradient Theme](#2-color-system--orange-gradient-theme)
3. [Typography](#3-typography)
4. [Spacing & Layout Grid](#4-spacing--layout-grid)
5. [App Shell — Overall Layout](#5-app-shell--overall-layout)
6. [Sidebar Navigation](#6-sidebar-navigation)
7. [Screen: Smart Scan (Dashboard)](#7-screen-smart-scan-dashboard)
8. [Screen: System Junk](#8-screen-system-junk)
9. [Screen: App Manager / Uninstaller](#9-screen-app-manager--uninstaller)
10. [Screen: Large & Old Files](#10-screen-large--old-files)
11. [Screen: Space Lens](#11-screen-space-lens)
12. [Screen: Startup Manager](#12-screen-startup-manager)
13. [Screen: System Health](#13-screen-system-health)
14. [Component Library](#14-component-library)
15. [Animations & Micro-interactions](#15-animations--micro-interactions)
16. [Iconography](#16-iconography)
17. [Responsive Behavior](#17-responsive-behavior)
18. [Dark Mode / Light Mode](#18-dark-mode--light-mode)

---

## 1. Design Philosophy

Inspired by CleanMyMac's award-winning UX:

- **Clarity over complexity**: Each screen has ONE primary action (Scan / Clean / Delete)
- **Progressive disclosure**: Summary first → click to expand details
- **Warm and approachable**: Orange gradients create warmth and energy, not clinical/cold
- **Satisfying feedback**: Scanning and cleaning feel rewarding via animations and progress indicators
- **Safety-first messaging**: Always show what WILL be deleted, never auto-delete without confirmation
- **The big button**: A prominent, oversized primary action button is the centerpiece of every module (like CleanMyMac's signature Scan button that "breaks out" of the layout)

---

## 2. Color System — Orange Gradient Theme

### Primary Palette (Orange Gradient)

```css
/* Core Orange Gradient — used for primary buttons, progress rings, active states */
--orange-50:  #FFF7ED;   /* Lightest tint - subtle backgrounds */
--orange-100: #FFEDD5;   /* Light tint - hover backgrounds */
--orange-200: #FED7AA;   /* Soft accent */
--orange-300: #FDBA74;   /* Medium accent */
--orange-400: #FB923C;   /* Vibrant orange */
--orange-500: #F97316;   /* PRIMARY ORANGE — brand color */
--orange-600: #EA580C;   /* Darker orange — hover states */
--orange-700: #C2410C;   /* Deep orange — active/pressed */
--orange-800: #9A3412;   /* Very dark orange */
--orange-900: #7C2D12;   /* Deepest orange */

/* Hero Gradient — used on primary buttons, progress rings, scan animations */
--gradient-primary: linear-gradient(135deg, #F97316, #EA580C);
--gradient-warm:    linear-gradient(135deg, #FDBA74, #F97316);
--gradient-hot:     linear-gradient(135deg, #FB923C, #DC2626);  /* warning/danger accent */
--gradient-glow:    radial-gradient(circle, rgba(249,115,22,0.3), transparent 70%);
```

### Dark Theme Palette (Default)

```css
/* Backgrounds — layered dark surfaces */
--bg-base:       #0A0A0B;   /* Deepest background — app window */
--bg-surface:    #141416;   /* Sidebar background, card backgrounds */
--bg-elevated:   #1C1C1F;   /* Elevated cards, modals, dropdowns */
--bg-hover:      #252528;   /* Hover state for interactive items */
--bg-active:     #2E2E32;   /* Active/selected state */

/* Borders */
--border-subtle:  #1F1F23;  /* Barely visible dividers */
--border-default: #2A2A2E;  /* Standard borders */
--border-strong:  #3A3A3F;  /* Emphasized borders */

/* Text */
--text-primary:    #F5F5F5;  /* Primary text — headings, body */
--text-secondary:  #A1A1AA;  /* Secondary text — descriptions, labels */
--text-tertiary:   #71717A;  /* Tertiary text — timestamps, hints */
--text-disabled:   #3F3F46;  /* Disabled state */
--text-on-orange:  #FFFFFF;  /* Text on orange backgrounds */

/* Semantic Colors */
--success:  #22C55E;   /* Green — safe, cleaned, completed */
--warning:  #EAB308;   /* Yellow — review recommended */
--danger:   #EF4444;   /* Red — threats, large items, danger zone */
--info:     #3B82F6;   /* Blue — informational */
```

### Light Theme Palette

```css
--bg-base:       #FAFAFA;
--bg-surface:    #FFFFFF;
--bg-elevated:   #FFFFFF;
--bg-hover:      #F4F4F5;
--bg-active:     #E4E4E7;

--border-subtle:  #F4F4F5;
--border-default: #E4E4E7;
--border-strong:  #D4D4D8;

--text-primary:    #18181B;
--text-secondary:  #52525B;
--text-tertiary:   #A1A1AA;
--text-on-orange:  #FFFFFF;
```

### Gradient Usage Rules

| Element | Gradient |
|---------|----------|
| Primary CTA buttons | `--gradient-primary` |
| Progress rings (scanning) | Animated conic gradient using `--orange-400` → `--orange-600` |
| Sidebar active indicator | Vertical bar using `--gradient-primary` |
| Scan animation background glow | `--gradient-glow` |
| Category badges (junk types) | Solid `--orange-100` bg with `--orange-600` text (light) / `--orange-900` bg with `--orange-400` text (dark) |
| Danger/warning buttons | `--gradient-hot` |

---

## 3. Typography

**Font Stack**: `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Inter is free, widely available, and excellent for UI. Fall back to system fonts.

| Role | Weight | Size | Line Height | Letter Spacing | Usage |
|------|--------|------|-------------|----------------|-------|
| Display | 700 (Bold) | 48px / 3rem | 1.1 | -0.02em | Hero numbers ("4.2 GB found") |
| H1 | 700 (Bold) | 30px / 1.875rem | 1.2 | -0.015em | Screen titles |
| H2 | 600 (Semibold) | 24px / 1.5rem | 1.3 | -0.01em | Section headers |
| H3 | 600 (Semibold) | 18px / 1.125rem | 1.4 | 0 | Card titles, category names |
| Body | 400 (Regular) | 14px / 0.875rem | 1.5 | 0 | Default text |
| Body Small | 400 (Regular) | 13px / 0.8125rem | 1.5 | 0 | Descriptions, secondary info |
| Caption | 500 (Medium) | 12px / 0.75rem | 1.4 | 0.02em | Labels, badges, timestamps |
| Mono | 400 (Regular) | 13px / 0.8125rem | 1.5 | 0 | File paths, sizes — use `"JetBrains Mono", "Fira Code", monospace` |

---

## 4. Spacing & Layout Grid

**Base unit**: 4px. All spacing is multiples of 4px.

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
--space-20: 80px
```

**Border Radius**:
```
--radius-sm:   6px    /* Small elements: badges, chips */
--radius-md:   8px    /* Buttons, inputs */
--radius-lg:   12px   /* Cards, panels */
--radius-xl:   16px   /* Large cards, modals */
--radius-2xl:  24px   /* Hero elements */
--radius-full: 9999px /* Circles, pills */
```

**Shadows (dark mode)**:
```
--shadow-sm:   0 1px 2px rgba(0,0,0,0.3);
--shadow-md:   0 4px 12px rgba(0,0,0,0.4);
--shadow-lg:   0 8px 24px rgba(0,0,0,0.5);
--shadow-glow: 0 0 40px rgba(249,115,22,0.15);  /* Orange glow for primary elements */
```

---

## 5. App Shell — Overall Layout

```
┌──────────────────────────────────────────────────────────┐
│  Window Title Bar (native, draggable)                    │
├─────────────┬────────────────────────────────────────────┤
│             │                                            │
│             │                                            │
│   Sidebar   │            Main Content Area               │
│   (240px)   │            (remaining width)               │
│             │                                            │
│  Navigation │    Centered content, max-width 800px       │
│  items      │    Padding: 48px                           │
│             │                                            │
│             │                                            │
│             │                                            │
│             │                                            │
│             │                                            │
│  ─────────  │                                            │
│  Settings ⚙ │                                            │
│             │                                            │
├─────────────┴────────────────────────────────────────────┤
│  (optional) Status Bar — current operation / last scan   │
└──────────────────────────────────────────────────────────┘
```

- **Window**: Min size `900×600`, default `1080×720`, resizable
- **Sidebar**: Fixed width `240px`, full height, `--bg-surface` background
- **Main content**: Fills remaining space, scrollable, padded `48px` on all sides
- **Content max-width**: `800px`, centered horizontally within main area
- **Title bar**: Native Tauri window controls (close/min/max), draggable region

---

## 6. Sidebar Navigation

### Layout

```
┌─────────────────┐
│ 🧹               │  ← App icon (32×32) + "CleanMyLinux" text
│ CleanMyLinux     │     Font: H3 semibold, --text-primary
│                  │
│ ─────────────── │  ← Divider (1px, --border-subtle)
│                  │
│ ● Smart Scan    │  ← Navigation items
│   System Junk   │
│   App Manager   │
│   Large Files   │
│   Space Lens    │
│   Startup       │
│   System Health │
│                  │
│                  │
│  (flex spacer)   │
│                  │
│ ─────────────── │
│ ⚙ Settings      │  ← Bottom-pinned
└─────────────────┘
```

### Navigation Item States

Each nav item is a row: `height: 40px`, `padding: 8px 16px`, `border-radius: 8px`, `margin: 2px 12px`.

| State | Background | Text Color | Left Indicator |
|-------|-----------|------------|----------------|
| Default | transparent | `--text-secondary` | none |
| Hover | `--bg-hover` | `--text-primary` | none |
| Active (selected) | `rgba(249,115,22,0.1)` | `--orange-500` | 3px wide rounded bar, `--gradient-primary`, left edge |
| Pressed | `--bg-active` | `--orange-400` | same as active |

Each item has an icon (20×20, Lucide icons) on the left and label text (Body weight 500).

### Sidebar Icon Set (Lucide)

| Module | Icon name |
|--------|-----------|
| Smart Scan | `scan` (or `shield-check`) |
| System Junk | `trash-2` |
| App Manager | `package` |
| Large Files | `hard-drive` |
| Space Lens | `pie-chart` |
| Startup | `rocket` |
| System Health | `activity` |
| Settings | `settings` |

---

## 7. Screen: Smart Scan (Dashboard)

This is the **home screen** and the first thing users see. Inspired by CleanMyMac's signature "big button" design.

### State 1: Pre-Scan (Initial)

```
┌────────────────────────────────────────────────┐
│                                                │
│          Welcome to CleanMyLinux               │  ← H1, centered
│    Keep your system clean and fast             │  ← Body, --text-secondary
│                                                │
│              ┌──────────────┐                  │
│              │              │                  │
│              │    ◉ SCAN    │                  │  ← BIG circular button
│              │              │                  │     200×200px circle
│              │              │                  │     --gradient-primary bg
│              └──────────────┘                  │     --shadow-glow
│                                                │
│    Last scan: 3 days ago  •  4.2 GB cleaned    │  ← Caption, --text-tertiary
│                                                │
└────────────────────────────────────────────────┘
```

**Big Scan Button**:
- Circle: `200px × 200px`
- Background: `--gradient-primary` (135deg, #F97316 → #EA580C)
- Border: none
- Box shadow: `0 0 60px rgba(249,115,22,0.3)` (orange glow)
- Text: "SCAN" — 24px, bold, white, uppercase, letter-spacing 0.1em
- Hover: Scale `1.05`, glow intensifies to `0.5` opacity
- Active/Press: Scale `0.97`, gradient shifts darker
- The button should feel like it "floats" above the surface

### State 2: Scanning (In Progress)

```
┌────────────────────────────────────────────────┐
│                                                │
│             Scanning your system...            │  ← H2, centered
│                                                │
│              ┌──────────────┐                  │
│              │   ╭──────╮   │                  │
│              │   │ 47%  │   │                  │  ← Animated circular
│              │   ╰──────╯   │                  │     progress ring
│              └──────────────┘                  │     200×200px
│                                                │
│     ┌──────────────────────────────────┐       │
│     │ ✓ System Junk      1.2 GB       │       │  ← Completed module
│     │ ✓ Package Caches   890 MB       │       │  ← Completed module
│     │ ◉ App Leftovers    scanning...  │       │  ← Currently scanning
│     │ ○ Large Files                   │       │  ← Pending
│     │ ○ Startup Items                 │       │  ← Pending
│     └──────────────────────────────────┘       │
│                                                │
└────────────────────────────────────────────────┘
```

**Circular Progress Ring**:
- SVG-based, `200px` diameter
- Track: `--bg-elevated`, `8px` stroke width
- Progress arc: Animated conic/arc using `--gradient-primary`
- Center text: Percentage in Display font (48px bold), `--text-primary`
- Below percentage: Current module name in Caption

**Module Checklist** (below progress ring):
- Each row: `height: 44px`, flex row, icon + label + value
- ✓ Completed: Green checkmark icon (`--success`), value shown
- ◉ In Progress: Animated orange spinner, "scanning..." text
- ○ Pending: Gray circle (`--text-tertiary`), no value

### State 3: Scan Complete (Results)

```
┌────────────────────────────────────────────────┐
│                                                │
│                 4.2 GB                         │  ← Display (48px bold)
│           of junk found                        │  ← Body, --text-secondary
│                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 🗑️        │ │ 📦        │ │ 📁        │       │  ← Summary tiles
│  │ Junk     │ │ Apps     │ │ Files    │       │     3 cards in a row
│  │ 1.8 GB   │ │ 1.2 GB   │ │ 1.2 GB   │       │
│  │ 14 items │ │ 3 apps   │ │ 8 files  │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │  System Junk        1.8 GB    ▸       │    │  ← Expandable row
│  │  App Leftovers      1.2 GB    ▸       │    │
│  │  Large Files        980 MB    ▸       │    │
│  │  Old Downloads      320 MB    ▸       │    │
│  └────────────────────────────────────────┘    │
│                                                │
│           ┌────────────────────┐               │
│           │    🧹 CLEAN        │               │  ← Big action button
│           └────────────────────┘               │     Pill shape, 200×56px
│                                                │     --gradient-primary
└────────────────────────────────────────────────┘
```

**Summary Tiles** (3 across):
- Cards: `--bg-elevated` background, `--radius-lg`, `padding: 20px`
- Icon on top: 32px, using category-specific color
- Title: H3 semibold
- Size: Display-style but smaller (30px bold, `--orange-500`)
- Subtitle: Caption, `--text-tertiary`
- Hover: Slight lift (`translateY(-2px)`), border `--orange-500` glow

**Detail Rows** (expandable):
- Row: `height: 56px`, flex, `--bg-elevated`, `--radius-md`
- Left: Category icon (24px) + label (Body)
- Right: Size value (Body mono, `--orange-400`) + chevron arrow
- Hover: `--bg-hover`
- Clicking expands to show individual items with checkboxes

**Clean Button**:
- Pill/stadium shape: `width: 220px`, `height: 56px`, `--radius-full`
- Background: `--gradient-primary`
- Text: "CLEAN" (or "Clean 4.2 GB"), 18px bold, white, uppercase
- Icon: Broom/sparkle icon on left
- Hover: Scale 1.03, glow
- Shadow: `--shadow-glow`

---

## 8. Screen: System Junk

### Layout

```
┌────────────────────────────────────────────────┐
│  System Junk                                   │  ← H1
│  Remove caches, logs, and temporary files      │  ← Body, --text-secondary
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │        1.8 GB of junk found            │    │  ← Result header card
│  │  ██████████████░░░░  72% scanned       │    │  ← Linear progress bar
│  └────────────────────────────────────────┘    │
│                                                │
│  Category Breakdown                            │  ← H3
│                                                │
│  ┌─────────────────────────────────────────┐   │
│  │ [✓] 📦 Package Cache         680 MB    │   │  ← Category row
│  │     /var/cache/apt/archives             │   │     with checkbox
│  ├─────────────────────────────────────────┤   │
│  │ [✓] 🌐 Browser Cache         420 MB    │   │
│  │     Chrome, Firefox                     │   │
│  ├─────────────────────────────────────────┤   │
│  │ [✓] 📋 System Logs           310 MB    │   │
│  │     journald, /var/log                  │   │
│  ├─────────────────────────────────────────┤   │
│  │ [✓] 🗂️  User Cache            190 MB    │   │
│  │     ~/.cache (thumbnails, fonts...)     │   │
│  ├─────────────────────────────────────────┤   │
│  │ [✓] 🗑️  Trash                 120 MB    │   │
│  │     ~/.local/share/Trash                │   │
│  ├─────────────────────────────────────────┤   │
│  │ [ ] 📦 Flatpak Unused          80 MB   │   │
│  │     3 unused runtimes                   │   │
│  └─────────────────────────────────────────┘   │
│                                                │
│  ┌───────────────────────────┐                 │
│  │  🧹 Clean 1.8 GB          │                 │  ← Primary action button
│  └───────────────────────────┘                 │
│                                                │
└────────────────────────────────────────────────┘
```

### Category Row Component

```
┌─────────────────────────────────────────────────┐
│ [✓]  📦  Package Cache               680 MB    │
│           /var/cache/apt/archives    ▾          │
│  ┌───────────────────────────────────────────┐  │
│  │  [✓] apt archives       520 MB           │  │  ← Expanded children
│  │  [✓] dnf cache          160 MB           │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- **Checkbox**: Custom styled, 20×20px. Checked = `--orange-500` fill with white checkmark. Unchecked = `--border-default` stroke.
- **Icon**: 24×24, category-specific color
- **Category name**: Body semibold, `--text-primary`
- **Size**: Body mono, `--orange-400`, right-aligned
- **Description**: Caption, `--text-tertiary`, below name
- **Expand arrow**: Chevron-down, rotates 180° on expand
- **Children**: Indented 40px, same row format but slightly smaller

### Horizontal Bar Chart (Size Breakdown)

At the top of the category list, show a horizontal stacked bar:

```
┌──────────────────────────────────────────────────┐
│ ████████  ██████  █████  ████  ███  ██           │
│ Pkg Cache  Browser  Logs   User  Trash  Flatpak  │
└──────────────────────────────────────────────────┘
```

- Each segment is a different shade of orange (from `--orange-300` to `--orange-700`)
- Hover a segment → tooltip with category name + size
- Click a segment → scrolls to that category in the list

---

## 9. Screen: App Manager / Uninstaller

### Layout

```
┌────────────────────────────────────────────────┐
│  App Manager                                   │  ← H1
│  View, uninstall, or reset your applications   │  ← Body
│                                                │
│  ┌──────────────────────────────────────┐      │
│  │ 🔍 Search apps...         Filter ▾  │      │  ← Search bar + filter
│  └──────────────────────────────────────┘      │
│                                                │
│  Sort: [Name] [Size ▼] [Last Used] [Source]    │  ← Sort pills
│                                                │
│  ┌─────────────────────────────────────────┐   │
│  │ 🟢 Firefox                              │   │
│  │    Source: apt  |  Size: 285 MB         │   │
│  │    Last used: Today                     │   │  ← App row
│  │    Config: 45 MB  Cache: 180 MB         │   │
│  │                    [Reset] [Uninstall]  │   │
│  ├─────────────────────────────────────────┤   │
│  │ 🟢 Visual Studio Code                   │   │
│  │    Source: deb  |  Size: 340 MB         │   │
│  │    Last used: Yesterday                 │   │
│  │    Config: 120 MB  Cache: 85 MB         │   │
│  │                    [Reset] [Uninstall]  │   │
│  ├─────────────────────────────────────────┤   │
│  │ 🔴 Slack (unused)                       │   │
│  │    Source: snap  |  Size: 420 MB        │   │
│  │    Last used: 90 days ago               │   │
│  │    Config: 30 MB  Cache: 110 MB         │   │
│  │                    [Reset] [Uninstall]  │   │
│  └─────────────────────────────────────────┘   │
│                                                │
│  Leftover Files from Uninstalled Apps          │  ← H3
│  ┌─────────────────────────────────────────┐   │
│  │ ⚠️  3 apps left behind 245 MB of data   │   │  ← Alert banner
│  │  [View & Clean]                         │   │
│  └─────────────────────────────────────────┘   │
│                                                │
└────────────────────────────────────────────────┘
```

### App Row Component

```
┌─────────────────────────────────────────────────────┐
│  ┌──┐                                               │
│  │🔶│  Firefox                          285 MB      │  ← App icon (40×40) + name + total size
│  └──┘  Source: apt  •  Last used: Today             │  ← Metadata line
│                                                     │
│        ┌────────────────────────────────────────┐   │
│        │ Binary    ████████░░░░  60 MB          │   │  ← Size breakdown bar
│        │ Config    ██░░░░░░░░░░  45 MB          │   │
│        │ Cache     █████████████ 180 MB         │   │
│        └────────────────────────────────────────┘   │
│                                                     │
│                         ┌───────┐  ┌─────────────┐  │
│                         │ Reset │  │ 🗑 Uninstall │  │  ← Action buttons
│                         └───────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
```

- **App icon**: 40×40px, pulled from `/usr/share/icons` or app's `.desktop` file
- **Status dot**: 🟢 Recently used (< 30 days) / 🟡 Stale (30-90 days) / 🔴 Unused (> 90 days)
- **Size breakdown**: Mini horizontal stacked bar showing binary/config/cache/data proportions
- **Reset button**: Outlined style, `--border-default`, resets config+cache only
- **Uninstall button**: Solid `--danger` background, white text

### Uninstall Confirmation Modal

```
┌──────────────────────────────────────┐
│  Uninstall Firefox?                  │  ← H2
│                                      │
│  This will remove:                   │
│  ✓ Package (apt)          60 MB      │
│  ✓ Configuration          45 MB      │
│  ✓ Cache                  180 MB     │
│  ─────────────────────────────       │
│  Total:                   285 MB     │
│                                      │
│  ☐ Keep configuration files          │  ← Option checkbox
│                                      │
│  [Cancel]         [🗑 Uninstall]     │
└──────────────────────────────────────┘
```

---

## 10. Screen: Large & Old Files

### Layout

```
┌────────────────────────────────────────────────┐
│  Large & Old Files                             │  ← H1
│  Find files taking up space                    │  ← Body
│                                                │
│  ┌──────────────────────────────────────┐      │
│  │ Filter: [All] [>100MB] [>500MB] [>1GB]│     │  ← Size filter pills
│  │ Age:    [All] [>30d]  [>90d]  [>1yr] │      │  ← Age filter pills
│  └──────────────────────────────────────┘      │
│                                                │
│  Category Tabs:                                │
│  [All (32)] [Downloads (12)] [Videos (8)]      │
│  [Archives (5)] [Build Artifacts (4)] [Other]  │
│                                                │
│  ┌─────────────────────────────────────────┐   │
│  │ [✓]  📹 meeting-recording.mp4           │   │
│  │      2.4 GB  •  ~/Videos  •  6 mo ago  │   │
│  ├─────────────────────────────────────────┤   │
│  │ [✓]  📦 node_modules.tar.gz             │   │
│  │      1.8 GB  •  ~/Downloads  •  1yr ago│   │
│  ├─────────────────────────────────────────┤   │
│  │ [ ]  💿 ubuntu-22.04.iso               │   │
│  │      4.2 GB  •  ~/Downloads  •  3mo ago│   │
│  ├─────────────────────────────────────────┤   │
│  │ [✓]  📁 old-project/target/            │   │
│  │      3.1 GB  •  ~/dev  •  8 mo ago     │   │
│  └─────────────────────────────────────────┘   │
│                                                │
│  Selected: 4 files  •  7.3 GB                  │
│  ┌────────────────────────────┐                │
│  │  🗑️  Move to Trash (7.3 GB) │                │  ← Primary action
│  └────────────────────────────┘                │
│                                                │
└────────────────────────────────────────────────┘
```

### File Row

- Checkbox + file type icon (24px) + filename (Body semibold)
- Second line: Size (mono, `--orange-400`) • path (mono, `--text-tertiary`) • age
- Hover: Background `--bg-hover`, show "Open in Files" and "Quick Look" icon buttons on right
- Selected: Left border `--orange-500`, checkbox filled

### Category Tabs

- Horizontal pill tabs
- Active: `--orange-500` background, white text
- Inactive: `--bg-elevated` background, `--text-secondary`
- Badge count inside each tab

---

## 11. Screen: Space Lens

### Layout

```
┌────────────────────────────────────────────────┐
│  Space Lens                                    │  ← H1
│  Visualize your disk usage                     │  ← Body
│                                                │
│  Path: /home/user  ▸  Documents  ▸  Projects  │  ← Breadcrumb nav
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │                                        │    │
│  │    ┌───────────────┬──────┐            │    │
│  │    │               │      │            │    │
│  │    │   Documents   │Videos│            │    │  ← Interactive treemap
│  │    │    12.4 GB    │ 8 GB │            │    │     Blocks sized by
│  │    │               │      │            │    │     disk usage
│  │    ├───────┬───────┼──────┤            │    │
│  │    │  .cache│ Music │ Dev  │            │    │
│  │    │  4 GB │ 3 GB  │ 6 GB │            │    │
│  │    │       │       │      │            │    │
│  │    └───────┴───────┴──────┘            │    │
│  │                                        │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Details Panel (right or below treemap):       │
│  ┌──────────────────────────────────┐          │
│  │ 📁 Documents        12.4 GB     │          │
│  │   Projects/          4.2 GB     │          │
│  │   PDFs/              3.1 GB     │          │
│  │   Photos/            2.8 GB     │          │
│  │   Other              2.3 GB     │          │
│  └──────────────────────────────────┘          │
│                                                │
└────────────────────────────────────────────────┘
```

### Treemap Visualization

- **Container**: Full content width, height `400px`
- **Blocks**: Rounded rectangles (`--radius-sm`)
- **Color coding**: Gradient from `--orange-200` (small) to `--orange-700` (large)
- **Labels**: Inside each block — folder name + size. Only show if block is large enough.
- **Hover**: Block brightens, border `--orange-400`, tooltip with full path + exact size
- **Click**: Drills into that directory, breadcrumb updates, treemap re-renders with animation
- **Right-click / long press**: Context menu: "Open in Files", "Delete", "Add to ignore list"

### Breadcrumb Navigation

- Horizontal row of path segments separated by `▸`
- Each segment is clickable to navigate back up
- Current segment: `--text-primary` bold
- Parent segments: `--text-secondary`, underline on hover

---

## 12. Screen: Startup Manager

### Layout

```
┌────────────────────────────────────────────────┐
│  Startup Manager                               │  ← H1
│  Control what runs when you log in             │  ← Body
│                                                │
│  Tabs: [Autostart Apps (8)] [Systemd Services (12)] │
│                                                │
│  ┌─────────────────────────────────────────┐   │
│  │  ┌──┐                                   │   │
│  │  │🔶│  Dropbox             [── ●]  ON   │   │  ← Toggle switch
│  │  └──┘  Autostart entry                  │   │
│  │        RAM: ~85 MB  •  Startup: +1.2s   │   │
│  ├─────────────────────────────────────────┤   │
│  │  ┌──┐                                   │   │
│  │  │🔶│  Slack               [● ──]  OFF  │   │
│  │  └──┘  Autostart entry                  │   │
│  │        RAM: ~210 MB  •  Startup: +2.1s  │   │
│  ├─────────────────────────────────────────┤   │
│  │  ┌──┐                                   │   │
│  │  │🔶│  syncthing.service   [── ●]  ON   │   │
│  │  └──┘  Systemd user service             │   │
│  │        RAM: ~32 MB  •  Startup: +0.3s   │   │
│  └─────────────────────────────────────────┘   │
│                                                │
│  Estimated boot improvement: -3.3s if          │  ← Impact summary
│  disabled items are turned off                 │
│                                                │
│  [Remove Selected]                             │  ← Destructive action
│                                                │
└────────────────────────────────────────────────┘
```

### Toggle Switch

- Track: `44px × 24px`, `--radius-full`
- ON state: Track `--orange-500`, knob white
- OFF state: Track `--bg-active`, knob `--text-tertiary`
- Transition: `0.2s ease` slide + color

### Impact Indicators

- Next to each item, show estimated resource impact:
  - RAM badge: `85 MB` — colored based on amount (green < 50MB, yellow 50-200MB, red > 200MB)
  - Startup time: `+1.2s` — same color coding

---

## 13. Screen: System Health

### Layout

```
┌────────────────────────────────────────────────┐
│  System Health                                 │  ← H1
│  Monitor your system in real-time              │  ← Body
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  CPU     │  │  Memory  │  │  Disk    │     │  ← Stat cards (3 cols)
│  │          │  │          │  │          │     │
│  │  ╭────╮  │  │  ╭────╮  │  │  ╭────╮  │     │     Each with
│  │  │ 34%│  │  │  │ 67%│  │  │  │ 45%│  │     │     circular gauge
│  │  ╰────╯  │  │  ╰────╯  │  │  ╰────╯  │     │
│  │          │  │          │  │          │     │
│  │ 3.4 GHz │  │ 5.4/8 GB│  │ 234/512GB│     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
│  ┌─────────────────────────────────────────┐   │
│  │  CPU Usage Over Time                    │   │  ← Line chart
│  │  ████▄▃▂▃▄███▄▃▂▁▂▃▄▅████▄▃▂▃████▄▃   │   │     (last 60 seconds)
│  │  ───────────────────────────────────    │   │
│  │  0s        15s        30s       60s    │   │
│  └─────────────────────────────────────────┘   │
│                                                │
│  Top Processes                                 │  ← H3
│  ┌─────────────────────────────────────────┐   │
│  │  chrome         CPU: 12%  RAM: 1.2 GB  │   │
│  │  code           CPU: 8%   RAM: 890 MB  │   │
│  │  node           CPU: 5%   RAM: 340 MB  │   │
│  │  Xorg           CPU: 3%   RAM: 210 MB  │   │
│  └─────────────────────────────────────────┘   │
│                                                │
│  Quick Actions                                 │  ← H3
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Free RAM │  │ Flush DNS│  │ Clear tmp│     │  ← Action buttons
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
└────────────────────────────────────────────────┘
```

### Circular Gauge

- SVG-based, `120px × 120px`
- Track: `--bg-elevated`, `10px` stroke
- Progress arc: Color based on usage:
  - 0-50%: `--success` (green)
  - 50-80%: `--orange-500` (orange)
  - 80-100%: `--danger` (red)
- Center: Percentage in H2 bold
- Below gauge: Absolute value in Caption

### Line Chart (CPU/Memory over time)

- Area chart with gradient fill
- Line: `--orange-500`, 2px
- Area fill: Gradient from `rgba(249,115,22,0.3)` to `transparent`
- X-axis: Time (last 60s)
- Y-axis: 0-100%
- Grid lines: `--border-subtle`
- Updates every 1 second with smooth animation

### Quick Action Buttons

- Card-style buttons: `--bg-elevated`, `--radius-lg`, `padding: 16px 24px`
- Icon (24px) above text
- Hover: `--bg-hover`, slight scale up
- Click: Shows confirmation + spinner + success checkmark

---

## 14. Component Library

### Buttons

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| Primary | `--gradient-primary` | White | none | Main actions (Scan, Clean) |
| Secondary | `--bg-elevated` | `--text-primary` | `--border-default` | Reset, View details |
| Ghost | transparent | `--text-secondary` | none | Tertiary actions |
| Danger | `--danger` | White | none | Uninstall, Delete permanently |
| Pill | `--gradient-primary` | White | none | The big clean/scan button |

All buttons: `height: 40px`, `padding: 0 20px`, `--radius-md`, `font-weight: 600`, `transition: all 0.15s ease`

### Cards

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-sm);
}
```

### Checkboxes

- `20px × 20px`, `--radius-sm`
- Unchecked: `--bg-elevated` fill, `--border-default` stroke (2px)
- Checked: `--orange-500` fill, white checkmark icon
- Indeterminate: `--orange-500` fill, white dash icon
- Focus ring: `0 0 0 3px rgba(249,115,22,0.3)`

### Progress Bar (Linear)

```css
.progress-bar {
  height: 8px;
  background: var(--bg-elevated);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
```

### Tooltip

- Background: `--bg-elevated`
- Border: `--border-default`
- Text: `--text-primary`, Caption size
- Padding: `8px 12px`
- Border-radius: `--radius-md`
- Shadow: `--shadow-md`
- Arrow: 6px CSS triangle
- Delay: 300ms show, 0ms hide

### Modal / Dialog

- Overlay: `rgba(0,0,0,0.6)`, backdrop-blur `4px`
- Container: `--bg-surface`, `--radius-xl`, `max-width: 480px`, `padding: 32px`
- Shadow: `--shadow-lg`
- Title: H2
- Body: Body
- Footer: Flex row, gap 12px, buttons right-aligned
- Enter animation: Fade + scale from 0.95 → 1.0, `0.2s ease-out`
- Exit animation: Fade + scale from 1.0 → 0.95, `0.15s ease-in`

### Toast / Notification

- Fixed bottom-right, `16px` from edges
- Container: `--bg-elevated`, `--radius-lg`, `padding: 16px 20px`
- Left border: 3px colored by type (success=green, error=red, info=orange)
- Auto-dismiss: 5 seconds
- Enter: Slide up from bottom, `0.3s ease-out`
- Exit: Fade + slide down, `0.2s ease-in`

### Search Input

```
┌────────────────────────────────────────┐
│ 🔍  Search apps...                     │
└────────────────────────────────────────┘
```

- Height: `44px`
- Background: `--bg-elevated`
- Border: `--border-default`, focus: `--orange-500`
- Radius: `--radius-md`
- Padding: `0 16px` (with icon)
- Search icon: `--text-tertiary`, left
- Focus ring: `0 0 0 3px rgba(249,115,22,0.2)`

---

## 15. Animations & Micro-interactions

### Scan Button Pulse (idle)

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 40px rgba(249,115,22,0.2); }
  50%      { box-shadow: 0 0 60px rgba(249,115,22,0.4); }
}
/* Apply to idle scan button */
animation: pulse-glow 3s ease-in-out infinite;
```

### Progress Ring Animation

```css
@keyframes spin-ring {
  0%   { stroke-dashoffset: 283; }
  100% { stroke-dashoffset: 0; }
}
/* SVG circle, circumference = 2πr ≈ 283 for r=45 */
```

The progress ring should also have a subtle rotation animation on the gradient:
```css
@keyframes rotate-gradient {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Page Transitions

- Entering view: Fade in (`opacity: 0 → 1`) + slight slide up (`translateY(8px) → 0`), `0.25s ease-out`
- Content stagger: Each major section animates in with 50ms delay between them

### Scan Module Checklist

- When a module completes: Row fades from neutral to success green, checkmark animates in (scale 0 → 1, bounce)
- Size value: Count-up animation from 0 to final value over 0.5s

### Clean Action

When user clicks "Clean":
1. Button shows spinner (replace text with animated spinner)
2. Progress bar fills across the screen
3. Cleaned items animate out of the list (slide right + fade)
4. On completion: Confetti burst or sparkle animation (subtle, brief)
5. Total cleaned number counts up
6. Button transitions to "✓ Done" state (green, 2s, then resets)

### Hover Effects

- Cards: `translateY(-1px)` + `shadow-sm` → `shadow-md`
- Buttons: `scale(1.02)` + brighten
- Nav items: Background fade in `0.15s`
- File rows: Background color change `0.1s`

### Loading States

- Skeleton screens for lists: Animated gradient shimmer over `--bg-elevated` shapes
- Shimmer: `background: linear-gradient(90deg, --bg-elevated 25%, --bg-hover 50%, --bg-elevated 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;`

---

## 16. Iconography

Use **Lucide React** (`lucide-react`) throughout the app. Consistent `strokeWidth: 1.75`, `size: 20` (nav) or `24` (content).

### Module Icons

| Module | Lucide Icon | Color Context |
|--------|------------|---------------|
| Smart Scan | `Shield` | `--orange-500` |
| System Junk | `Trash2` | `--orange-400` |
| App Manager | `Package` | `--orange-400` |
| Large Files | `HardDrive` | `--orange-400` |
| Space Lens | `PieChart` | `--orange-400` |
| Startup | `Rocket` | `--orange-400` |
| System Health | `Activity` | `--orange-400` |
| Settings | `Settings` | `--text-secondary` |

### File Type Icons

| Type | Icon | Color |
|------|------|-------|
| Folder | `Folder` | `--orange-300` |
| Document | `FileText` | `--info` |
| Image | `Image` | `--success` |
| Video | `Video` | `--danger` |
| Archive | `Archive` | `--warning` |
| Code | `Code2` | `--info` |
| Binary/App | `Box` | `--text-secondary` |
| Unknown | `File` | `--text-tertiary` |

### Status Icons

| Status | Icon | Color |
|--------|------|-------|
| Success/Clean | `CheckCircle2` | `--success` |
| Warning/Review | `AlertTriangle` | `--warning` |
| Error/Threat | `XCircle` | `--danger` |
| Info | `Info` | `--info` |
| Scanning | `Loader2` (spinning) | `--orange-500` |

---

## 17. Responsive Behavior

Although this is a desktop app, it should handle window resizing gracefully.

| Window Width | Behavior |
|--------------|----------|
| ≥ 1200px | Full layout, sidebar + content with generous padding |
| 900-1199px | Sidebar collapses to icon-only (56px wide), expand on hover |
| < 900px | Not supported (min-width enforced) |

When sidebar collapses:
- Only icons shown (centered, 24px)
- Tooltip on hover shows the label
- Active indicator bar still visible
- App name hidden, only icon shown

---

## 18. Dark Mode / Light Mode

- **Default: Dark mode** (most system utilities are used by power users who prefer dark)
- Toggle in sidebar footer: Sun/Moon icon
- Transition: All colors transition `0.2s ease` for smooth switch
- Persist preference in local storage / SQLite config
- System preference detection: `prefers-color-scheme` media query for initial value

### Light Mode Adjustments

In light mode, the orange gradients need adjustment:
- Primary button: Same `--gradient-primary` (orange on white looks great)
- Cards: White background with subtle gray borders
- Shadows become lighter: `rgba(0,0,0,0.05)` instead of `rgba(0,0,0,0.4)`
- Progress rings: Same orange, but track becomes `--bg-active` (light gray)
- Sidebar: White or very light gray
- Reduce glow effects (they look odd on light backgrounds)

---

## Implementation Notes for Claude Code

### Tech Stack Reminder
- **Framework**: Tauri v2 (Rust backend + WebView frontend)
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components as a base
- **Charts**: Recharts or visx for line charts/gauges
- **Treemap**: `react-treemap` or custom D3-based implementation
- **Icons**: `lucide-react`
- **Fonts**: Inter (Google Fonts) + JetBrains Mono (monospace)
- **Animation**: Framer Motion for page transitions and complex animations, CSS for simple transitions

### CSS Variables Setup
Create a `globals.css` that defines all `--*` variables above under `:root` (light) and `.dark` (dark mode) selectors. Use Tailwind's `theme.extend` to reference these.

### Component Organization
Use shadcn/ui `Button`, `Card`, `Dialog`, `Tooltip`, `Input`, `Checkbox`, `Toggle`, `Badge` as base components, then customize their styles to match this spec (override with the orange theme variables).

### State Management
Use React Context or Zustand for:
- Current scan state (idle / scanning / complete)
- Scan results data
- Selected items for cleanup
- Theme preference (dark/light)
- Active navigation module

### Tauri Commands (Rust → Frontend)
Each module calls Tauri commands:
```typescript
invoke('scan_system_junk')     // → JunkScanResult
invoke('scan_apps')            // → AppListResult
invoke('scan_large_files')     // → LargeFileResult
invoke('get_disk_usage', { path }) // → TreemapData
invoke('get_startup_items')    // → StartupItem[]
invoke('get_system_stats')     // → SystemStats
invoke('clean_items', { items })   // → CleanResult
invoke('uninstall_app', { appId }) // → UninstallResult
```

Use Tauri events for real-time updates during scans:
```typescript
listen('scan-progress', (event) => {
  // { module: string, progress: number, current_item: string }
})
listen('system-stats-update', (event) => {
  // { cpu: number, memory: number, disk: number }
})
```

---

*This specification is complete and ready for implementation. Start with the app shell (sidebar + navigation + theme), then build out modules one at a time starting with Smart Scan.*
