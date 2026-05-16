# CleanMyLinux — Architecture & Design Plan

## Vision

A polished, modern system maintenance application for Linux — inspired by CleanMyMac X — that provides one-click system cleanup, complete app uninstallation, disk space analysis, and performance optimization through a beautiful GUI.

---

## Feature Modules (MVP Scope)

### 1. Smart Scan (Dashboard)
One-click scan that runs all modules and presents a unified summary with total reclaimable space and recommended actions.

### 2. System Junk Cleaner
Scans and safely removes:
- **Package manager caches**: `apt` (`/var/cache/apt/archives`), `dnf` (`/var/cache/dnf`), `pacman` (`/var/cache/pacman/pkg`)
- **User caches**: `~/.cache/*` (browser caches, thumbnail caches, font caches, build caches)
- **System logs**: `/var/log` old/rotated logs, `journalctl` archived journals
- **Temporary files**: `/tmp`, `/var/tmp` old files
- **Broken symlinks**: Dead symbolic links scattered across the system
- **Trash**: `~/.local/share/Trash`
- **Flatpak/Snap leftovers**: Unused runtimes (`flatpak uninstall --unused`), old snap revisions
- **Thumbnail cache**: `~/.cache/thumbnails`
- **Locale/localization files**: Unused locale data (optional, advanced)

### 3. App Manager / Uninstaller
- Lists all installed applications (from `apt`/`dnf`/`pacman`, Flatpak, Snap, AppImage, and manual installs in `/opt`, `/usr/local`)
- Shows per-app disk usage (binary + config + cache + data)
- **Complete uninstall**: Removes the package AND traces left behind in:
  - `~/.config/<app>`
  - `~/.local/share/<app>`
  - `~/.cache/<app>`
  - `~/.local/state/<app>`
  - `~/.<app>` (legacy dotfiles)
  - Systemd user services, autostart entries, desktop files
- **Reset app**: Remove config/cache but keep the app installed
- Sort/filter by size, last used, install date

### 4. Large & Old File Finder
- Scans home directory (and optionally full disk) for:
  - Files over a configurable size threshold (default: 50MB)
  - Files not accessed in X days (default: 90 days)
  - Duplicate files (by hash)
- Categorizes results: Documents, Downloads, Videos, Archives, Disk Images, Build Artifacts, Other
- Quick preview and one-click delete or move to trash

### 5. Space Lens (Disk Visualizer)
- Interactive treemap visualization of disk usage
- Drill-down into directories
- Click to select items for deletion
- Shows relative sizes visually (similar to GrandPerspective / WinDirStat but integrated)

### 6. Startup Manager
- Lists and manages:
  - Systemd user services (`~/.config/systemd/user/`)
  - XDG autostart entries (`~/.config/autostart/`)
  - Login shell profile scripts
- Enable/disable/remove startup items
- Shows estimated impact (resource usage of each)

### 7. System Overview / Health Monitor
- Real-time dashboard: CPU, RAM, disk usage, swap
- Top resource-consuming processes
- Quick actions: free up RAM (drop caches), flush DNS cache

---

## Tech Stack

### Core / Backend: **Rust**
- **Why**: System-level access, performance for scanning millions of files, memory safety, no GC pauses during large scans
- File scanning engine using `walkdir` + `rayon` (parallel directory walking)
- Package manager integration via subprocess calls (`apt`, `dnf`, `pacman`, `flatpak`, `snap`)
- System stats via `/proc`, `/sys`, `sysinfo` crate
- IPC with frontend via Tauri commands (JSON over IPC bridge)

### Frontend / UI: **Tauri v2 + React + TypeScript**
- **Why Tauri**: Native-feeling app, small binary (~5-10MB), uses system webview (WebKitGTK on Linux), Rust backend integration
- **Why React**: Rich component ecosystem, excellent for dashboards/data visualization
- UI framework: **shadcn/ui** (Tailwind-based, clean modern look)
- Charts/visualization: **Recharts** (disk usage charts), custom **treemap** component for Space Lens
- Animations: **Framer Motion** for polished transitions

### Data Storage: **SQLite** (via `rusqlite`)
- App installation tracking (for finding leftover files after uninstall)
- Scan history and statistics
- User preferences and ignore lists

### Packaging & Distribution
- `.deb` package (Ubuntu/Debian)
- `.rpm` package (Fedora/RHEL)
- Flatpak (universal)
- AppImage (portable)
- Tauri provides built-in bundling for `.deb` and `.AppImage`

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Tauri Shell                     │
│  ┌─────────────────────────────────────────────┐ │
│  │           React + TypeScript UI              │ │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────┐  │ │
│  │  │Smart │ │Junk  │ │Apps  │ │ Space     │  │ │
│  │  │Scan  │ │Clean │ │Mgr   │ │ Lens      │  │ │
│  │  └──┬───┘ └──┬───┘ └──┬───┘ └─────┬─────┘  │ │
│  │     │        │        │            │         │ │
│  │  ┌──┴────────┴────────┴────────────┴──────┐  │ │
│  │  │         Tauri IPC Bridge               │  │ │
│  │  └──┬─────────────────────────────────────┘  │ │
│  └─────┼────────────────────────────────────────┘ │
│        │                                          │
│  ┌─────▼────────────────────────────────────────┐ │
│  │              Rust Backend                     │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │  │Scanner   │ │Package   │ │System        │  │ │
│  │  │Engine    │ │Manager   │ │Monitor       │  │ │
│  │  │(walkdir  │ │Interface │ │(/proc, /sys) │  │ │
│  │  │+ rayon)  │ │(apt,dnf) │ │              │  │ │
│  │  └──────────┘ └──────────┘ └──────────────┘  │ │
│  │  ┌──────────┐ ┌──────────┐                    │ │
│  │  │SQLite DB │ │Safety    │                    │ │
│  │  │(history, │ │Database  │                    │ │
│  │  │tracking) │ │(protect  │                    │ │
│  │  │          │ │sys files)│                    │ │
│  │  └──────────┘ └──────────┘                    │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```
---

## Safety Approach

CleanMyLinux will maintain a **Safety Database** — a list of protected paths and patterns that must never be deleted:

- System-critical directories (`/usr`, `/bin`, `/lib`, `/etc`, `/boot`)
- Active package manager state files
- Running application configs
- User documents/projects (not in cache/tmp)
- Active database files

Every deletion operation goes through the safety layer. Items flagged by the scanner are categorized as:
- 🟢 **Safe**: Caches, tmp files, old logs — can be deleted without risk
- 🟡 **Review**: User configs from uninstalled apps — show to user for confirmation
- 🔴 **Protected**: System files — never deletable

All deletions use **trash** (move to `~/.local/share/Trash`) by default, with an option to permanently delete. An undo mechanism lets users recover recently cleaned files.

---

## UI Design Direction

- **Dark mode by default** with light mode toggle
- **Sidebar navigation**: Dashboard, System Junk, App Manager, Large Files, Space Lens, Startup, System Health
- **Animated progress rings** during scans
- **Color-coded categories** for junk types with size breakdowns
- Clean, spacious layout inspired by CleanMyMac's modern aesthetic
- Smooth transitions between views

---

## Implementation Phases

### Phase 1: Foundation (Core)
- Project scaffolding (Tauri + React + TypeScript)
- Sidebar layout, navigation, theming
- System Junk scanner (caches, logs, tmp, trash)
- Basic cleanup with trash support
- Smart Scan dashboard

### Phase 2: App Management
- Installed app discovery across package managers
- Leftover file detection (config, cache, data per app)
- Complete uninstall with cleanup
- App reset functionality

### Phase 3: Disk Analysis
- Large & Old File finder
- Space Lens treemap visualizer
- Duplicate file detection

### Phase 4: System Tools
- Startup manager
- System health monitor
- Performance quick actions

### Phase 5: Polish & Distribution
- Safety database hardening
- Undo/history system
- Package builds (`.deb`, `.AppImage`, Flatpak)
- README, screenshots, documentation

---

## Key Differentiators vs Existing Linux Tools

| Feature | BleachBit | Stacer | CleanMyLinux |
|---------|-----------|--------|--------------|
| Modern UI | ❌ Dated GTK2 | ⚠️ Qt (abandoned) | ✅ Modern web UI |
| Complete app uninstall | ❌ | ❌ | ✅ Finds all leftover files |
| Flatpak/Snap cleanup | ❌ | ❌ | ✅ |
| Disk visualization | ❌ | ❌ | ✅ Interactive treemap |
| Duplicate finder | ❌ | ❌ | ✅ |
| Startup manager | ❌ | ✅ Basic | ✅ systemd + XDG |
| Safety database | ⚠️ Basic | ❌ | ✅ Comprehensive |
| Actively maintained | ⚠️ Slow | ❌ (2020) | ✅ |
| Multi-distro support | ✅ | ⚠️ Ubuntu-focused | ✅ apt/dnf/pacman |

---

*Ready to begin implementation upon your approval. I recommend starting with Phase 1 (foundation + system junk scanner + Smart Scan dashboard) as the initial deliverable.*
