use std::process::Command;
use tauri::Emitter;
use super::super::types::AppUpdate;
use super::super::ops::run_streaming;

/// Executes a batch update process for a list of target applications.
/// 
/// This function groups updates by their source (Native/Flatpak/Snap) and executes
/// them in optimized parallel streams, emitting `update-progress` events for each app.
#[tauri::command]
pub async fn run_app_updates(app: tauri::AppHandle, updates: Vec<AppUpdate>) -> Result<(), String> {
    if updates.is_empty() {
        return Ok(());
    }

    // Emit "updating" for each app before starting
    for update in &updates {
        let _ = app.emit("update-progress", serde_json::json!({
            "app_name": update.name,
            "status": "updating"
        }));
    }

    // Split target updates logically by provider
    let mut native_updates = Vec::new();
    let mut flatpak_updates = Vec::new();
    let mut snap_updates = Vec::new();

    for u in updates {
        match u.source.as_str() {
            "Native" => native_updates.push(u),
            "flatpak" => flatpak_updates.push(u),
            "snap" => snap_updates.push(u),
            _ => flatpak_updates.push(u),
        }
    }

    // STEP 1: Process Native Packages in a single unified TTY-style batch console invocation
    if !native_updates.is_empty() {
        let op_id = format!("batch-update-native-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
        let first_app = &native_updates[0];
        let base_title = "Updating System Packages".to_string();
        let target_apps_clone = native_updates.clone();

        let mut pkg_ids = Vec::new();
        for u in &native_updates {
            pkg_ids.push(u.package_id.clone());
        }

        let mut base_args: Vec<String> = Vec::new();
        let cmd = if let Ok(st) = Command::new("apt-get").arg("--version").output() {
            if st.status.success() {
                base_args.push("install".to_string());
                base_args.push("--only-upgrade".to_string());
                base_args.push("-y".to_string());
                base_args.extend(pkg_ids);
                "apt-get"
            } else if let Ok(st2) = Command::new("dnf").arg("--version").output() {
                if st2.status.success() {
                    base_args.push("upgrade".to_string());
                    base_args.push("--refresh".to_string());
                    base_args.push("-y".to_string());
                    base_args.extend(pkg_ids);
                    "dnf"
                } else {
                    base_args.push("-S".to_string());
                    base_args.push("--noconfirm".to_string());
                    base_args.extend(pkg_ids);
                    "pacman"
                }
            } else {
                base_args.push("-S".to_string());
                base_args.push("--noconfirm".to_string());
                base_args.extend(pkg_ids);
                "pacman"
            }
        } else if let Ok(st2) = Command::new("dnf").arg("--version").output() {
            if st2.status.success() {
                base_args.push("upgrade".to_string());
                base_args.push("--refresh".to_string());
                base_args.push("-y".to_string());
                base_args.extend(pkg_ids);
                "dnf"
            } else {
                base_args.push("-S".to_string());
                base_args.push("--noconfirm".to_string());
                base_args.extend(pkg_ids);
                "pacman"
            }
        } else {
            base_args.push("-S".to_string());
            base_args.push("--noconfirm".to_string());
            base_args.extend(pkg_ids);
            "pacman"
        };

        let arg_refs: Vec<&str> = base_args.iter().map(|s| s.as_str()).collect();

        let stream_result = run_streaming(
            &app,
            &op_id,
            &base_title,
            "Native",
            "update",
            cmd,
            &arg_refs,
            true,
            first_app.icon.clone(),
            Some(target_apps_clone),
        );

        // Broadcast specific individual completion statuses back to all items mapped in the batch
        for u in &native_updates {
            match &stream_result {
                Ok(()) => {
                    let _ = app.emit("update-progress", serde_json::json!({
                        "app_name": u.name,
                        "status": "done"
                    }));
                }
                Err(err_msg) => {
                    let _ = app.emit("update-progress", serde_json::json!({
                        "app_name": u.name,
                        "status": "error",
                        "error": err_msg
                    }));
                }
            }
        }
    }

    // STEP 2: Process Container Environments (Flatpak & Snap) via concurrent parallel batch pipes
    let mut join_handles = Vec::new();

    if !flatpak_updates.is_empty() {
        let app_clone = app.clone();
        let app_emitter = app.clone();
        join_handles.push(tauri::async_runtime::spawn(async move {
            let op_id = format!("batch-update-flatpak-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
            let base_title = "Updating Flatpak Apps".to_string();
            let first_icon = flatpak_updates[0].icon.clone();
            let target_apps_clone = flatpak_updates.clone();

            let mut pkg_ids = Vec::new();
            for u in &flatpak_updates {
                pkg_ids.push(u.package_id.clone());
            }

            let stream_res = tauri::async_runtime::spawn_blocking(move || {
                let mut base_args = vec!["update".to_string(), "-y".to_string()];
                base_args.extend(pkg_ids);
                let arg_refs: Vec<&str> = base_args.iter().map(|s| s.as_str()).collect();

                run_streaming(
                    &app_clone,
                    &op_id,
                    &base_title,
                    "flatpak",
                    "update",
                    "flatpak",
                    &arg_refs,
                    false,
                    first_icon,
                    Some(target_apps_clone),
                )
            })
            .await
            .unwrap_or(Err("Runtime join failure".to_string()));

            for u in &flatpak_updates {
                match &stream_res {
                    Ok(()) => {
                        let _ = app_emitter.emit("update-progress", serde_json::json!({
                            "app_name": u.name,
                            "status": "done"
                        }));
                    }
                    Err(err_msg) => {
                        let _ = app_emitter.emit("update-progress", serde_json::json!({
                            "app_name": u.name,
                            "status": "error",
                            "error": err_msg
                        }));
                    }
                }
            }
        }));
    }

    if !snap_updates.is_empty() {
        let app_clone = app.clone();
        let app_emitter = app.clone();
        join_handles.push(tauri::async_runtime::spawn(async move {
            let op_id = format!("batch-update-snap-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
            let base_title = "Updating Snap Apps".to_string();
            let first_icon = snap_updates[0].icon.clone();
            let target_apps_clone = snap_updates.clone();

            let mut pkg_ids = Vec::new();
            for u in &snap_updates {
                pkg_ids.push(u.package_id.clone());
            }

            let stream_res = tauri::async_runtime::spawn_blocking(move || {
                let mut base_args = vec!["refresh".to_string()];
                base_args.extend(pkg_ids);
                let arg_refs: Vec<&str> = base_args.iter().map(|s| s.as_str()).collect();

                run_streaming(
                    &app_clone,
                    &op_id,
                    &base_title,
                    "snap",
                    "update",
                    "snap",
                    &arg_refs,
                    true,
                    first_icon,
                    Some(target_apps_clone),
                )
            })
            .await
            .unwrap_or(Err("Runtime join failure".to_string()));

            for u in &snap_updates {
                match &stream_res {
                    Ok(()) => {
                        let _ = app_emitter.emit("update-progress", serde_json::json!({
                            "app_name": u.name,
                            "status": "done"
                        }));
                    }
                    Err(err_msg) => {
                        let _ = app_emitter.emit("update-progress", serde_json::json!({
                            "app_name": u.name,
                            "status": "error",
                            "error": err_msg
                        }));
                    }
                }
            }
        }));
    }

    for handle in join_handles {
        let _ = handle.await;
    }

    Ok(())
}
