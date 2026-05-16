# CleanMyLinux — Internal AI Decision Engine

> The AI layer is **invisible** to the user. There is no "AI" label, no badges, no chatbot, no visible model. The user simply experiences an app that makes correct decisions: it knows which apps they installed, which are abandoned, what's safe to delete, and what looks suspicious. Internally, a set of ultra-lightweight ML models power these decisions.

> **Device constraint**: Every model must run instantly (< 1ms per prediction) on the weakest reasonable hardware — old laptops, Raspberry Pi 4, low-end VMs. No GPU. No large downloads. Total model weight < 2MB.

---

## 1. Decision Points — What the AI Decides

| # | Decision | Where Used | What the App Does With It |
|---|----------|-----------|---------------------------|
| 1 | **Is this a user-installed app or a system/dependency package?** | App Manager | Only shows user-installed apps by default. System deps are hidden unless the user expands "Show system packages." |
| 2 | **Is this app actively used, rarely used, or abandoned?** | App Manager | Sorts apps by relevance. Abandoned apps appear at the top of the uninstall suggestion list. |
| 3 | **Is this file safe to delete?** | System Junk, Large Files | Pre-checks safe items. Leaves risky items unchecked. Drives which items the "Clean" button will remove. |
| 4 | **Does this look like a threat?** | System Junk, Smart Scan | Flags suspicious files/directories for the Protection section. Warns the user. |
| 5 | **Are these files duplicates?** | Large Files | Groups duplicates together, suggests keeping one and removing the rest. |
| 6 | **What category does this file belong to?** | Large Files | Auto-sorts files into tabs: Downloads, Videos, Build Artifacts, Archives, Disk Images, etc. |
| 7 | **Which cleanup items should be recommended first?** | Smart Scan | Orders the scan results so the highest-impact, safest items appear at the top. |
| 8 | **Is this leftover from an uninstalled app?** | System Junk | Detects orphan config/cache/data directories whose parent app no longer exists. |

---

## 2. Model Architecture — Ultra-Lightweight

All models are **XGBoost gradient-boosted trees exported to ONNX format**. This is the ideal choice because:

- **Tiny**: A trained XGBoost model with 100 trees exports to ~30-80KB ONNX
- **Fast**: Tree traversal is pure branching logic — sub-millisecond on any CPU
- **No runtime dependency**: ONNX Runtime is the only dependency (~15MB shared lib, already needed for other things)
- **Proven**: Google Magika, fraud detection systems, and recommendation engines all use this exact pattern
- **Easy to train**: Training data is tabular features, not images or text — simple to collect and label
- **Deterministic**: Same input → same output, no randomness, no temperature

### Models Shipped With App

| Model File | Size | Input | Output | Decision |
|-----------|------|-------|--------|----------|
| `app_classifier.onnx` | ~40KB | 12 features about a package | `user_installed` probability (0-1) | User app vs system dep |
| `usage_scorer.onnx` | ~40KB | 8 features about access patterns | `abandoned` probability (0-1) | Active vs abandoned app |
| `safety_scorer.onnx` | ~50KB | 15 features about a file/dir | `safe_to_delete` probability (0-1) | Pre-check or leave unchecked |
| `threat_detector.onnx` | ~60KB | 18 features about a file | `threat` probability (0-1) | Flag for protection warning |
| `file_categorizer.onnx` | ~50KB | 10 features about a file | Category ID (0-8) | Assign to UI tab |
| `orphan_detector.onnx` | ~40KB | 9 features about a directory | `orphan` probability (0-1) | Leftover from removed app |

**Total model size: ~280KB**. Ships inside the app binary. Negligible.

For **duplicate detection**, no ML model is needed — use cryptographic hashing (blake3) for exact duplicates and perceptual hashing (pure Rust dhash/phash algorithm, zero model weight) for near-duplicate images.

---

## 3. Feature Engineering — What Each Model Sees

### 3.1 App Classifier (user-installed vs system)

Determines whether a package was intentionally installed by the user or is a system dependency/library.

```
Input features (12):
├── package_name_length           (int)     # user apps tend to have shorter, real names
├── has_desktop_file              (bool)    # .desktop file = GUI app = likely user-installed
├── has_icon                      (bool)    # has an icon in /usr/share/icons
├── is_lib_prefixed               (bool)    # name starts with "lib" → almost always a dep
├── dependency_count              (int)     # how many other packages depend on this
├── reverse_dependency_count      (int)     # how many packages this depends on
├── has_binary_in_path            (bool)    # has executable in /usr/bin or /usr/local/bin
├── installed_size_mb             (float)   # larger packages are often user apps
├── section_category              (enum→int)# apt section: utils, libs, devel, etc.
├── is_manual_install             (bool)    # apt: "manually installed" flag
├── source_type                   (enum→int)# apt=0, flatpak=1, snap=2, manual=3
└── description_word_count        (int)     # user apps have longer descriptions

Output: probability (0.0-1.0) that this is a user-installed application
Threshold: > 0.6 → show in App Manager, ≤ 0.6 → hide under "System packages"
```

**Key heuristics the model learns**:
- `lib*` packages with no .desktop file → system dep (99%+ of the time)
- Flatpak/Snap packages → almost always user-installed
- Packages with .desktop files and icons → user apps
- Packages marked "manually installed" by apt → strong user signal
- High reverse-dependency count → core system library

### 3.2 Usage Scorer (active vs abandoned)

Predicts whether the user will use this app again.

```
Input features (8):
├── days_since_last_launch        (int)     # from /proc or .local/share/recently-used
├── launch_count_last_30d         (int)     # how often opened in last 30 days
├── launch_count_last_90d         (int)     # how often opened in last 90 days
├── trend_direction               (float)   # +1 = increasing usage, -1 = decreasing
├── install_age_days              (int)     # how long ago was it installed
├── total_data_size_mb            (float)   # apps with lots of user data = more invested
├── is_daemon                     (bool)    # background services are "always in use"
└── app_category                  (enum→int)# browser, editor, game, media, dev-tool, etc.

Output: probability (0.0-1.0) that the app is abandoned
Threshold: > 0.75 → suggest for removal at top of list
```

**What the model learns**:
- Not opened in 90+ days + declining trend → likely abandoned
- Daemons/services should never be flagged as abandoned
- Games and media apps have bursty usage — longer window needed
- Dev tools may go unused for weeks then be needed → more conservative

### 3.3 Safety Scorer (safe to delete)

The core model. Decides whether a file/directory can be safely removed.

```
Input features (15):
├── path_type                     (enum→int)# cache=0, log=1, tmp=2, config=3, data=4, other=5
├── is_under_cache_dir            (bool)    # inside ~/.cache or /var/cache
├── is_under_config_dir           (bool)    # inside ~/.config or /etc
├── is_under_tmp                  (bool)    # inside /tmp or /var/tmp
├── is_trash                      (bool)    # inside ~/.local/share/Trash
├── file_age_days                 (int)     # days since creation
├── days_since_last_access        (int)     # from atime
├── days_since_last_modify        (int)     # from mtime
├── size_bytes                    (int)     # file size
├── parent_app_installed          (bool)    # is the owning application still installed?
├── parent_app_running            (bool)    # is the owning application currently running?
├── file_is_open                  (bool)    # does any process have this file open? (lsof)
├── extension_category            (enum→int)# log, cache, db, config, binary, text, media, etc.
├── is_regenerable                (bool)    # known cache pattern that auto-rebuilds
└── sibling_file_count            (int)     # many siblings = bulk cache, few = specific config

Output: probability (0.0-1.0) that deletion is safe
Threshold: > 0.8 → pre-check for cleanup, 0.5-0.8 → show but unchecked, < 0.5 → hide or warn
```

**What the model learns**:
- `~/.cache/*` with parent app installed → safe (app will rebuild it)
- Config files for running apps → never safe
- Old rotated logs in `/var/log/*.gz` → safe
- `/tmp` files older than 7 days → safe
- Trash items → always safe
- Files currently open by a process → never safe
- Flatpak/Snap unused runtimes → safe

### 3.4 Threat Detector

Flags files that look suspicious: unexpected binaries, world-writable scripts in startup dirs, known malware patterns.

```
Input features (18):
├── is_executable                 (bool)    # +x permission
├── is_hidden                     (bool)    # starts with .
├── is_in_startup_dir             (bool)    # in autostart, cron, systemd user dir
├── is_in_tmp                     (bool)    # executable in /tmp is suspicious
├── is_in_home_root               (bool)    # hidden executable in ~ root
├── file_size_bytes               (int)     # very small executables can be droppers
├── is_world_writable             (bool)    # insecure permissions
├── is_setuid                     (bool)    # setuid binary outside /usr
├── has_no_package_owner          (bool)    # not owned by any package manager
├── creation_recency_hours        (int)     # just appeared recently
├── name_entropy                  (float)   # random-looking names (e.g., "a8f3k2") are suspicious
├── is_shell_script               (bool)    # scripts in odd locations
├── has_network_strings           (bool)    # contains curl/wget/nc patterns (byte scan)
├── has_encoding_strings          (bool)    # contains base64/eval patterns
├── parent_dir_permissions        (int)     # parent dir security
├── owner_is_root                 (bool)    # root-owned file in user space
├── has_known_signature           (bool)    # matches known threat signature DB
└── was_recently_modified         (bool)    # modified in last 24h

Output: probability (0.0-1.0) that this is a threat
Threshold: > 0.7 → flag in Protection section, > 0.9 → strong warning
```

**What the model learns**:
- Hidden executables in /tmp with no package owner → very suspicious
- Setuid binaries outside /usr → flag
- Shell scripts in autostart with network-related strings → flag
- Recently appeared executables with random names → flag
- Known-good paths (/usr/bin/* owned by packages) → ignore

### 3.5 File Categorizer

Assigns files to categories for the Large Files UI tabs.

```
Input features (10):
├── extension                     (enum→int)# mapped: .mp4=video, .tar.gz=archive, .iso=disk-image
├── parent_dir_name               (enum→int)# Downloads, Documents, Videos, .cache, node_modules, target
├── path_depth                    (int)     # deep paths often = build artifacts
├── file_size_bytes               (int)     # ISOs are big, configs are small
├── mime_type_group               (enum→int)# from file magic bytes: video, image, text, binary
├── is_in_project_dir             (bool)    # contains .git sibling → project
├── is_build_artifact_pattern     (bool)    # target/, node_modules/, __pycache__/, .gradle/
├── name_contains_date            (bool)    # filenames with dates → often backups/recordings
├── is_compressed                 (bool)    # .zip, .tar, .gz, .7z, .rar
└── is_disk_image                 (bool)    # .iso, .img, .vmdk

Output: category ID
  0 = Documents
  1 = Downloads
  2 = Videos/Media
  3 = Archives
  4 = Disk Images
  5 = Build Artifacts
  6 = Application Data
  7 = Backups
  8 = Other

Used by: Large Files screen to auto-populate tabs
```

### 3.6 Orphan Detector

Detects leftover config/cache/data from applications that were uninstalled.

```
Input features (9):
├── dir_name                      (str→hash)# hashed directory name
├── is_under_config               (bool)    # ~/.config/<name>
├── is_under_local_share          (bool)    # ~/.local/share/<name>
├── is_under_cache                (bool)    # ~/.cache/<name>
├── matching_package_installed    (bool)    # is there a package matching this name?
├── matching_binary_exists        (bool)    # is there a binary matching this name in PATH?
├── matching_desktop_file_exists  (bool)    # is there a .desktop file for this?
├── dir_age_days                  (int)     # older orphans are more confident
└── last_modified_days            (int)     # not recently written to

Output: probability (0.0-1.0) that this is an orphan from a removed app
Threshold: > 0.8 → include in "Leftover files" section
```

**Key logic the model learns**:
- `~/.config/slack/` exists but `slack` is not installed and no `slack` binary → orphan
- `~/.cache/google-chrome/` but Chrome is installed → NOT orphan
- `~/.local/share/some-random-name/` with no matching package AND old → likely orphan

---

## 4. Duplicate Detection — No ML Needed

Duplicate detection uses pure algorithms, no model files:

### Exact Duplicates
1. Group files by size (same size = potential duplicate)
2. For same-size files, compute partial hash (first 4KB + last 4KB using blake3)
3. If partial hashes match, compute full file hash
4. Full hash match → exact duplicate

**Implementation**: Pure Rust with `blake3` crate. Parallelized with `rayon`.

### Near-Duplicate Images
1. Load image, resize to 8×8 grayscale
2. Compute difference hash (dHash) — 64-bit fingerprint
3. Compare fingerprints using Hamming distance
4. Distance < 10 → near duplicate

**Implementation**: Pure Rust with `image` crate. ~20 lines of code, zero model weight.

### Near-Duplicate Documents
1. Extract text from file (first 1KB)
2. Compute SimHash (locality-sensitive hash) on word trigrams
3. Compare SimHash values — Hamming distance < 5 → near duplicate

**Implementation**: Pure Rust, ~50 lines of code, zero model weight.

---

## 5. Rust Integration

### ONNX Runtime via `ort`

```toml
[dependencies]
ort = { version = "2.0.0-rc.12", features = ["load-dynamic"] }
```

### AI Engine Module Structure

```
src-tauri/src/
├── ai/
│   ├── mod.rs              # Public API: score_file(), classify_app(), etc.
│   ├── engine.rs           # Loads ONNX models, runs inference
│   ├── features.rs         # Feature extraction from file metadata
│   ├── app_classifier.rs   # User-installed vs system package logic
│   ├── usage_scorer.rs     # Active vs abandoned scoring
│   ├── safety_scorer.rs    # Safe-to-delete prediction
│   ├── threat_detector.rs  # Suspicious file detection
│   ├── file_categorizer.rs # Auto-categorization
│   ├── orphan_detector.rs  # Leftover detection
│   └── dedup.rs            # Duplicate detection (hash-based, no ML)
├── models/                 # ONNX model files (embedded in binary)
│   ├── app_classifier.onnx
│   ├── usage_scorer.onnx
│   ├── safety_scorer.onnx
│   ├── threat_detector.onnx
│   ├── file_categorizer.onnx
│   └── orphan_detector.onnx
```

### Core API (internal, never exposed to frontend as "AI")

```rust
/// The AI engine — loaded once at app startup, used throughout.
pub struct DecisionEngine {
    app_classifier: ort::Session,
    usage_scorer: ort::Session,
    safety_scorer: ort::Session,
    threat_detector: ort::Session,
    file_categorizer: ort::Session,
    orphan_detector: ort::Session,
}

impl DecisionEngine {
    /// Load all models from embedded bytes. Called once at startup.
    pub fn new() -> Result<Self>;

    /// Is this package a user-installed application?
    /// Returns probability 0.0–1.0. Used by App Manager to filter the list.
    pub fn is_user_app(&self, pkg: &PackageInfo) -> f32;

    /// Is this app likely abandoned?
    /// Returns probability 0.0–1.0. Used to sort apps by "should remove."
    pub fn abandonment_score(&self, app: &AppUsageInfo) -> f32;

    /// Is this file/directory safe to delete?
    /// Returns probability 0.0–1.0. Used to pre-check items in cleanup.
    pub fn safety_score(&self, item: &FileInfo) -> f32;

    /// Does this file look like a threat?
    /// Returns probability 0.0–1.0. Used by Protection module.
    pub fn threat_score(&self, item: &FileInfo) -> f32;

    /// What category does this file belong to?
    /// Returns a FileCategory enum. Used by Large Files tab sorting.
    pub fn categorize(&self, item: &FileInfo) -> FileCategory;

    /// Is this directory likely leftover from an uninstalled app?
    /// Returns probability 0.0–1.0. Used by System Junk orphan section.
    pub fn orphan_score(&self, dir: &DirInfo) -> f32;
}
```

### How It Integrates (Invisible to User)

```
Scanner finds 500 items
        │
        ▼
DecisionEngine.safety_score() runs on each item (< 0.1ms each = 50ms total)
        │
        ▼
Items with score > 0.8 → pre-checked in the UI
Items with score 0.5-0.8 → shown but unchecked
Items with score < 0.5 → hidden from default view
        │
        ▼
User sees a clean, correctly pre-selected list
They think: "this app just knows what to clean"
They don't know there's an ML model making the call
```

---

## 6. Training the Models

### Training Happens Offline (by us, not the user)

We train models using Python + XGBoost, export to ONNX, and ship the `.onnx` files.

```python
# train_safety_scorer.py (run by us during development)
import xgboost as xgb
import onnxmltools
from onnxconverter_common.data_types import FloatTensorType

# Training data: labeled dataset of files with safe/unsafe labels
# Built from:
#   1. Known-safe patterns (caches, tmp, logs) → label=1
#   2. Known-unsafe patterns (active configs, DBs) → label=0
#   3. Community-contributed labels from beta testers

model = xgb.XGBClassifier(
    n_estimators=100,    # 100 trees
    max_depth=6,         # shallow trees = fast inference
    learning_rate=0.1,
)
model.fit(X_train, y_train)

# Export to ONNX (~50KB file)
onnx_model = onnxmltools.convert_xgboost(
    model,
    initial_types=[('features', FloatTensorType([None, 15]))]
)
with open("models/safety_scorer.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
```

### Initial Training Data (Before We Have Real Users)

For v1, we bootstrap training data using **heuristic labeling**:

| Pattern | Label | Confidence |
|---------|-------|------------|
| `/var/cache/apt/archives/*.deb` | safe=1 | 100% |
| `~/.cache/thumbnails/*` | safe=1 | 100% |
| `~/.cache/mozilla/firefox/*/cache2/*` | safe=1 | 99% |
| `/tmp/*` older than 7 days | safe=1 | 95% |
| `~/.local/share/Trash/*` | safe=1 | 100% |
| `/var/log/*.gz` (rotated logs) | safe=1 | 95% |
| `~/.config/*/` for installed app | safe=0 | 100% |
| Files open by a running process | safe=0 | 100% |
| `~/.ssh/*` | safe=0 | 100% |
| `~/.gnupg/*` | safe=0 | 100% |
| Database files (*.db, *.sqlite) in active apps | safe=0 | 95% |

This gives us thousands of labeled samples to train an initial model. The model then **generalizes** to handle edge cases and unknown paths better than hardcoded rules.

### Adaptive Learning (Post-Launch)

After the app is in use, it silently learns from user behavior:

1. **User unchecks an item** that was pre-checked → signal: "model was wrong, this isn't safe"
2. **User checks an item** that was unchecked → signal: "model was too cautious"
3. Store these corrections in SQLite: `(feature_vector, user_decision, timestamp)`
4. Periodically retrain a **local adjustment layer** — a tiny logistic regression that shifts the base model's scores based on personal patterns
5. This local model is < 1KB and trains in milliseconds on-device

---

## 7. Performance Guarantees

| Metric | Target | How |
|--------|--------|-----|
| Model load time | < 50ms | Models are tiny, ONNX Runtime loads them fast |
| Per-item inference | < 0.1ms | XGBoost tree traversal is pure branching |
| Scoring 10,000 files | < 1 second | Parallelized with rayon, batched inference |
| RAM usage (all models) | < 5MB | Tiny model weights, ONNX Runtime overhead |
| Disk usage (all models) | ~280KB | Six small ONNX files |
| CPU architecture | x86_64, aarch64 | ONNX Runtime supports both |
| Min hardware | Raspberry Pi 4 | Pure CPU, no GPU, no AVX required |

---

## 8. What the User Experiences (No AI Visible)

The user never sees the word "AI" or "model" or "prediction." They see:

| What user sees | What's happening internally |
|----------------|---------------------------|
| App Manager shows "their" apps, not system libraries | `app_classifier.onnx` filtered the list |
| Unused apps appear at the top with "Not used in 90 days" | `usage_scorer.onnx` sorted them |
| System Junk has smart pre-selected checkboxes | `safety_scorer.onnx` decided what's safe |
| A "Leftover files (245 MB)" section appears | `orphan_detector.onnx` found orphans |
| Large Files are sorted into neat category tabs | `file_categorizer.onnx` assigned categories |
| Protection section warns about suspicious files | `threat_detector.onnx` flagged them |
| Duplicates are grouped together | blake3 + dhash algorithms found them |
| Smart Scan suggests "Clean 2.1 GB" with correct items | All models working together to pick the right set |

**The app just feels intelligent. That's the goal.**

---

## Summary

- **6 micro XGBoost models** (~40-60KB each, ~280KB total)
- **ONNX format** via `ort` crate (Rust bindings for ONNX Runtime)
- **Sub-millisecond inference** per item, runs on any CPU
- **No visible AI features** — models power internal decisions only
- **Heuristic-bootstrapped training** for v1, adaptive learning from user behavior post-launch
- **Duplicate detection** via pure algorithms (blake3 hash + perceptual hash), no ML needed
- **Zero user impact** — no downloads, no GPU, no setup, no "AI" in the UI
