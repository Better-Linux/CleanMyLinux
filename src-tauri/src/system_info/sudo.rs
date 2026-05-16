use std::process::{Command, Stdio};

/// Detect which native package manager is available.
/// 
/// Returns the command name and default arguments for package removal.
pub fn detect_pkg_manager() -> Option<(&'static str, Vec<&'static str>)> {
    let managers = [
        ("dnf",     &["remove", "-y"][..]),
        ("apt-get", &["remove", "-y"][..]),
        ("zypper",  &["remove", "-y"][..]),
        ("pacman",  &["-R", "--noconfirm"][..]),
    ];
    for (cmd, args) in managers {
        if Command::new(cmd).arg("--version").output().map(|o| o.status.success()).unwrap_or(false) {
            return Some((cmd, args.to_vec()));
        }
    }
    None
}

/// Explicitly request standard elevated session caching via Polkit.
/// 
/// This check verifies if the user has already granted permission or triggers
/// a native GUI prompt to cache the credentials.
#[tauri::command]
pub async fn request_sudo_session() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        // 1. Check if we already have permission via Polkit without prompting
        let check_status = Command::new("pkexec")
            .args(["--action-id", "com.betterlinux.cleanmylinux", "/usr/bin/cleanmylinux-helper", "echo", "1"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .ok();

        if let Some(st) = check_status {
            if st.success() {
                return Ok(true);
            }
        }

        // 2. Trigger the native Polkit graphical prompt
        // We use a simple command to warm up the session
        let elev_status = Command::new("pkexec")
            .args(["/usr/bin/cleanmylinux-helper", "echo", "waking up polkit session"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map_err(|e| e.to_string())?;

        Ok(elev_status.success())
    })
    .await
    .map_err(|e| e.to_string())?
}
