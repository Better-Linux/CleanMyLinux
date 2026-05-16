use std::path::Path;
use std::time::SystemTime;
use super::types::AppInfo;

/// Traverse candidate user profile directories to find the absolute latest interaction timestamp
pub fn calculate_usage_score(app: &AppInfo) -> (f32, f32) {
    let home = match std::env::var("HOME") {
        Ok(h) => h,
        Err(_) => return (0.0, 0.0),
    };

    let mut candidate_dirs = Vec::new();

    if app.source == "flatpak" {
        // Flatpak application state inside user's isolated directory
        let base = format!("{}/.var/app/{}", home, app.package_id);
        candidate_dirs.push(format!("{}/cache", base));
        candidate_dirs.push(format!("{}/config", base));
        candidate_dirs.push(format!("{}/data", base));
    } else if app.source == "snap" {
        // Snap runtime container states
        candidate_dirs.push(format!("{}/snap/{}/current", home, app.package_id));
        candidate_dirs.push(format!("{}/snap/{}/common", home, app.package_id));
    } else {
        // Native packages
        // 1. Executable binary access timestamp
        if let Some(exec) = &app.exec_path {
            let clean_exec = exec.split_whitespace().next().unwrap_or("");
            let bin_path = if !clean_exec.starts_with('/') {
                format!("/usr/bin/{}", clean_exec)
            } else {
                clean_exec.to_string()
            };
            candidate_dirs.push(bin_path);
        }
        // 2. Common user profile storage configs
        let name_lower = app.name.to_lowercase().replace(' ', "").replace('-', "");
        candidate_dirs.push(format!("{}/.config/{}", home, name_lower));
        candidate_dirs.push(format!("{}/.cache/{}", home, name_lower));
        candidate_dirs.push(format!("{}/.config/{}", home, app.package_id));
        candidate_dirs.push(format!("{}/.cache/{}", home, app.package_id));
    }

    let mut latest_ts: Option<SystemTime> = None;

    // Helper closure to update maximum discovered timestamp
    let mut update_ts = |ts: Option<SystemTime>| {
        if let Some(t) = ts {
            if let Some(curr) = latest_ts {
                if t > curr {
                    latest_ts = Some(t);
                }
            } else {
                latest_ts = Some(t);
            }
        }
    };

    for dir in candidate_dirs {
        let path = Path::new(&dir);
        if path.exists() {
            // Check top folder metadata
            if let Ok(meta) = path.metadata() {
                update_ts(meta.modified().ok());
                update_ts(meta.accessed().ok());
            }

            // If it's a directory, check direct subdirectories/files to detect active configuration cache updates
            if path.is_dir() {
                if let Ok(entries) = std::fs::read_dir(path) {
                    for entry in entries.flatten() {
                        if let Ok(meta) = entry.metadata() {
                            update_ts(meta.modified().ok());
                            update_ts(meta.accessed().ok());
                        }
                    }
                }
            }
        }
    }

    let days_untouched = match latest_ts {
        Some(ts) => match SystemTime::now().duration_since(ts) {
            Ok(dur) => dur.as_secs_f32() / 86400.0,
            Err(_) => 0.0, // Timestamp is in the future due to clock drift
        },
        Option::None => 15.0, // Default if folder is missing or application untouched
    };

    // Smooth continuous linear ramp from 14 to 90 days
    let score = if days_untouched <= 14.0 {
        0.0
    } else {
        ((days_untouched - 14.0) / (90.0 - 14.0)).min(1.0)
    };

    (score, days_untouched)
}
