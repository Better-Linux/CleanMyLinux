pub mod types;
pub mod utils;

#[cfg(target_os = "linux")]
pub mod scanners;
#[cfg(target_os = "linux")]
pub mod sudo;
#[cfg(target_os = "linux")]
pub mod ops;
#[cfg(target_os = "linux")]
pub mod commands;
#[cfg(target_os = "linux")]
pub mod updates;
#[cfg(target_os = "linux")]
pub mod usage;

#[cfg(target_os = "linux")]
pub use sudo::{request_sudo_session};
#[cfg(target_os = "linux")]
pub use commands::{
    get_installed_apps,
    get_available_updates,
    run_app_updates,
    uninstall_app,
};

// Provide lightweight stubs for non-Linux platforms so the Tauri app can compile
// (useful for development on macOS). These return empty/default results.
#[cfg(not(target_os = "linux"))]
mod stub {
    use super::types::{AppUninstallItem, AppUpdate, SystemApps, UpdateInfo};

    #[tauri::command]
    pub async fn get_installed_apps() -> Result<SystemApps, String> {
        Ok(SystemApps { apps: vec![], total_count: 0, total_size: 0 })
    }

    #[tauri::command]
    pub async fn get_available_updates() -> Result<UpdateInfo, String> {
        Ok(UpdateInfo { total_count: 0, updates: vec![] })
    }

    #[tauri::command]
    pub async fn run_app_updates(_app: tauri::AppHandle, _updates: Vec<AppUpdate>) -> Result<(), String> {
        Ok(())
    }

    #[tauri::command]
    pub async fn uninstall_app(_app: tauri::AppHandle, _items: Vec<AppUninstallItem>) -> Result<(), String> {
        Ok(())
    }

    #[tauri::command]
    pub async fn request_sudo_session() -> Result<bool, String> {
        Ok(false)
    }
}

#[cfg(not(target_os = "linux"))]
pub use stub::{get_installed_apps, get_available_updates, run_app_updates, uninstall_app, request_sudo_session};
