use tauri::Emitter;
use super::super::types::{AppUninstallItem, AppUpdate, OperationProgress};
use super::super::sudo::detect_pkg_manager;
use super::super::ops::run_streaming;

/// Uninstalls one or more applications from the system.
/// 
/// This function:
/// 1. Groups target applications by their source (Native/Flatpak/Snap).
/// 2. Executes uninstallation commands for each group.
/// 3. Automatically detects the system package manager (APT/DNF/Pacman) for native uninstalls.
/// 4. Handles authentication escalation seamlessly when required.
#[tauri::command]
pub async fn uninstall_app(
    app_handle: tauri::AppHandle,
    apps: Vec<AppUninstallItem>,
) -> Result<(), String> {
    if apps.is_empty() {
        return Ok(());
    }

    // Group target packages by execution source
    let mut native_apps = Vec::new();
    let mut flatpak_apps = Vec::new();
    let mut snap_apps = Vec::new();

    for a in apps {
        match a.source.as_str() {
            "Native" => native_apps.push(a),
            "flatpak" => flatpak_apps.push(a),
            "snap" => snap_apps.push(a),
            _ => flatpak_apps.push(a),
        }
    }

    // STEP 1: Process Native Packages via single unified console removal
    if !native_apps.is_empty() {
        let op_id = format!("batch-uninstall-native-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
        let first_app = &native_apps[0];
        let base_title = if native_apps.len() == 1 {
            first_app.name.clone()
        } else {
            "System Packages".to_string()
        };
        let first_icon = first_app.icon.clone();
        let target_updates: Vec<AppUpdate> = native_apps.iter().map(|i| AppUpdate {
            name: i.name.clone(),
            package_id: i.package_id.clone(),
            current_version: "".to_string(),
            new_version: "".to_string(),
            source: i.source.clone(),
            icon: i.icon.clone(),
        }).collect();

        let mut pkg_ids = Vec::new();
        for a in &native_apps {
            pkg_ids.push(a.package_id.clone());
        }

        match detect_pkg_manager() {
            Some((mgr, base_args)) => {
                let mut actual_args = base_args.clone();
                actual_args.extend(pkg_ids.iter().map(|s| s.as_str()));

                let _ = app_handle.emit("operation-progress", OperationProgress {
                    id: op_id.clone(),
                    op_type: "uninstall".to_string(),
                    app_name: base_title.clone(),
                    status: "running".to_string(),
                    progress: 0.05,
                    message: "Preparing native package uninstallation batch…".to_string(),
                    icon: first_icon.clone(),
                });

                // Try non-interactive cache run first
                let direct_success = run_streaming(
                    &app_handle,
                    &op_id,
                    &base_title,
                    "Native",
                    "uninstall",
                    mgr,
                    &actual_args,
                    false,
                    first_icon.clone(),
                    Some(target_updates.clone()),
                ).is_ok();

                if direct_success {
                    let _ = app_handle.emit("operation-progress", OperationProgress {
                        id: op_id.clone(),
                        op_type: "uninstall".to_string(),
                        app_name: base_title.clone(),
                        status: "done".to_string(),
                        progress: 1.0,
                        message: "Successfully removed system packages.".to_string(),
                        icon: first_icon.clone(),
                    });
                } else {
                    let _ = app_handle.emit("operation-progress", OperationProgress {
                        id: op_id.clone(),
                        op_type: "uninstall".to_string(),
                        app_name: base_title.clone(),
                        status: "running".to_string(),
                        progress: 0.08,
                        message: "Requesting administrator permission…".to_string(),
                        icon: first_icon.clone(),
                    });

                    match run_streaming(
                        &app_handle,
                        &op_id,
                        &base_title,
                        "Native",
                        "uninstall",
                        mgr,
                        &actual_args,
                        true,
                        first_icon.clone(),
                        Some(target_updates.clone()),
                    ) {
                        Ok(()) => {
                            let _ = app_handle.emit("operation-progress", OperationProgress {
                                id: op_id.clone(),
                                op_type: "uninstall".to_string(),
                                app_name: base_title.clone(),
                                status: "done".to_string(),
                                progress: 1.0,
                                message: "Successfully removed system packages.".to_string(),
                                icon: first_icon.clone(),
                            });
                        }
                        Err(e) => {
                            let _ = app_handle.emit("operation-progress", OperationProgress {
                                id: op_id.clone(),
                                op_type: "uninstall".to_string(),
                                app_name: base_title.clone(),
                                status: "error".to_string(),
                                progress: 0.0,
                                message: if e.is_empty() { "Authentication cancelled or failed.".to_string() } else { e.clone() },
                                icon: first_icon.clone(),
                            });
                            return Err(e);
                        }
                    }
                }
            }
            Option::None => return Err("No supported package manager found.".to_string()),
        }
    }

    // STEP 2: Process Container Environments (Flatpak & Snap) via concurrent parallel pipes
    let mut join_handles = Vec::new();

    if !flatpak_apps.is_empty() {
        let app_clone = app_handle.clone();
        join_handles.push(tauri::async_runtime::spawn(async move {
            let op_id = format!("batch-uninstall-flatpak-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
            let first_app = &flatpak_apps[0];
            let base_title = if flatpak_apps.len() == 1 {
                first_app.name.clone()
            } else {
                "Flatpak Packages".to_string()
            };
            let first_icon = first_app.icon.clone();
            let target_updates: Vec<AppUpdate> = flatpak_apps.iter().map(|i| AppUpdate {
                name: i.name.clone(),
                package_id: i.package_id.clone(),
                current_version: "".to_string(),
                new_version: "".to_string(),
                source: i.source.clone(),
                icon: i.icon.clone(),
            }).collect();

            let mut pkg_ids = Vec::new();
            for a in &flatpak_apps {
                pkg_ids.push(a.package_id.clone());
            }

            let res = tauri::async_runtime::spawn_blocking(move || {
                let mut base_args = vec!["uninstall".to_string(), "-y".to_string(), "--noninteractive".to_string()];
                base_args.extend(pkg_ids);
                let arg_refs: Vec<&str> = base_args.iter().map(|s| s.as_str()).collect();

                let _ = app_clone.emit("operation-progress", OperationProgress {
                    id: op_id.clone(),
                    op_type: "uninstall".to_string(),
                    app_name: base_title.clone(),
                    status: "running".to_string(),
                    progress: 0.05,
                    message: "Preparing Flatpak uninstallation batch…".to_string(),
                    icon: first_icon.clone(),
                });

                let mut elev_args = vec!["-n", "flatpak"];
                elev_args.extend(arg_refs.iter().copied());

                let direct_success = run_streaming(&app_clone, &op_id, &base_title, "flatpak", "uninstall", "sudo", &elev_args, false, first_icon.clone(), Some(target_updates.clone())).is_ok()
                    || run_streaming(&app_clone, &op_id, &base_title, "flatpak", "uninstall", "flatpak", &arg_refs, false, first_icon.clone(), Some(target_updates.clone())).is_ok();

                if direct_success {
                    let _ = app_clone.emit("operation-progress", OperationProgress {
                        id: op_id.clone(),
                        op_type: "uninstall".to_string(),
                        app_name: base_title.clone(),
                        status: "done".to_string(),
                        progress: 1.0,
                        message: "Successfully removed Flatpak packages.".to_string(),
                        icon: first_icon.clone(),
                    });
                    Ok(())
                } else {
                    let _ = app_clone.emit("operation-progress", OperationProgress {
                        id: op_id.clone(),
                        op_type: "uninstall".to_string(),
                        app_name: base_title.clone(),
                        status: "running".to_string(),
                        progress: 0.08,
                        message: "Requesting administrator permission…".to_string(),
                        icon: first_icon.clone(),
                    });

                    match run_streaming(&app_clone, &op_id, &base_title, "flatpak", "uninstall", "flatpak", &arg_refs, true, first_icon.clone(), Some(target_updates.clone())) {
                        Ok(()) => {
                            let _ = app_clone.emit("operation-progress", OperationProgress {
                                id: op_id.clone(),
                                op_type: "uninstall".to_string(),
                                app_name: base_title.clone(),
                                status: "done".to_string(),
                                progress: 1.0,
                                message: "Successfully removed Flatpak packages.".to_string(),
                                icon: first_icon.clone(),
                            });
                            Ok(())
                        }
                        Err(e) => {
                            let _ = app_clone.emit("operation-progress", OperationProgress {
                                id: op_id.clone(),
                                op_type: "uninstall".to_string(),
                                app_name: base_title.clone(),
                                status: "error".to_string(),
                                progress: 0.0,
                                message: if e.is_empty() { "Authentication cancelled or failed.".to_string() } else { e.clone() },
                                icon: first_icon.clone(),
                            });
                            Err(e)
                        }
                    }
                }
            }).await.unwrap_or(Err("Runtime join failure".to_string()));

            res
        }));
    }

    if !snap_apps.is_empty() {
        let app_clone = app_handle.clone();
        join_handles.push(tauri::async_runtime::spawn(async move {
            let op_id = format!("batch-uninstall-snap-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
            let first_app = &snap_apps[0];
            let base_title = if snap_apps.len() == 1 {
                first_app.name.clone()
            } else {
                "Snap Packages".to_string()
            };
            let first_icon = first_app.icon.clone();
            let target_updates: Vec<AppUpdate> = snap_apps.iter().map(|i| AppUpdate {
                name: i.name.clone(),
                package_id: i.package_id.clone(),
                current_version: "".to_string(),
                new_version: "".to_string(),
                source: i.source.clone(),
                icon: i.icon.clone(),
            }).collect();

            let mut pkg_ids = Vec::new();
            for a in &snap_apps {
                pkg_ids.push(a.package_id.clone());
            }

            let res = tauri::async_runtime::spawn_blocking(move || {
                let mut base_args = vec!["remove".to_string()];
                base_args.extend(pkg_ids);
                let arg_refs: Vec<&str> = base_args.iter().map(|s| s.as_str()).collect();

                let _ = app_clone.emit("operation-progress", OperationProgress {
                    id: op_id.clone(),
                    op_type: "uninstall".to_string(),
                    app_name: base_title.clone(),
                    status: "running".to_string(),
                    progress: 0.05,
                    message: "Preparing Snap uninstallation batch…".to_string(),
                    icon: first_icon.clone(),
                });

                let mut elev_args = vec!["-n", "snap"];
                elev_args.extend(arg_refs.iter().copied());

                let direct_success = run_streaming(&app_clone, &op_id, &base_title, "snap", "uninstall", "sudo", &elev_args, false, first_icon.clone(), Some(target_updates.clone())).is_ok()
                    || run_streaming(&app_clone, &op_id, &base_title, "snap", "uninstall", "snap", &arg_refs, false, first_icon.clone(), Some(target_updates.clone())).is_ok();

                if direct_success {
                    let _ = app_clone.emit("operation-progress", OperationProgress {
                        id: op_id.clone(),
                        op_type: "uninstall".to_string(),
                        app_name: base_title.clone(),
                        status: "done".to_string(),
                        progress: 1.0,
                        message: "Successfully removed Snap packages.".to_string(),
                        icon: first_icon.clone(),
                    });
                    Ok(())
                } else {
                    let _ = app_clone.emit("operation-progress", OperationProgress {
                        id: op_id.clone(),
                        op_type: "uninstall".to_string(),
                        app_name: base_title.clone(),
                        status: "running".to_string(),
                        progress: 0.08,
                        message: "Requesting administrator permission…".to_string(),
                        icon: first_icon.clone(),
                    });

                    match run_streaming(&app_clone, &op_id, &base_title, "snap", "uninstall", "snap", &arg_refs, true, first_icon.clone(), Some(target_updates.clone())) {
                        Ok(()) => {
                            let _ = app_clone.emit("operation-progress", OperationProgress {
                                id: op_id.clone(),
                                op_type: "uninstall".to_string(),
                                app_name: base_title.clone(),
                                status: "done".to_string(),
                                progress: 1.0,
                                message: "Successfully removed Snap packages.".to_string(),
                                icon: first_icon.clone(),
                            });
                            Ok(())
                        }
                        Err(e) => {
                            let _ = app_clone.emit("operation-progress", OperationProgress {
                                id: op_id.clone(),
                                op_type: "uninstall".to_string(),
                                app_name: base_title.clone(),
                                status: "error".to_string(),
                                progress: 0.0,
                                message: if e.is_empty() { "Authentication cancelled or failed.".to_string() } else { e.clone() },
                                icon: first_icon.clone(),
                            });
                            Err(e)
                        }
                    }
                }
            }).await.unwrap_or(Err("Runtime join failure".to_string()));

            res
        }));
    }

    for handle in join_handles {
        let _ = handle.await;
    }

    Ok(())
}
