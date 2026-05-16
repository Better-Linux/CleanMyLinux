use base64::Engine;
use std::process::Command;

/// Parses a human-readable size string (e.g., "1.5 GB", "500 MB") into a raw byte count (u64).
/// 
/// This function handles various whitespace characters (including non-breaking spaces)
/// and is case-insensitive regarding units.
/// 
/// ### Supported Units
/// - `B`, `bytes` (Multiplier: 1)
/// - `KB` (Multiplier: 1024)
/// - `MB` (Multiplier: 1024^2)
/// - `GB` (Multiplier: 1024^3)
/// - `TB` (Multiplier: 1024^4)
pub fn parse_human_size(s: &str) -> u64 {
    let s = s.trim().replace('\u{a0}', " ").replace('\u{202f}', " ");
    let parts: Vec<&str> = s.split_whitespace().collect();
    if parts.len() < 2 {
        return 0;
    }
    let value: f64 = parts[0].parse().unwrap_or(0.0);
    let unit = parts[1].to_lowercase();
    let multiplier: f64 = match unit.as_str() {
        "b" | "bytes" => 1.0,
        "kb" => 1024.0,
        "mb" => 1024.0 * 1024.0,
        "gb" => 1024.0 * 1024.0 * 1024.0,
        "tb" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => 1.0,
    };
    (value * multiplier) as u64
}

/// Reads a binary image file from disk and encodes it into a Base64 Data URL.
/// 
/// Automatically detects common image formats (PNG, SVG, XPM) to provide the correct MIME type.
/// 
/// Returns `None` if the file does not exist or is unreadable.
pub fn read_icon_as_data_url(path: &str) -> Option<String> {
    let p = std::path::Path::new(path);
    if !p.exists() { return None; }
    let data = std::fs::read(p).ok()?;
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "svg" => "image/svg+xml",
        "xpm" => "image/x-xpixmap",
        _ => "image/png",
    };
    let encoded = base64::engine::general_purpose::STANDARD.encode(&data);
    Some(format!("data:{};base64,{}", mime, encoded))
}

/// Scans a standard Freedesktop icon directory (hicolor) for a specific application icon.
/// 
/// Prioritizes larger resolutions (512x512 down to 32x32) and falls back to 
/// a recursive directory scan if the standard path structure is not found.
pub fn find_icon_in_dir(base: &str, app_id: &str) -> Option<String> {
    // Prefer larger sizes
    let sizes = ["512x512", "256x256", "128x128", "96x96", "64x64", "scalable", "48x48", "32x32"];
    let exts = ["png", "svg"];
    for size in &sizes {
        for ext in &exts {
            let p = format!("{}/hicolor/{}/apps/{}.{}", base, size, app_id, ext);
            if std::path::Path::new(&p).exists() {
                return read_icon_as_data_url(&p);
            }
        }
    }
    // Fallback: scan recursively for any matching file
    if let Ok(walker) = std::fs::read_dir(base) {
        for entry in walker.flatten() {
            let path = entry.path();
            if path.is_dir() {
                // Check one level deeper (size folder)
                if let Ok(inner) = std::fs::read_dir(&path) {
                    for inner_entry in inner.flatten() {
                        let ip = inner_entry.path();
                        if ip.is_dir() {
                            // apps subfolder
                            for ext in &exts {
                                let candidate = ip.join("apps").join(format!("{}.{}", app_id, ext));
                                if candidate.exists() {
                                    if let Some(s) = candidate.to_str() {
                                        return read_icon_as_data_url(s);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

/// Retrieves the version string of an installed Flatpak application by querying `flatpak info`.
pub fn get_flatpak_app_version(app_id: &str) -> String {
    if let Ok(output) = Command::new("flatpak")
        .args(["info", app_id])
        .output()
    {
        if let Ok(stdout) = String::from_utf8(output.stdout) {
            for line in stdout.lines() {
                let line = line.trim();
                if let Some(version) = line.strip_prefix("Version:") {
                    return version.trim().to_string();
                }
            }
        }
    }

    String::new()
}

/// Locates an icon for a Flatpak application by scanning both system and user-level 
/// Flatpak export directories and bundle internal storage.
pub fn find_flatpak_icon(app_id: &str) -> Option<String> {
    // 1. Flatpak global exports — symlinks but fastest
    let exports = format!("/var/lib/flatpak/exports/share/icons");
    if std::path::Path::new(&exports).exists() {
        if let Some(data) = find_icon_in_dir(&exports, app_id) {
            return Some(data);
        }
    }

    // 2. Inside the flatpak bundle itself
    let bundle_export = format!("/var/lib/flatpak/app/{}/current/active/export/share/icons", app_id);
    if std::path::Path::new(&bundle_export).exists() {
        if let Some(data) = find_icon_in_dir(&bundle_export, app_id) {
            return Some(data);
        }
    }

    // 3. Inside the bundle files (unexorted)
    let bundle_files = format!("/var/lib/flatpak/app/{}/current/active/files/share/icons", app_id);
    if std::path::Path::new(&bundle_files).exists() {
        if let Some(data) = find_icon_in_dir(&bundle_files, app_id) {
            return Some(data);
        }
    }

    // 4. User-level flatpak
    if let Ok(home) = std::env::var("HOME") {
        let user_exports = format!("{}/.local/share/flatpak/exports/share/icons", home);
        if std::path::Path::new(&user_exports).exists() {
            if let Some(data) = find_icon_in_dir(&user_exports, app_id) {
                return Some(data);
            }
        }
        let user_bundle = format!("{}/.local/share/flatpak/app/{}/current/active/export/share/icons", home, app_id);
        if std::path::Path::new(&user_bundle).exists() {
            if let Some(data) = find_icon_in_dir(&user_bundle, app_id) {
                return Some(data);
            }
        }
    }

    None
}

/// Search for an icon by name across all standard Linux icon themes and pixmaps.
/// 
/// This follows a simplified version of the Freedesktop Icon Theme Specification:
/// 1. Checks user-local themes (`~/.local/share/icons`)
/// 2. Checks system themes (`/usr/share/icons`)
/// 3. Falls back to the standard `hicolor` theme
/// 4. Final fallback to `/usr/share/pixmaps`
/// 
/// Supports absolute paths, PNG, SVG, and XPM formats.
pub fn find_icon_for_name(icon_name: &str) -> Option<String> {
    if icon_name.is_empty() { return None; }

    // Absolute path — read directly
    if icon_name.starts_with('/') {
        return read_icon_as_data_url(icon_name);
    }

    let sizes = ["256x256", "128x128", "scalable", "96x96", "64x64", "48x48", "32x32"];
    let exts = ["png", "svg", "xpm"];

    let mut theme_bases: Vec<String> = Vec::new();

    // 1. User-specific custom themes
    if let Ok(home) = std::env::var("HOME") {
        if let Ok(entries) = std::fs::read_dir(format!("{}/.local/share/icons", home)) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    theme_bases.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    // 2. System-wide installed themes (excluding hicolor for now)
    if let Ok(entries) = std::fs::read_dir("/usr/share/icons") {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name != "hicolor" && name != "default" {
                    theme_bases.push(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }

    // 3. Official hicolor fallback (where apps install their default icons)
    theme_bases.push("/usr/share/icons/hicolor".to_string());
    theme_bases.push("/usr/local/share/icons/hicolor".to_string());

    for base in &theme_bases {
        for size in &sizes {
            for ext in &exts {
                let p = format!("{}/{}/apps/{}.{}", base, size, icon_name, ext);
                if let Some(data) = read_icon_as_data_url(&p) {
                    return Some(data);
                }
            }
        }
    }

    // pixmaps fallback
    for ext in &exts {
        let p = format!("/usr/share/pixmaps/{}.{}", icon_name, ext);
        if let Some(data) = read_icon_as_data_url(&p) {
            return Some(data);
        }
    }

    None
}
