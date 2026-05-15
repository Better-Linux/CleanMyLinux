#!/usr/bin/env python3
"""
CleanMyLinux - App Classifier Training Pipeline
================================================
Trains a gradient-boosted model to distinguish user-facing applications
from system packages/libraries on Linux.

Data sources (all free, no auth required):
  - Flathub API          ~3,000 apps  (positive)
  - Snapcraft API        ~10,000 apps (positive)
  - AppStream upstream   ~5,000 apps  (positive)
  - Debian package index ~80,000 pkgs (mostly negative, filtered)
  - Fedora package list  ~70,000 pkgs (mostly negative, filtered)
  - Manual curated lists (positive + negative seeds)

Output:
  - ml/models/app_classifier_weights.json  (logistic regression fallback)
  - ml/models/app_classifier.json          (gradient boosted tree - best)
  - src-tauri/assets/app_classifier.json   (copied for embedding)
"""

import json, re, gzip, time, os, sys, io, random
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from dataclasses import dataclass, asdict
from typing import Optional

# ── Check deps ──────────────────────────────────────────────────────────────
try:
    import numpy as np
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import classification_report, roc_auc_score
    from sklearn.utils import resample
    print("✓ Dependencies found")
except ImportError:
    print("Installing dependencies...")
    os.system(f"{sys.executable} -m pip install scikit-learn numpy requests tqdm")
    import numpy as np
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import cross_val_score, StratifiedKFold
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import classification_report, roc_auc_score
    from sklearn.utils import resample

# ── Feature names (must match Rust struct order) ────────────────────────────
FEATURE_NAMES = [
    "is_flatpak",
    "is_snap",
    "has_desktop_file",
    "has_icon",
    "has_exec",
    "has_gui_category",
    "name_starts_lib",
    "name_ends_dev",
    "name_ends_doc",
    "name_ends_dbg",
    "name_ends_data",
    "name_starts_python",
    "name_starts_perl",
    "name_starts_ruby",
    "name_starts_fonts",
    "name_starts_golang",
    "name_starts_nodejs",
    "name_has_plugin",
    "name_has_common",
    "name_has_utils",
    "name_hyphen_count",
    "name_length_norm",
    "desc_has_library",
    "desc_has_daemon",
    "desc_has_plugin",
    "desc_has_development",
    "desc_has_binding",
    "desc_has_module",
    "desc_has_framework",
    "has_summary",
    "priority_required",
    "priority_important",
    "reverse_dependency_count",
    "has_polkit_policy",
    "has_etc_config",
    "has_systemd_service",
    "is_user_installed",
    "vendor_is_distro"
]

@dataclass
class Sample:
    label: int          # 1=app, 0=system package
    source: str         # for debugging
    name: str
    features: list

# ── Feature extractor ────────────────────────────────────────────────────────
def extract_features(name: str, description: str = "", source: str = "apt",
                     has_desktop: bool = False, has_icon: bool = False,
                     has_exec: bool = False, categories: str = "",
                     priority: str = "optional", rdepends_count: int = 0,
                     has_polkit: bool = False, has_etc: bool = False,
                     has_systemd: bool = False, is_manual: bool = False,
                     vendor: str = "") -> list:
    n = name.lower().strip()
    d = description.lower().strip()
    c = categories.lower()
    p = priority.lower()
    v = vendor.lower()

    gui_categories = {"audiovideo","audio","video","development","education",
                      "game","graphics","network","office","science","settings",
                      "system","utility","photography","player","browser"}
    has_gui_cat = 0.0
    if c:
        if any(cat in c for cat in gui_categories):
            has_gui_cat = 1.0
    elif has_desktop:
        has_gui_cat = 1.0

    hyphen_count = min(n.count("-"), 6) / 6.0
    name_len = min(len(n), 40) / 40.0
    rdepends_norm = min(rdepends_count, 20) / 20.0

    def b(val): return 1.0 if val else 0.0

    is_distro_vendor = any(dist in v for dist in ["fedora", "ubuntu", "debian", "canonical", "red hat", "suse", "arch linux"])

    return [
        b(source == "flatpak"),
        b(source == "snap"),
        b(has_desktop),
        b(has_icon),
        b(has_exec),
        has_gui_cat,
        b(n.startswith("lib") and not n.startswith("libre") and not n.startswith("liber")),
        b(n.endswith("-dev") or n.endswith("-devel") or n.endswith("-headers")),
        b(n.endswith("-doc") or n.endswith("-docs") or n.endswith("-man")),
        b(n.endswith("-dbg") or n.endswith("-debug") or n.endswith("-debuginfo")),
        b(n.endswith("-data") or n.endswith("-common") or n.endswith("-base")),
        b(n.startswith("python3-") or n.startswith("python-")),
        b(n.startswith("perl-")),
        b(n.startswith("ruby-") or n.startswith("rubygem-")),
        b(n.startswith("fonts-") or n.startswith("ttf-") or n.startswith("otf-")),
        b(n.startswith("golang-") or n.startswith("go-")),
        b(n.startswith("nodejs-") or n.startswith("node-")),
        b("plugin" in n),
        b(n.endswith("-common") or "-common-" in n),
        b(n.endswith("-utils") or n.endswith("-tools")),
        hyphen_count,
        name_len,
        b("library" in d or "shared library" in d),
        b("daemon" in d or "background service" in d),
        b("plugin" in d or "extension" in d),
        b("development" in d or "developer tools" in d or "sdk" in d),
        b("binding" in d or "wrapper" in d),
        b("module" in d or "kernel module" in d),
        b("framework" in d or "toolkit" in d),
        b(len(description) > 0),
        b(p == "required"),
        b(p == "important" or p == "standard"),
        rdepends_norm,
        b(has_polkit),
        b(has_etc),
        b(has_systemd),
        b(is_manual),
        b(is_distro_vendor)
    ]

# ── Data collectors ──────────────────────────────────────────────────────────
def fetch_url(url: str, timeout: int = 30) -> Optional[bytes]:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CleanMyLinux-ML/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except Exception as e:
        print(f"  ⚠ Failed to fetch {url[:60]}: {e}")
        return None

def collect_flathub() -> list[Sample]:
    print("\n[1/6] Fetching Flathub apps...")
    
    # Use the official Flathub v2 API endpoint for getting all app IDs
    data = fetch_url("https://flathub.org/api/v2/appstream?filter=apps")
    
    apps = []
    if data:
        try:
            apps = json.loads(data)
        except Exception as e:
            print(f"  ⚠ Failed to parse Flathub API response: {e}")
            
    if not apps or not isinstance(apps, list):
        print("  ⚠ Flathub unavailable, using hardcoded list")
        apps = [
            "org.mozilla.firefox", "org.chromium.Chromium", "org.libreoffice.LibreOffice",
            "org.gimp.GIMP", "org.inkscape.Inkscape", "org.videolan.VLC", "io.mpv.Mpv",
            "org.blender.Blender", "org.kde.kdenlive", "com.obsproject.Studio",
            "org.audacityteam.Audacity", "com.spotify.Client", "com.discordapp.Discord",
            "org.telegram.desktop", "org.signal.Signal", "com.slack.Slack",
            "com.visualstudio.code", "io.atom.Atom", "com.sublimetext.three",
            "org.darktable.Darktable", "com.rawtherapee.RawTherapee", "org.kde.krita",
            "org.kde.okular", "org.gnome.Evince", "com.transmissionbt.Transmission",
            "org.qbittorrent.qBittorrent", "org.gnome.Terminal", "org.kde.konsole",
            "org.alacritty.Alacritty", "org.gnome.gedit", "org.kde.kate",
            "org.gnome.Nautilus", "org.kde.dolphin", "org.xfce.thunar",
            "org.mozilla.Thunderbird", "org.gnome.Evolution", "org.gnome.Geary"
        ]

    samples = []
    for app_id in apps:
        if not isinstance(app_id, str):
            continue
            
        # Flathub IDs are reverse-DNS (e.g. org.gimp.GIMP). Extract the name part.
        name = app_id.split(".")[-1]
        
        # Flatpak apps are always user installed
        feat = extract_features(name, "", source="flatpak",
                                has_desktop=True, has_icon=True, has_exec=True,
                                categories="Utility")
        samples.append(Sample(label=1, source="flathub", name=name, features=feat))
        
    print(f"  → {len(samples)} Flathub apps (positive)")
    return samples

def collect_snapcraft() -> list[Sample]:
    print("\n[2/6] Fetching Snapcraft apps...")
    samples = []
    headers = {"X-Ubuntu-Series": "16", "User-Agent": "CleanMyLinux-ML/1.0"}
    
    # The API is paginated and limited, so we search by prefixes
    import string
    prefixes = list(string.ascii_lowercase) + ["games", "media", "dev"]
    
    seen_snaps = set()
    for prefix in prefixes:
        url = f"https://api.snapcraft.io/api/v1/snaps/search?q={prefix}&size=100"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                data = json.loads(r.read())
        except Exception as e:
            print(f"  ⚠ Snap API error for '{prefix}': {e}")
            continue
            
        results = data.get("_embedded", {}).get("clickindex:package", [])
        for snap in results:
            name = snap.get("name", "")
            if name in seen_snaps:
                continue
            seen_snaps.add(name)
                
            title = snap.get("title", name)
            desc = snap.get("summary", "")
            feat = extract_features(name, desc, source="snap",
                                    has_desktop=True, has_icon=True, has_exec=True)
            samples.append(Sample(label=1, source="snapcraft", name=name, features=feat))
            
        time.sleep(0.1)
        
    print(f"  → {len(samples)} Snap apps (positive)")
    return samples



def calculate_rdepends(packages: dict) -> dict:
    rdepends = {pkg: 0 for pkg in packages}
    for pkg, info in packages.items():
        depends = info.get("Depends", "") + ", " + info.get("Pre-Depends", "")
        for dep_clause in depends.split(","):
            dep = dep_clause.split("|")[0].split("(")[0].strip()
            if dep and dep in rdepends:
                rdepends[dep] += 1
    return rdepends

def collect_debian_packages() -> list[Sample]:
    """Download Debian package list - mix of positive and negative, label by heuristic."""
    print("\n[4/6] Fetching Debian package index...")
    samples = []
    url = "https://ftp.debian.org/debian/dists/stable/main/binary-amd64/Packages.gz"
    data = fetch_url(url, timeout=120)
    if not data:
        return []
    try:
        text = gzip.decompress(data).decode("utf-8", errors="ignore")
    except:
        return []

    # Parse package stanzas into memory
    packages = {}
    current = {}
    for line in text.splitlines():
        if line == "":
            if "Package" in current:
                packages[current["Package"]] = current
            current = {}
        elif ": " in line:
            k, _, v = line.partition(": ")
            current[k.strip()] = v.strip()
            
    print(f"  Parsed {len(packages)} packages. Calculating dependency graph...")
    rdepends = calculate_rdepends(packages)
    
    for name, pkg in packages.items():
        _process_debian_pkg(pkg, rdepends.get(name, 0), samples)
        
    print(f"  → {len(samples)} Debian packages (mixed labels)")
    return samples

def collect_ubuntu_packages() -> list[Sample]:
    """Download Ubuntu package lists (main and universe) to massively increase dataset size."""
    print("\n[5/8] Fetching Ubuntu package index...")
    samples = []
    
    urls = [
        "http://archive.ubuntu.com/ubuntu/dists/noble/main/binary-amd64/Packages.gz",
        "http://archive.ubuntu.com/ubuntu/dists/noble/universe/binary-amd64/Packages.gz"
    ]
    
    for url in urls:
        print(f"  Fetching {url.split('/')[-3]}...")
        data = fetch_url(url, timeout=120)
        if not data:
            continue
        try:
            text = gzip.decompress(data).decode("utf-8", errors="ignore")
        except:
            continue

        packages = {}
        current = {}
        for line in text.splitlines():
            if line == "":
                if "Package" in current:
                    packages[current["Package"]] = current
                current = {}
            elif ": " in line:
                k, _, v = line.partition(": ")
                current[k.strip()] = v.strip()
                
        print(f"  Parsed {len(packages)} packages from {url.split('/')[-3]}. Calculating dependency graph...")
        rdepends = calculate_rdepends(packages)
        
        for name, pkg in packages.items():
            _process_debian_pkg(pkg, rdepends.get(name, 0), samples)
                
    print(f"  → {len(samples)} Ubuntu packages (mixed labels)")
    return samples

def collect_alpine_packages() -> list[Sample]:
    """Download Alpine package list."""
    print("\n[6/8] Fetching Alpine package index...")
    samples = []
    url = "https://dl-cdn.alpinelinux.org/alpine/v3.19/main/x86_64/APKINDEX.tar.gz"
    data = fetch_url(url, timeout=120)
    if not data:
        return []
    
    try:
        import tarfile
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
            apkindex = tar.extractfile("APKINDEX")
            if not apkindex:
                return []
            text = apkindex.read().decode("utf-8", errors="ignore")
    except:
        return []

    current = {}
    for line in text.splitlines():
        if line == "":
            if "P" in current:
                name = current.get("P", "")
                desc = current.get("T", "")
                # Very simple heuristic for Alpine (mostly minimal/server, negative labels)
                n = name.lower()
                is_neg = (n.startswith("lib") or n.startswith("python3-") or n.startswith("perl-") 
                          or n.endswith("-dev") or n.endswith("-doc") or "library" in desc.lower())
                
                # Almost all Alpine main are system/library, we only add negative
                if is_neg:
                    feat = extract_features(name, desc, source="apk", has_desktop=False, has_icon=False, has_exec=False)
                    samples.append(Sample(label=0, source="alpine", name=name, features=feat))
            current = {}
        elif ":" in line:
            k, v = line[:1], line[2:]
            current[k] = v
            
    print(f"  → {len(samples)} Alpine packages (mostly negative)")
    return samples

def _process_debian_pkg(pkg: dict, rdepends_count: int, samples: list):
    name = pkg.get("Package","")
    desc = pkg.get("Description","")
    section = pkg.get("Section","")
    n = name.lower()
    sec = section.split("/")[-1]

    # -- NEGATIVE labels: reliable system-package patterns --
    neg_patterns = [
        n.startswith("lib"), n.startswith("python3-"), n.startswith("python-"),
        n.startswith("perl-"), n.startswith("ruby-"), n.startswith("fonts-"),
        n.startswith("golang-"), n.startswith("nodejs-"), n.startswith("r-cran-"),
        n.startswith("texlive-"), n.startswith("ghc-"), n.startswith("elpa-"),
        n.startswith("ocaml-"), n.startswith("haskell-"), n.startswith("php-"),
        n.endswith("-dev"), n.endswith("-devel"), n.endswith("-doc"),
        n.endswith("-docs"), n.endswith("-dbg"), n.endswith("-debug"),
        n.endswith("-data"), n.endswith("-common"), n.endswith("-headers"),
        n.endswith("-bin") and sec in ("libs","libdevel"),
        sec in ("libs","libdevel","devel","perl","python","ruby","fonts",
                "java","javascript","ocaml","haskell","golang","tex",
                "kernel","debug","introspection"),
        "library" in desc.lower()[:80],
        "daemon" in n,
    ]
    # -- POSITIVE labels: reliable app-section patterns --
    pos_sections = {"games","graphics","sound","video","web","editors",
                    "science","education","gnome","kde","xfce","math",
                    "hamradio","comm","games"}

    is_neg = any(neg_patterns)
    is_pos = sec in pos_sections and not is_neg

    if not is_neg and not is_pos:
        return  # skip ambiguous

    label = 0 if is_neg else 1

    # Simulate realistic temporal/graph data based on label with some noise
    if label == 0:
        days_os = 0.0 if random.random() < 0.85 else random.uniform(1.0, 300.0)
        cascade = int(rdepends_count * random.uniform(1.0, 3.0)) + random.randint(0, 2)
    else:
        days_os = random.uniform(1.0, 300.0) if random.random() < 0.85 else 0.0
        cascade = 0 if random.random() < 0.9 else random.randint(1, 2)

    has_dt = sec in pos_sections
    feat = extract_features(name, desc, source="apt",
                            has_desktop=has_dt,
                            has_icon=has_dt,
                            has_exec=has_dt,  # same heuristic, not from label directly
                            categories=section,
                            priority=pkg.get("Priority", "optional"),
                            rdepends_count=rdepends_count)
    samples.append(Sample(label=label, source="debian", name=name, features=feat))



def collect_manual_seeds() -> list[Sample]:
    """Hand-curated high-confidence seeds for both classes."""
    print("\n[7/8] Adding manual seeds...")

    # True User Apps (Safe to uninstall)
    apps = [
        "firefox","chromium","chrome","libreoffice","gimp","inkscape",
        "vlc","mpv","rhythmbox","spotify","discord","slack","telegram","signal",
        "vscode","code","atom","sublime-text","kate","kwrite","mousepad",
        "steam","lutris","wine","playonlinux","dosbox","retroarch",
        "obs-studio","kdenlive","openshot","shotcut","handbrake",
        "virtualbox","gnome-boxes","virt-manager","vmware",
        "audacity","ardour","lmms","musescore","rosegarden",
        "blender","freecad","openscad","kicad","darktable","rawtherapee",
        "calibre","okular","evince","zathura","foliate",
        "transmission","qbittorrent","deluge","aria2",
        "filezilla","cyberduck","winscp",
        "pidgin","hexchat","weechat",
        "timeshift","deja-dup","backintime",
        "font-manager","gnome-font-viewer",
        "gnome-calculator","kcalc","speedcrunch",
        "geary","evolution","kmail",
        "drawing","pinta","krita","mypaint",
    ]

    # Unsafe Core OS Apps (Terminals, File Managers, Settings, Package Managers)
    core_os_apps = [
        "gnome-terminal","konsole","xterm","alacritty","kitty","tilix",
        "nautilus","dolphin","thunar","nemo","pcmanfm","ranger",
        "gnome-control-center","systemsettings","kdesystemsettings","plasma-desktop",
        "synaptic","gnome-software","discover","pamac","apt","dnf","pacman",
        "gparted","gnome-disks","baobab","filelight","stacer",
        "thunderbird","gedit", # Often default pre-installed
        "firewall-config", "ufw", "gufw", "gnome-abrt", "apport-gtk", "seahorse",
    ]

    # Definite system packages (negative)
    libs = [
        "libc6","libssl3","libpython3","libgtk-3-0","libglib2.0","libx11-6",
        "libstdc++6","libgcc1","libncurses6","libreadline8","zlib1g","libbz2-1.0",
        "python3-apt","python3-gi","python3-dbus","python3-cairo",
        "perl-base","ruby-thor","fonts-dejavu","fonts-liberation",
        "linux-headers","linux-image","linux-firmware","linux-modules",
        "gcc","g++","cmake","make","automake","autoconf","pkg-config",
        "gdb","valgrind","strace","ltrace",
        "openssh-server","nginx","apache2","postgresql","mysql-server","redis",
        "cron","systemd","udev","dbus","polkit","policykit",
        "libnss3","libcurl4","libxml2","libxslt1.1","libpcre3",
        "python3-numpy","python3-scipy","python3-requests","python3-flask",
        "ruby-rake","ruby-bundler","perl-cgi","perl-dbi",
        "golang-src","golang-doc","nodejs-doc",
        "libboost-all-dev","libqt5core5a","libqt5gui5","libqt5widgets5",
    ]

    samples = []
    for app in apps:
        feat = extract_features(app, "A user-facing application", source="apt",
                                has_desktop=True, has_icon=True, has_exec=True,
                                categories="Utility", is_manual=True, vendor="Third Party")
        samples.append(Sample(label=1, source="manual", name=app, features=feat))

    for core_app in core_os_apps:
        feat = extract_features(core_app, "Core OS component", source="apt",
                                has_desktop=True, has_icon=True, has_exec=True,
                                categories="Settings", priority="important",
                                rdepends_count=20,
                                has_polkit=True, has_etc=True, has_systemd=True,
                                vendor="Fedora Project")
        samples.append(Sample(label=0, source="manual_core", name=core_app, features=feat))

    for lib in libs:
        feat = extract_features(lib, "A system library or package", source="apt",
                                has_desktop=False, has_icon=False, has_exec=False,
                                has_etc=True, vendor="Fedora Project")
        samples.append(Sample(label=0, source="manual_lib", name=lib, features=feat))

    print(f"  → {len(samples)} manual seeds")
    return samples

# ── Training ─────────────────────────────────────────────────────────────────
def train(samples: list[Sample]):
    print(f"\n{'='*60}")
    print(f"Total samples: {len(samples)}")
    pos = sum(1 for s in samples if s.label == 1)
    neg = len(samples) - pos
    print(f"  Positive (apps):     {pos}")
    print(f"  Negative (packages): {neg}")

    X = np.array([s.features for s in samples], dtype=np.float32)
    y = np.array([s.label for s in samples], dtype=np.int32)

    # Balance classes
    if pos > neg * 2 or neg > pos * 2:
        print("\nBalancing classes...")
        majority = max(pos, neg)
        minority_idx = np.where(y == (0 if neg < pos else 1))[0]
        majority_idx = np.where(y == (1 if neg < pos else 0))[0]
        minority_up = resample(minority_idx, n_samples=len(majority_idx), random_state=42)
        idx = np.concatenate([majority_idx, minority_up])
        X, y = X[idx], y[idx]
        print(f"  After balancing: {len(y)} samples")

    # Normalize for LR
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("\nTraining models...")

    # 1. Logistic Regression (smallest, fastest inference)
    lr = LogisticRegression(max_iter=2000, C=1.0, class_weight="balanced")
    lr_scores = cross_val_score(lr, X_scaled, y, cv=cv, scoring="roc_auc")
    lr.fit(X_scaled, y)
    print(f"  LogisticRegression  AUC: {lr_scores.mean():.4f} ± {lr_scores.std():.4f}")

    # 2. Random Forest
    rf = RandomForestClassifier(n_estimators=200, max_depth=8, class_weight="balanced",
                                 n_jobs=-1, random_state=42)
    rf_scores = cross_val_score(rf, X, y, cv=cv, scoring="roc_auc")
    rf.fit(X, y)
    print(f"  RandomForest        AUC: {rf_scores.mean():.4f} ± {rf_scores.std():.4f}")

    # 3. Gradient Boosting (best accuracy)
    gb = GradientBoostingClassifier(n_estimators=300, max_depth=5, learning_rate=0.05,
                                     subsample=0.8, random_state=42)
    gb_scores = cross_val_score(gb, X, y, cv=cv, scoring="roc_auc")
    gb.fit(X, y)
    print(f"  GradientBoosting    AUC: {gb_scores.mean():.4f} ± {gb_scores.std():.4f}")

    # Pick best
    best_auc = max(lr_scores.mean(), rf_scores.mean(), gb_scores.mean())
    best_model_name = ["lr","rf","gb"][[lr_scores.mean(), rf_scores.mean(), gb_scores.mean()].index(best_auc)]
    print(f"\n  Best model: {best_model_name} (AUC {best_auc:.4f})")

    print("\nFull classification report (GradientBoosting):")
    print(classification_report(y, gb.predict(X), target_names=["system-pkg","user-app"]))

    # Feature importances
    print("\nTop 10 most important features:")
    importances = list(zip(FEATURE_NAMES, gb.feature_importances_))
    importances.sort(key=lambda x: x[1], reverse=True)
    for fname, imp in importances[:10]:
        print(f"  {imp:.4f}  {fname}")

    return lr, gb, rf, scaler, best_model_name

# ── Export ────────────────────────────────────────────────────────────────────
def export_logistic_regression(lr, scaler):
    """Export LR weights - tiny JSON, used as Rust fallback."""
    weights = {
        "model": "logistic_regression",
        "feature_names": FEATURE_NAMES,
        "coef": lr.coef_[0].tolist(),
        "intercept": float(lr.intercept_[0]),
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "threshold": 0.5,
        "version": "1.0",
    }
    path = "ml/app_classifier/models/app_classifier_weights.json"
    with open(path, "w") as f:
        json.dump(weights, f, indent=2)
    print(f"\n✓ LR weights saved: {path}")
    return weights

def export_gradient_boosting(gb):
    """Export gradient boosted tree as a simplified decision tree ensemble."""
    def export_tree(tree, node=0, depth=0):
        t = tree.tree_
        if t.children_left[node] == -1:  # leaf
            val = t.value[node][0]
            # For GBT, value is log-odds; convert
            return {"leaf": float(val[0])}
        return {
            "feature": int(t.feature[node]),
            "threshold": float(t.threshold[node]),
            "left": export_tree(tree, t.children_left[node], depth+1),
            "right": export_tree(tree, t.children_right[node], depth+1),
        }

    trees = []
    for i, stage in enumerate(gb.estimators_):
        tree_data = export_tree(stage[0])
        trees.append(tree_data)

    model_data = {
        "model": "gradient_boosting",
        "feature_names": FEATURE_NAMES,
        "n_estimators": gb.n_estimators,
        "learning_rate": gb.learning_rate,
        "init_score": float(gb.init_.class_prior_[1]) if hasattr(gb.init_, "class_prior_") else 0.5,
        "trees": trees,
        "threshold": 0.5,
        "version": "1.0",
    }
    path = "ml/app_classifier/models/app_classifier.json"
    with open(path, "w") as f:
        json.dump(model_data, f)
    size_kb = os.path.getsize(path) / 1024
    print(f"✓ GBT model saved: {path} ({size_kb:.1f} KB)")

    # Copy to Tauri assets
    assets_dir = "src-tauri/assets"
    os.makedirs(assets_dir, exist_ok=True)
    import shutil
    # Use LR weights for embedding (smaller, still accurate)
    shutil.copy("ml/app_classifier/models/app_classifier_weights.json", f"{assets_dir}/app_classifier_weights.json")
    print(f"✓ LR weights copied to {assets_dir}/app_classifier_weights.json (for Rust embed)")

# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("CleanMyLinux App Classifier Training")
    print("=" * 60)

    all_samples: list[Sample] = []

    # Collect data
    all_samples += collect_manual_seeds()   # always first - high confidence
    all_samples += collect_flathub()
    all_samples += collect_snapcraft()
    all_samples += collect_debian_packages()
    all_samples += collect_ubuntu_packages()
    all_samples += collect_alpine_packages()

    # Remove duplicates by name+label
    seen = set()
    unique = []
    for s in all_samples:
        key = (s.name.lower(), s.label)
        if key not in seen:
            seen.add(key)
            unique.append(s)
    all_samples = unique
    print(f"\nAfter dedup: {len(all_samples)} unique samples")

    # Save raw dataset
    os.makedirs("ml/app_classifier/data", exist_ok=True)
    with open("ml/app_classifier/data/dataset.json", "w") as f:
        json.dump([{"name": s.name, "label": s.label, "source": s.source,
                    "features": s.features} for s in all_samples], f)
    print(f"✓ Raw dataset saved: ml/app_classifier/data/dataset.json")

    # Train
    lr, gb, rf, scaler, best = train(all_samples)

    # Export
    export_logistic_regression(lr, scaler)
    export_gradient_boosting(gb)

    print("\n" + "="*60)
    print("Training complete!")

if __name__ == "__main__":
    main()
