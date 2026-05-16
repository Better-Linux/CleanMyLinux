use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUpdate {
    pub name: String,
    pub package_id: String,
    pub current_version: String,
    pub new_version: String,
    pub source: String,
    pub icon: Option<String>, // base64 data URL
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub total_count: usize,
    pub updates: Vec<AppUpdate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUninstallItem {
    pub name: String,
    pub package_id: String,
    pub source: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub package_id: String,   // Real package name used for install/uninstall (may differ from display name)
    pub source: String,
    pub version: String,
    pub size: u64,
    pub description: String,
    pub icon: Option<String>,
    pub exec_path: Option<String>,
    pub is_gui: bool,
    pub is_user_app: bool,
    pub usage_score: f32,
    pub days_untouched: f32,
    pub categories: String,
    pub has_polkit: bool,
    pub has_etc: bool,
    pub has_systemd: bool,
    pub is_manual: bool,
    pub vendor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemApps {
    pub apps: Vec<AppInfo>,
    pub total_count: usize,
    pub total_size: u64,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationProgress {
    pub id: String,
    pub op_type: String,       // "uninstall" | "update" | "clean" | ...
    pub app_name: String,
    pub status: String,        // "pending" | "running" | "done" | "error"
    pub progress: f32,         // 0.0 – 1.0
    pub message: String,       // Current human-readable status line
    pub icon: Option<String>,  // base64 icon for the queue UI
}
