use std::collections::HashMap;
use std::process::Command;
use rayon::prelude::*;

use super::utils::{find_flatpak_icon, get_flatpak_app_version, find_icon_for_name};
use super::types::{AppUpdate};

/// Represents the response from the Arch Linux package API.
#[derive(serde::Deserialize)]
struct ArchApiPackage {
    pkgver: String,
    pkgrel: String,
}

/// Checks for updates on Arch Linux by querying the official JSON endpoint in parallel.
/// 
/// This function performs a two-step verification:
/// 1. Queries local installed versions using `pacman -Qi`.
/// 2. Queries synced mirrors (`pacman -Si`) and falls back to the Arch Linux web API.
/// 
/// # Arguments
/// * `target_apps` - A list of package names to check for updates.
/// 
/// # Returns
/// A `HashMap` mapping package names to their latest available version strings.
pub fn check_arch_updates(target_apps: &[String]) -> HashMap<String, String> {
    let mut available = HashMap::new();
    if target_apps.is_empty() {
        return available;
    }

    // Prepare list of lowercase package target identifiers
    let target_names: Vec<String> = target_apps
        .iter()
        .map(|id| id.split(':').next().unwrap_or(id).to_lowercase())
        .collect();

    // 1. Query local installed versions and architectures using efficient batching: pacman -Qi app1 app2 app3
    // Returns header layout per app containing fields like:
    // Name            : nano
    // Version         : 8.7.1-1
    // Architecture    : x86_64
    let mut local_versions = HashMap::new();
    let mut local_archs = HashMap::new();
    
    if let Ok(output) = Command::new("pacman").arg("-Qi").args(&target_names).output() {
        // Even if an invalid package sets exit code non-zero, pacman prints data for the valid ones to stdout!
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut cur_name = String::new();
        for line in stdout.lines() {
            if let Some((key, val)) = line.split_once(':') {
                let k = key.trim();
                let v = val.trim();
                if k == "Name" {
                    cur_name = v.to_lowercase();
                } else if k == "Version" && !cur_name.is_empty() {
                    local_versions.insert(cur_name.clone(), v.to_string());
                } else if k == "Architecture" && !cur_name.is_empty() {
                    local_archs.insert(cur_name.clone(), v.to_string());
                }
            }
        }
    }

    if local_versions.is_empty() {
        return available;
    }

    // 2. Query synced upstream mirrors using pacman -Si app1 app2 app3
    // This reads purely from local databases without locking transaction paths, returning fields like:
    // Repository      : core
    // Name            : curl
    // Version         : 8.20.0-6
    let mut sync_repos = HashMap::new();
    let mut sync_versions = HashMap::new();
    
    if let Ok(output) = Command::new("pacman").arg("-Si").args(&target_names).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut cur_repo = String::new();
        let mut cur_name = String::new();
        for line in stdout.lines() {
            if let Some((key, val)) = line.split_once(':') {
                let k = key.trim();
                let v = val.trim();
                if k == "Repository" {
                    cur_repo = v.to_lowercase();
                } else if k == "Name" {
                    cur_name = v.to_lowercase();
                    if !cur_repo.is_empty() {
                        sync_repos.insert(cur_name.clone(), cur_repo.clone());
                    }
                } else if k == "Version" && !cur_name.is_empty() {
                    sync_versions.insert(cur_name.clone(), v.to_string());
                }
            }
        }
    }

    // Setup an optimized blocking HTTP Client wrapper with reasonable connection timeouts
    let client = match reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .user_agent("CleanMyLinux-AppManager/0.1")
        .build() 
    {
        Ok(c) => c,
        Err(_) => return available,
    };

    // Default fallback repositories if `pacman -Si` returns no repository string
    let default_repos = [
        "extra", "core", "multilib",
        "extra-testing", "core-testing", "multilib-testing",
        "gnome-unstable", "kde-unstable"
    ];
    
    // Process targets in parallel using Rayon
    let results: Vec<(String, String)> = target_names
        .par_iter()
        .filter_map(|pkg_name| {
            let current_ver_full = local_versions.get(pkg_name)?;
            // Split off epoch if present in local version (e.g., "1:1.20-1" -> "1.20-1")
            let local_clean = current_ver_full.split(':').last().unwrap_or(current_ver_full);

            // Path A: If `pacman -Si` provided a synchronized upstream version string directly from DB cache,
            // verify update gap directly without consuming external network IO!
            if let Some(sync_ver) = sync_versions.get(pkg_name) {
                let sync_clean = sync_ver.split(':').last().unwrap_or(sync_ver);
                if local_clean != sync_clean {
                    return Some((pkg_name.clone(), sync_ver.clone()));
                }
                // Local version string matches synced DB mirror tag perfectly.
                return None;
            }

            // Path B: Fallback to querying upstream REST Archive APIs.
            // Dynamically resolve target Architecture string ("x86_64" or "any") to populate exact API parameter URL structure!
            let target_arch = local_archs.get(pkg_name).map(|s| s.as_str()).unwrap_or("x86_64");
            
            let candidate_repos: Vec<String> = match sync_repos.get(pkg_name) {
                Some(r) => vec![r.clone()],
                Option::None => default_repos.iter().map(|s| s.to_string()).collect(),
            };

            for repo in &candidate_repos {
                let url = format!("https://archlinux.org/packages/{}/{}/{}/json/", repo, target_arch, pkg_name);
                if let Ok(resp) = client.get(&url).send() {
                    if resp.status().is_success() {
                        if let Ok(api_data) = resp.json::<ArchApiPackage>() {
                            let upstream_ver = format!("{}-{}", api_data.pkgver, api_data.pkgrel);
                            if local_clean != upstream_ver {
                                return Some((pkg_name.clone(), upstream_ver));
                            }
                            break;
                        }
                    }
                }
            }
            None
        })
        .collect();

    available.extend(results);
    available
}

/// Parses DNF (Fedora/RHEL) output to identify available updates for specified applications.
/// 
/// # Arguments
/// * `stdout` - The raw string output from `dnf check-update`.
/// * `target_apps` - The list of applications we are interested in.
pub fn check_dnf_updates(stdout: &str, target_apps: &[String]) -> HashMap<String, String> {
    let mut available = HashMap::new();
    if target_apps.is_empty() {
        return available;
    }

    // Build an optimized HashSet containing candidate application basenames in lowercase
    let target_set: std::collections::HashSet<String> = target_apps
        .iter()
        .map(|id| id.split(':').next().unwrap_or(id).split('.').next().unwrap_or(id).to_lowercase())
        .collect();

    let mut parsing = false;
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() { continue; }
        if trimmed.starts_with("Last metadata expiration check:") || trimmed.starts_with("Repositories loaded.") {
            parsing = true;
            continue;
        }
        // Fallback: check if the line ends with status categories mapped in dnf5 ("updates", "docker-ce-stable", "cursor", "warpdotdev", etc.)
        // A clean, solid heuristic: check if line has at least 3 parts, and the second part looks like a version string (e.g. contains '-')
        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        let looks_like_package = parts.len() >= 3 && parts[1].contains('-');

        if parsing || looks_like_package {
            parsing = true;
            if trimmed.starts_with("Updating and loading") || trimmed.starts_with("Repositories loaded") {
                continue;
            }
            if parts.len() >= 2 {
                let pkg_name = parts[0].split('.').next().unwrap_or(parts[0]).to_lowercase();
                // Filter insertion instantly against candidate set to save immense heap computing allocations
                if target_set.contains(&pkg_name) {
                    available.insert(pkg_name, parts[1].to_string());
                }
            }
        }
    }
    available
}

/// Parses APT (Debian/Ubuntu) output to identify available updates for specified applications.
/// 
/// # Arguments
/// * `stdout` - The raw string output from `apt list --upgradable`.
/// * `target_apps` - The list of applications we are interested in.
pub fn check_apt_updates(stdout: &str, target_apps: &[String]) -> HashMap<String, String> {
    let mut available = HashMap::new();
    if target_apps.is_empty() {
        return available;
    }

    // Build an optimized HashSet containing candidate application basenames in lowercase
    let target_set: std::collections::HashSet<String> = target_apps
        .iter()
        .map(|id| id.split(':').next().unwrap_or(id).split('/').next().unwrap_or(id).to_lowercase())
        .collect();

    let mut merged_lines = Vec::new();
    for line in stdout.lines() {
        if line.starts_with("Listing...") { continue; }
        if line.starts_with(' ') && !merged_lines.is_empty() {
            let last_idx = merged_lines.len() - 1;
            merged_lines[last_idx] = format!("{} {}", merged_lines[last_idx], line.trim());
        } else if !line.trim().is_empty() {
            merged_lines.push(line.trim().to_string());
        }
    }

    for line in merged_lines {
        // Example format: sed/resolute-updates,resolute-security 4.9-2ubuntu1 amd64 [upgradable from: 4.9-2build3]
        if let Some((pkg_part, rest)) = line.split_once('/') {
            let pkg = pkg_part.trim().to_lowercase();
            // Filter instantly against candidate set to save extra heap allocations
            if !target_set.contains(&pkg) {
                continue;
            }

            let tokens: Vec<&str> = rest.split_whitespace().collect();
            if tokens.len() >= 2 {
                let new_ver = tokens[1].to_string();
                if !pkg.is_empty() && !pkg.contains("listing") {
                    available.insert(pkg, new_ver);
                }
            }
        }
    }
    available
}

/// Checks for available Flatpak updates by querying remote repositories.
/// 
/// This function executes `flatpak remote-ls --updates` and cross-references the results
/// with currently installed versions to determine if an update is required.
pub fn check_flatpak_updates(target_apps: &[String]) -> Vec<AppUpdate> {
    if target_apps.is_empty() {
        return vec![];
    }

    // Build an optimized lookup HashSet of candidate Flatpak Application IDs
    let target_set: std::collections::HashSet<String> = target_apps
        .iter()
        .map(|id| id.trim().to_string())
        .collect();

    let output = match Command::new("flatpak")
        .args([
            "remote-ls",
            "--updates",
            "--columns=name,application,version",
        ])
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

            if parts.len() < 3 {
                return None;
            }

            let app_id = parts[1].trim().to_string();

            // Filter out updates instantly if their package_id is not tracked by the frontend app list,
            // avoiding heavy disk lookups for versions and icon bases!
            if !target_set.contains(&app_id) {
                return None;
            }

            let name = parts[0].trim().to_string();
            let new_version = parts[2].trim().to_string();

            let current_version = get_flatpak_app_version(&app_id);

            Some(AppUpdate {
                name,
                package_id: app_id.clone(),
                current_version,
                new_version,
                source: "flatpak".to_string(),
                icon: find_flatpak_icon(&app_id),
            })
        })
        .collect()
}


/// Checks for available Snap updates by querying upstream channels.
/// 
/// Unlike Pacman or Flatpak, this function also handles version locking by checking
/// the `latest/stable` channel for each installed snap.
pub fn check_snap_updates(target_apps: &[String]) -> Vec<AppUpdate> {
    if target_apps.is_empty() {
        return vec![];
    }

    // Build an optimized lookup HashSet of candidate Snap package IDs
    let target_set: std::collections::HashSet<String> = target_apps
        .iter()
        .map(|id| id.trim().to_string())
        .collect();

    // 1. Get all locally installed snaps
    let output = match Command::new("snap").arg("list").output() {
        Ok(o) => o,
        Err(_) => return vec![],
    };
    let stdout = String::from_utf8_lossy(&output.stdout);
    
    stdout
        .lines()
        .skip(1) // Skip table header
        .filter_map(|line| {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 4 { return None; }

            let name = parts[0].to_string();

            // Filter out updates instantly if their package_id is not tracked by the frontend app list,
            // avoiding heavy synchronous sub-processes for upstream channels and base64 icon data rendering!
            if !target_set.contains(&name) {
                return None;
            }

            let current_version = parts[1].to_string();
            let tracking_channel = parts[3];

            // Ignore system foundational snaps
            if name == "core" || name.starts_with("core") || name == "snapd" || name == "bare" {
                return None;
            }

            // 2. Query snap info for this specific app to find the absolute latest stable version
            let info_output = Command::new("snap").args(["info", &name]).output().ok()?;
            let info_stdout = String::from_utf8_lossy(&info_output.stdout);
            
            let mut latest_stable = None;

            for info_line in info_stdout.lines() {
                let trimmed = info_line.trim();
                if trimmed.starts_with("latest/stable:") {
                    let info_parts: Vec<&str> = trimmed.split_whitespace().collect();
                    if info_parts.len() >= 2 {
                        latest_stable = Some(info_parts[1].to_string());
                    }
                    break;
                }
            }

            // 3. Compare current version to absolute latest stable version
            if let Some(new_version) = latest_stable {
                if current_version != new_version {
                    let icon_data = find_icon_for_name(&name);
                    
                    // Format message to show channel upgrade path if they are locked
                    let display_version = if tracking_channel != "latest/stable" && !tracking_channel.starts_with("latest") {
                        format!("{} (via latest/stable)", new_version)
                    } else {
                        new_version
                    };

                    return Some(AppUpdate {
                        name: name.clone(),
                        package_id: name.clone(),
                        current_version,
                        new_version: display_version,
                        source: "snap".to_string(),
                        icon: icon_data,
                    });
                }
            }
            None
        })
        .collect()
}

/// Entry point for checking native (non-sandboxed) updates across different package managers.
/// 
/// This function automatically detects the system's package manager (APT, DNF, or Pacman)
/// and executes the appropriate update check logic.
pub fn check_native_updates(target_apps: &[String]) -> HashMap<String, String> {
    let mut available = HashMap::new();

    // Try Debian/Ubuntu (apt list --upgradable)
    if let Ok(output) = Command::new("apt").args(["list", "--upgradable"]).output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            available.extend(check_apt_updates(&stdout, target_apps));
        }
    }

    // Try Fedora/RHEL (dnf check-update)
    if let Ok(output) = Command::new("dnf").args(["check-update"]).output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        available.extend(check_dnf_updates(&stdout, target_apps));
    }

    // Try Arch Linux (pacman) — Query upstream REST archive directly!
    // Passing the explicit slice of candidate apps saves massive local mapping computing overhead.
    if let Ok(st) = Command::new("pacman").arg("--version").output() {
        if st.status.success() {
            available.extend(check_arch_updates(target_apps));
        }
    }

    available
}