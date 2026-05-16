use std::collections::HashMap;
use std::process::Command;
use rayon::prelude::*;

use super::types::{AppInfo};
use super::utils::{find_flatpak_icon, find_icon_for_name, parse_human_size};

/// Retrieves a list of all installed Flatpak applications in a single bulk subprocess call.
/// 
/// This is highly optimized to avoid per-application overhead by querying `flatpak list` 
/// with specific columns and parsing the tab-separated output.
pub fn get_flatpak_apps(seen: &mut HashMap<String, bool>) -> Vec<AppInfo> {
    let output = match Command::new("flatpak")
        .args(["list", "--app", "--columns=name,application,version,size"])
        .output()
    {
        Ok(o) => o,
        Err(_) => return vec![],
    };

    let stdout = match String::from_utf8(output.stdout) {
        Ok(s) => s,
        Err(_) => return vec![],
    };

    stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() < 2 {
                return None;
            }
            let name = parts[0].trim().to_string();
            let app_id = parts[1].trim().to_string();
            let version = parts.get(2).unwrap_or(&"").trim().to_string();

            let mut size: u64 = 0;
            if let Some(size_str) = parts.get(3) {
                size = parse_human_size(size_str);
            }

            let key = name.to_lowercase();
            if seen.contains_key(&key) {
                return None;
            }
            seen.insert(key, true);

            // Fast icon lookup — no shell, pure filesystem stat
            let icon = find_flatpak_icon(&app_id);
            let is_gui = icon.is_some();

            Some(AppInfo {
                name,
                package_id: app_id.clone(), // flatpak uses app_id (e.g. org.mozilla.firefox) for uninstall
                source: "flatpak".to_string(),
                version,
                size,
                description: app_id,
                icon,
                exec_path: None,
                is_gui,
                is_user_app: true,
                usage_score: 0.0,
                days_untouched: 0.0,
                categories: "Utility".to_string(),
                has_polkit: false,
                has_etc: false,
                has_systemd: false,
                is_manual: true,
                vendor: "Flathub".to_string(),
            })
        })
        .collect()
}

/// Retrieves core metadata (size, vendor, version) for all native system packages.
/// 
/// Automatically detects and supports both `dpkg` (Debian/Ubuntu) and `rpm` (Fedora/RHEL/SUSE) systems.
/// Returns a tuple of HashMaps containing sizes, vendors, and versions keyed by package name.
pub fn get_system_package_info() -> (HashMap<String, u64>, HashMap<String, String>, HashMap<String, String>) {
    let mut sizes = HashMap::new();
    let mut vendors = HashMap::new();
    let mut versions = HashMap::new();

    // Try Debian/Ubuntu (dpkg) - ONE call for all metadata
    if let Ok(output) = Command::new("dpkg-query")
        .args(["-W", "-f=${Package}\t${Installed-Size}\t${Maintainer}\t${Version}\n"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 4 {
                    let pkg = parts[0].to_lowercase();
                    if let Ok(size_kb) = parts[1].parse::<u64>() {
                        sizes.insert(pkg.clone(), size_kb * 1024);
                    }
                    vendors.insert(pkg.clone(), parts[2].to_string());
                    versions.insert(pkg, parts[3].to_string());
                }
            }
        }
    }

    // Try Fedora/RHEL/SUSE (rpm) - ONE call for all metadata
    if let Ok(output) = Command::new("rpm")
        .args(["-qa", "--queryformat", "%{NAME}\t%{SIZE}\t%{VENDOR}\t%{VERSION}\n"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 4 {
                    let pkg = parts[0].to_lowercase();
                    if let Ok(s) = parts[1].parse::<u64>() {
                        sizes.insert(pkg.clone(), s);
                    }
                    vendors.insert(pkg.clone(), parts[2].to_string());
                    versions.insert(pkg, parts[3].to_string());
                }
            }
        }
    }

    (sizes, vendors, versions)
}

/// Identifies packages that were explicitly installed by the user (not as dependencies).
/// 
/// Uses `dnf repoquery` for RPM systems and `apt-mark` for Debian/Ubuntu systems.
pub fn get_manual_packages() -> HashMap<String, bool> {
    let mut manual = HashMap::new();
    // Fedora - use cacheonly to prevent slow metadata refreshes
    if let Ok(output) = Command::new("dnf").args(["repoquery", "--userinstalled", "--cacheonly"]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let pkg = line.split('-').next().unwrap_or(line).to_lowercase();
                manual.insert(pkg, true);
            }
        }
    }
    // Ubuntu
    if let Ok(output) = Command::new("apt-mark").args(["showmanual"]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                manual.insert(line.to_lowercase(), true);
            }
        }
    }
    manual
}

/// Scans for packages that own Polkit security policy files in `/usr/share/polkit-1/actions/`.
pub fn get_packages_with_polkit() -> HashMap<String, bool> {
    let mut pkgs = HashMap::new();
    let actions_dir = std::path::Path::new("/usr/share/polkit-1/actions/");
    if actions_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(actions_dir) {
            let files: Vec<String> = entries.flatten()
                .filter(|e| e.path().extension().and_then(|ext| ext.to_str()) == Some("policy"))
                .filter_map(|e| e.path().to_str().map(|s| s.to_string()))
                .collect();

            if !files.is_empty() {
                // Use one bulk call to identify owners of all policies
                if let Ok(output) = Command::new("rpm").arg("-qf").args(&files).output() {
                    if output.status.success() {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        for line in stdout.lines() {
                            let pkg = line.trim().to_lowercase();
                            if !pkg.is_empty() && !pkg.contains("not owned") {
                                pkgs.insert(pkg, true);
                            }
                        }
                    }
                }
            }
        }
    }
    pkgs
}

/// Scans for packages that own configuration files located in the `/etc/` directory.
pub fn get_packages_with_etc() -> HashMap<String, bool> {
    let mut pkgs = HashMap::new();
    if let Ok(output) = Command::new("rpm").args(["-qa", "--queryformat", "%{NAME}\t%{CONFIGFILES}\n"]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 2 {
                    let pkg = parts[0].to_lowercase();
                    if parts[1].contains("/etc/") {
                        pkgs.insert(pkg, true);
                    }
                }
            }
        }
    }
    pkgs
}

/// Identifies packages that have associated systemd service files.
pub fn get_packages_with_systemd() -> HashMap<String, bool> {
    let mut pkgs = HashMap::new();
    for dir in &["/usr/lib/systemd/system", "/lib/systemd/system", "/etc/systemd/system"] {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                if entry.file_name().to_string_lossy().ends_with(".service") {
                    // Quick heuristic: file name without .service is often the package
                    let name = entry.file_name().to_string_lossy().replace(".service", "").to_lowercase();
                    pkgs.insert(name, true);
                }
            }
        }
    }
    pkgs
}

/// Retrieves version information for all installed Snap applications.
pub fn get_snap_versions() -> HashMap<String, String> {
    let mut versions = HashMap::new();
    if let Ok(output) = Command::new("snap").args(["list"]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    versions.insert(parts[0].to_lowercase(), parts[1].to_string());
                }
            }
        }
    }
    versions
}

/// Calculates the size of installed Snaps by measuring the corresponding `.snap` squashfs files.
pub fn get_snap_sizes() -> HashMap<String, u64> {
    let mut sizes = HashMap::new();
    if let Ok(entries) = std::fs::read_dir("/var/lib/snapd/snaps") {
        for entry in entries.flatten() {
            let fname = entry.file_name().to_string_lossy().to_string();
            if fname.ends_with(".snap") {
                if let Some(idx) = fname.rfind('_') {
                    let snap_name = &fname[..idx];
                    if let Ok(meta) = entry.metadata() {
                        sizes.insert(snap_name.to_lowercase(), meta.len());
                    }
                }
            }
        }
    }
    sizes
}

/// The primary orchestrator for scanning and identifying all desktop applications on the system.
/// 
/// This function:
/// 1. Locates all `.desktop` files across standard system and user directories.
/// 2. Performs high-speed parallel metadata retrieval for native packages, Snaps, and system properties.
/// 3. Parses all desktop files in parallel using `rayon` to extract names, icons, and executable paths.
/// 4. Harmonizes disparate data sources into a unified `AppInfo` model.
/// 5. Integrates Flatpak scanning as a final step.
pub fn get_all_desktop_apps() -> Vec<AppInfo> {
    let mut seen: HashMap<String, bool> = HashMap::new();

    let mut desktop_dirs = vec![
        "/usr/share/applications".to_string(),
        "/usr/local/share/applications".to_string(),
        "/var/lib/snapd/desktop/applications".to_string(),
    ];
    if let Ok(home) = std::env::var("HOME") {
        desktop_dirs.push(format!("{}/.local/share/applications", home));
    }

    let mut desktop_paths: Vec<std::path::PathBuf> = Vec::new();
    for dir in &desktop_dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                if entry.file_name().to_string_lossy().ends_with(".desktop") {
                    desktop_paths.push(entry.path());
                }
            }
        }
    }

    // PARALLEL PRE-FETCH: Run all subprocesses and IO tasks at once
    let (
        (pkg_sizes, pkg_vendors, pkg_versions),
        (manual_pkgs, polkit_pkgs, etc_pkgs, systemd_pkgs, snap_sizes, snap_versions)
    ) = rayon::join(
        || get_system_package_info(),
        || {
            let (m, p) = rayon::join(|| get_manual_packages(), || get_packages_with_polkit());
            let (e, s) = rayon::join(|| get_packages_with_etc(), || get_packages_with_systemd());
            let (ss, sv) = rayon::join(|| get_snap_sizes(), || get_snap_versions());
            (m, p, e, s, ss, sv)
        }
    );

    // Parse all desktop files IN PARALLEL — this is where the big speedup is
    let desktop_apps: Vec<AppInfo> = desktop_paths
        .par_iter()
        .filter_map(|path| {
            let content = std::fs::read_to_string(path).ok()?;
            let fname = path.file_name()?.to_string_lossy().to_string();
            let app_name = fname.replace(".desktop", "");

            let mut name = app_name.clone();
            let mut description = String::new();
            let mut icon_name = String::new();
            let mut exec_path = String::new();
            let mut categories = String::new();
            let mut hidden = false;
            let mut app_install_package = String::new();
            let mut snap_instance = String::new();

            for line in content.lines() {
                let line = line.trim();
                if line.starts_with("Name=") && name == app_name {
                    name = line["Name=".len()..].trim().to_string();
                } else if line.starts_with("Comment=") && description.is_empty() {
                    description = line["Comment=".len()..].trim().to_string();
                } else if line.starts_with("Icon=") && icon_name.is_empty() {
                    icon_name = line["Icon=".len()..].trim().to_string();
                } else if line.starts_with("Exec=") && exec_path.is_empty() {
                    exec_path = line["Exec=".len()..]
                        .split_whitespace()
                        .next()
                        .unwrap_or("")
                        .replace('"', "")
                        .to_string();
                } else if line.starts_with("Categories=") {
                    categories = line["Categories=".len()..].trim().to_string();
                } else if line.starts_with("X-SnapInstanceName=") {
                    snap_instance = line["X-SnapInstanceName=".len()..].trim().to_string();
                } else if line.starts_with("X-AppInstall-Package=") {
                    app_install_package = line["X-AppInstall-Package=".len()..].trim().to_string();
                } else if line == "NoDisplay=true" || line == "Hidden=true" {
                    hidden = true;
                }
            }

            if hidden {
                return None;
            }

            let icon = find_icon_for_name(&icon_name);
            let is_gui = icon.is_some();

            let exec_bin = std::path::Path::new(&exec_path)
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();
            let base_name = name.to_lowercase();

            let source = if path.to_string_lossy().contains("/snap/") || !snap_instance.is_empty() { "snap" } else { "Native" };

            let mut final_package_id = if source == "snap" {
                if !snap_instance.is_empty() {
                    snap_instance.clone()
                } else {
                    app_name.split('_').next().unwrap_or(&app_name).to_lowercase()
                }
            } else {
                if exec_bin.is_empty() { base_name.clone() } else { exec_bin.clone() }
            };

            let mut version = String::new();
            let mut size = 0;
            let mut vendor = String::new();

            // Try multiple lookup keys to find the package in the package manager
            let lookup_keys = if source == "snap" {
                vec![final_package_id.clone()]
            } else {
                let mut keys = Vec::new();
                if !app_install_package.is_empty() {
                    keys.push(app_install_package.to_lowercase());
                }
                keys.push(final_package_id.clone());
                keys.push(exec_bin.clone());
                keys.push(base_name.clone());
                keys.push(app_name.to_lowercase());
                keys
            };

            for key in lookup_keys {
                if source == "snap" {
                    if let Some(v) = snap_versions.get(&key) {
                        version = v.clone();
                        size = *snap_sizes.get(&key).unwrap_or(&0);
                        final_package_id = key;
                        break;
                    }
                } else {
                    if let Some(v) = pkg_versions.get(&key) {
                        version = v.clone();
                        size = *pkg_sizes.get(&key).unwrap_or(&0);
                        vendor = pkg_vendors.get(&key).cloned().unwrap_or_default();
                        final_package_id = key;
                        break;
                    }
                }
            }

            // Fallback to filesystem and live package query if version still empty
            let mut resolved_exec_path = String::new();
            if !exec_path.is_empty() {
                if !exec_path.starts_with('/') {
                    for d in &["/usr/bin", "/usr/local/bin", "/bin"] {
                        let candidate = format!("{}/{}", d, exec_path);
                        if std::path::Path::new(&candidate).exists() {
                            resolved_exec_path = candidate;
                            break;
                        }
                    }
                } else {
                    resolved_exec_path = exec_path.clone();
                }
            }

            // Fallback to filesystem metadata if size still zero
            if size == 0 && !resolved_exec_path.is_empty() {
                size = std::fs::metadata(&resolved_exec_path).map(|m| m.len()).unwrap_or(0);
            }

            let pkg_id_lower = final_package_id.to_lowercase();

            Some(AppInfo {
                name,
                package_id: final_package_id,
                source: source.to_string(),
                version,
                size,
                description,
                icon,
                exec_path: Some(exec_path),
                is_gui,
                is_user_app: true,
                usage_score: 0.0,
                days_untouched: 0.0,
                categories,
                has_polkit: polkit_pkgs.contains_key(&pkg_id_lower),
                has_etc: etc_pkgs.contains_key(&pkg_id_lower),
                has_systemd: systemd_pkgs.contains_key(&pkg_id_lower),
                is_manual: manual_pkgs.contains_key(&pkg_id_lower),
                vendor,
            })
        })
        .collect();

    // De-duplicate (sequential, but tiny list)
    let mut result: Vec<AppInfo> = Vec::new();
    for app in desktop_apps {
        let key = app.name.to_lowercase();
        if !seen.contains_key(&key) {
            seen.insert(key, true);
            result.push(app);
        }
    }

    // Flatpak — single bulk subprocess call
    let mut flatpak_apps = get_flatpak_apps(&mut seen);
    result.append(&mut flatpak_apps);

    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    result
}

/// Analyzes package dependencies and priorities (Dpkg/Debian specific implementation).
/// 
/// Returns a tuple containing priorities for packages and a count of reverse dependencies.
pub fn get_all_dependency_stats() -> (HashMap<String, String>, HashMap<String, usize>) {
    let mut priorities = HashMap::new();
    let mut rdepends = HashMap::new();

    if let Ok(contents) = std::fs::read_to_string("/var/lib/dpkg/status") {
        let mut current_pkg = String::new();
        for line in contents.lines() {
            if line.starts_with("Package: ") {
                current_pkg = line["Package: ".len()..].trim().to_string();
                rdepends.entry(current_pkg.clone()).or_insert(0);
            } else if line.starts_with("Priority: ") {
                priorities.insert(current_pkg.clone(), line["Priority: ".len()..].trim().to_string());
            } else if line.starts_with("Depends: ") || line.starts_with("Pre-Depends: ") {
                let deps_str = if line.starts_with("Depends: ") {
                    &line["Depends: ".len()..]
                } else {
                    &line["Pre-Depends: ".len()..]
                };
                for clause in deps_str.split(',') {
                    let first_alt = clause.split('|').next().unwrap_or("").trim();
                    let dep_name = first_alt.split(' ').next().unwrap_or("").trim();
                    if !dep_name.is_empty() {
                        *rdepends.entry(dep_name.to_string()).or_insert(0) += 1;
                    }
                }
            }
        }
    }

    (priorities, rdepends)
}