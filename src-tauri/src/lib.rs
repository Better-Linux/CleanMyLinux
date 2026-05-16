use std::collections::HashMap;
use std::env;
use tauri::Manager;
use tauri_plugin_store::StoreExt;
mod system_info;
mod ai;

use system_info::{get_installed_apps, get_available_updates, run_app_updates, uninstall_app, request_sudo_session};

include!(concat!(env!("OUT_DIR"), "/cargo_env.rs"));

#[tauri::command]
fn get_app_metadata() -> HashMap<String, String> {
    let mut metadata = HashMap::new();
    for (key, value) in CARGO_ENV {
        metadata.insert(key.to_string(), value.to_string());
    }
    metadata
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_installed_apps,
            get_available_updates,
            run_app_updates,
            uninstall_app,
            request_sudo_session,
            get_app_metadata,
        ])
        .setup(|app| {
            let store = app.store("settings.json")?;
            
            // 2. Map the vector pairs into a JSON object format
            let store_map: HashMap<String, serde_json::Value> = store
                .entries()
                .into_iter()
                .collect();

            // 3. Serialize the map into standard JSON object notation
            let config_json = serde_json::to_string(&store_map)
                .unwrap_or_else(|_| "{}".to_string());

            if let Some(window) = app.get_webview_window("main") {
            
                let script = format!("window.__INITIAL_CONFIG__ = ({});", config_json);
                window.eval(&script).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}