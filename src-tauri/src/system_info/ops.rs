use std::io::{BufRead, BufReader, Read};
use std::process::{Command, Stdio};
use tauri::Emitter;

use crate::ai::{ProgressFeatures, ProgressModel};
use super::types::{AppUpdate, OperationProgress};

/// Run a command with piped output, streaming each line as a progress event.
/// Returns Ok(()) on success or Err with stderr on failure.
pub fn run_streaming(
    app_handle: &tauri::AppHandle,
    op_id: &str,
    app_name: &str,
    _source: &str,
    target_op_type: &str,
    cmd: &str,
    args: &[&str],
    use_pkexec: bool,
    icon: Option<String>,
    target_apps: Option<Vec<AppUpdate>>,
) -> Result<(), String> {
    let mut child = if use_pkexec {
        // Strip out duplicate "sudo" prefixes dynamically if mapped commands naturally request internal elevation
        let mut clean_args = args.to_vec();
        let final_cmd = if cmd == "sudo" {
            if !clean_args.is_empty() {
                // Remove "-n" non-interactive flags if escalating via explicit pkexec GUI Dialog routes
                if clean_args[0] == "-n" {
                    clean_args.remove(0);
                }
            }
            if !clean_args.is_empty() {
                let next_cmd = clean_args.remove(0);
                next_cmd
            } else {
                "sudo"
            }
        } else {
            cmd
        };

        // Force line buffering mode via stdbuf so upstream packages do not buffer stdout blocks in non-interactive pipes
        let shell_cmd = format!("stdbuf -oL -eL {} {} 2>&1", final_cmd, clean_args.join(" "));
        Command::new("pkexec")
            .args(["/usr/bin/cleanmylinux-helper", "sh", "-c", &shell_cmd.trim()])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    } else {
        Command::new(cmd)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    }
    .map_err(|e| format!("Failed to start process: {}", e))?;

    let stdout = child.stdout.take().unwrap();
    let stderr_handle = child.stderr.take().unwrap();

    let mut reader = BufReader::new(stdout);
    let mut last_progress: f32 = 0.05;

    let mut model = ProgressModel::new();
    let mut trace: Vec<(ProgressFeatures, f32)> = Vec::new();
    let start_time = std::time::Instant::now();
    let mut line_counter: usize = 0;
    let mut char_counter: usize = 0;
    let mut line_buf = Vec::new();
    let mut buf = [0u8; 1024];

    let mut current_app_name = app_name.to_string();
    let mut current_icon = icon.clone();

    while let Ok(n) = reader.read(&mut buf) {
        if n == 0 { break; }
        for &byte in &buf[..n] {
            if byte == b'\n' || byte == b'\r' {
                if !line_buf.is_empty() {
                    let raw_str = String::from_utf8_lossy(&line_buf);
                    let trimmed = raw_str.trim().to_string();
                    line_buf.clear();

                    if !trimmed.is_empty() {
                        line_counter += 1;
                        char_counter += trimmed.len();
                        let elapsed = start_time.elapsed().as_secs_f32();

                        if let Some(apps) = &target_apps {
                            let lower_line = trimmed.to_lowercase();
                            for app_item in apps {
                                if lower_line.contains(&app_item.package_id.to_lowercase())
                                    || lower_line.contains(&app_item.name.to_lowercase())
                                {
                                    current_app_name = app_item.name.clone();
                                    current_icon = app_item.icon.clone();
                                    break;
                                }
                            }
                        }

                        let features = ProgressFeatures::extract(elapsed, line_counter, char_counter, &trimmed);
                        let model_prediction = model.predict(&features);

                        let stream_glide = last_progress + (0.95 - last_progress) * 0.015;
                        let progress = model_prediction.max(stream_glide).min(0.95);

                        last_progress = progress;
                        trace.push((features.clone(), progress));

                        let _ = app_handle.emit("operation-progress", OperationProgress {
                            id: op_id.to_string(),
                            op_type: target_op_type.to_string(),
                            app_name: current_app_name.clone(),
                            status: "running".to_string(),
                            progress,
                            message: trimmed,
                            icon: current_icon.clone(),
                        });
                    }
                }
            } else {
                line_buf.push(byte);
            }
        }
    }

    if !line_buf.is_empty() {
        let raw_str = String::from_utf8_lossy(&line_buf);
        let trimmed = raw_str.trim().to_string();
        if !trimmed.is_empty() {
            line_counter += 1;
            char_counter += trimmed.len();
            let elapsed = start_time.elapsed().as_secs_f32();

            if let Some(apps) = &target_apps {
                let lower_line = trimmed.to_lowercase();
                for app_item in apps {
                    if lower_line.contains(&app_item.package_id.to_lowercase())
                        || lower_line.contains(&app_item.name.to_lowercase())
                    {
                        current_app_name = app_item.name.clone();
                        current_icon = app_item.icon.clone();
                        break;
                    }
                }
            }

            let features = ProgressFeatures::extract(elapsed, line_counter, char_counter, &trimmed);
            let model_prediction = model.predict(&features);
            let stream_glide = last_progress + (0.95 - last_progress) * 0.015;
            let progress = model_prediction.max(stream_glide).min(0.95);

            last_progress = progress;
            trace.push((features.clone(), progress));

            let _ = app_handle.emit("operation-progress", OperationProgress {
                id: op_id.to_string(),
                op_type: target_op_type.to_string(),
                app_name: current_app_name.clone(),
                status: "running".to_string(),
                progress,
                message: trimmed,
                icon: current_icon.clone(),
            });
        }
    }

    let mut err_out = String::new();
    let err_reader = BufReader::new(stderr_handle);
    for line in err_reader.lines().flatten() {
        if !line.trim().is_empty() {
            err_out.push_str(&line);
            err_out.push('\n');
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        let mut final_trace = Vec::new();
        let total_items = trace.len().max(1) as f32;
        for (i, (feat, _old_p)) in trace.into_iter().enumerate() {
            let true_target = ((i + 1) as f32 / total_items).clamp(0.05, 1.0);
            final_trace.push((feat, true_target));
        }
        model.train_on_trace(&final_trace);

        let _ = app_handle.emit("operation-progress", OperationProgress {
            id: op_id.to_string(),
            op_type: target_op_type.to_string(),
            app_name: current_app_name.clone(),
            status: "done".to_string(),
            progress: 1.0,
            message: "Completed successfully".to_string(),
            icon: current_icon.clone(),
        });
        Ok(())
    } else {
        let _ = app_handle.emit("operation-progress", OperationProgress {
            id: op_id.to_string(),
            op_type: target_op_type.to_string(),
            app_name: current_app_name.clone(),
            status: "error".to_string(),
            progress: last_progress,
            message: err_out.trim().to_string(),
            icon: current_icon.clone(),
        });
        Err(err_out.trim().to_string())
    }
}
