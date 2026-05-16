use rayon::prelude::*;
use crate::ai::{AppClassifier, AppFeatures};
use super::super::types::{AppInfo, SystemApps};
use super::super::scanners::{get_all_dependency_stats, get_all_desktop_apps};
use super::super::usage::calculate_usage_score;

/// Fetches all user applications installed on the system.
/// 
/// This function:
/// 1. Scans desktop entries and sandboxed runtimes (Flatpak/Snap).
/// 2. Uses an ML classifier to filter out system libraries and background services.
/// 3. Calculates usage scores based on access time.
/// 4. Protects system-critical applications from being flagged as "unused".
#[tauri::command]
pub async fn get_installed_apps() -> Result<SystemApps, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let all_apps = get_all_desktop_apps();
        let classifier = AppClassifier::new();
        
        let (priorities, rdepends) = get_all_dependency_stats();

        // Use ML classifier to filter real user applications
        let apps: Vec<AppInfo> = all_apps
            .into_par_iter()
            .filter_map(|app| {
                let has_desktop = true; // Apps here are from desktop paths or flatpak
                let has_icon = app.icon.is_some();
                let has_exec = app.exec_path.is_some() || app.source == "flatpak" || app.source == "snap";
                
                let priority = if app.source == "Native" {
                    priorities.get(&app.package_id).cloned().unwrap_or_else(|| "optional".to_string())
                } else {
                    "optional".to_string()
                };
                
                let rdepends_count = if app.source == "Native" {
                    *rdepends.get(&app.package_id).unwrap_or(&0)
                } else {
                    0
                };
                
                let features = AppFeatures::from_package(
                    &app.name, &app.source, &app.description,
                    has_desktop, has_icon, has_exec, &app.categories,
                    &priority, rdepends_count,
                    app.has_polkit, app.has_etc, app.has_systemd, app.is_manual,
                    &app.vendor
                );
                
                if classifier.is_user_app(&features) {
                    let (mut usage_score, days_untouched) = calculate_usage_score(&app);
                    
                    // HARD FILTER: Never flag system-critical apps as "unused" (score 0.0)
                    // even if the AI or usage metrics suggested it. We protect apps that
                    // possess "System DNA" like Polkit policies or Systemd services.
                    let has_system_dna = app.has_polkit || app.has_systemd || app.has_etc || !app.is_manual;
                    if app.source == "Native" && has_system_dna {
                        usage_score = 0.0;
                    }

                    Some(AppInfo {
                        usage_score,
                        days_untouched,
                        ..app
                    })
                } else {
                    None
                }
            })
            .collect();

        let total_size: u64 = apps.iter().map(|a| a.size).sum();
        let total_count = apps.len();

        Ok(SystemApps {
            apps,
            total_count,
            total_size,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
