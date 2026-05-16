use super::super::types::{AppUpdate, UpdateInfo};
use super::super::updates::{check_flatpak_updates, check_snap_updates, check_native_updates};
use super::get_installed_apps::get_installed_apps;

/// Queries available updates for all classified user applications.
/// 
/// Aggregates updates from Native (Pacman/APT/DNF), Flatpak, and Snap sources.
/// Results are filtered against the user's installed GUI application list.
#[tauri::command]
pub async fn get_available_updates() -> Result<UpdateInfo, String> {
    // 1. Get installed apps first (this includes classifier logic so we only track true user GUI applications)
    let system_apps = get_installed_apps().await?;
    let installed_apps = system_apps.apps;

    tauri::async_runtime::spawn_blocking(move || {
        // Extract candidate string IDs for flatpaks tracked by frontend GUI mapping
        let flatpak_target_ids: Vec<String> = installed_apps
            .iter()
            .filter(|a| a.source == "flatpak")
            .map(|a| a.package_id.clone())
            .collect();

        let flatpak_updates = check_flatpak_updates(&flatpak_target_ids);
        // Extract candidate string IDs for snaps tracked by frontend GUI mapping
        let snap_target_ids: Vec<String> = installed_apps
            .iter()
            .filter(|a| a.source == "snap")
            .map(|a| a.package_id.clone())
            .collect();

        let snap_updates = check_snap_updates(&snap_target_ids);

        let mut all_updates = flatpak_updates;
        all_updates.extend(snap_updates);

        // Extract keys for Native apps to narrow search scope down to explicit frontend apps
        let native_target_ids: Vec<String> = installed_apps
            .iter()
            .filter(|a| a.source == "Native")
            .map(|a| a.package_id.clone())
            .collect();

        // Map updates for Native apps present in the system update map
        let native_map = check_native_updates(&native_target_ids);

        for app in installed_apps {
            if app.source == "Native" {
                // Try looking up by package_id, package_id stripped of architecture, or name lowercase
                let bare_id = app.package_id.split(':').next().unwrap_or(&app.package_id);
                let bare_dot = bare_id.split('.').next().unwrap_or(bare_id);
                let candidate_keys = vec![
                    app.package_id.clone(),
                    app.package_id.to_lowercase(),
                    bare_id.to_lowercase(),
                    bare_dot.to_lowercase(),
                    app.name.to_lowercase(),
                ];
                for key in candidate_keys {
                    if let Some(new_version) = native_map.get(&key) {
                        all_updates.push(AppUpdate {
                            name: app.name.clone(),
                            package_id: app.package_id.clone(),
                            current_version: app.version.clone(),
                            new_version: new_version.clone(),
                            source: "Native".to_string(),
                            icon: app.icon.clone(),
                        });
                        break;
                    }
                }
            }
        }

        let total_count = all_updates.len();

        Ok(UpdateInfo {
            total_count,
            updates: all_updates
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
