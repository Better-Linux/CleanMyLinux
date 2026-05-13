export interface AppInfo {
  name: string;
  package_id: string;
  source: string;
  version: string;
  size: number;
  description: string;
  icon?: string;
  exec_path?: string;
  is_gui: boolean;
  is_user_app: boolean;
  usage_score: number;
  days_untouched: number;
  categories: string;
  has_polkit: boolean;
  has_etc: boolean;
  has_systemd: boolean;
  is_manual: boolean;
  vendor: string;
}

export interface SystemApps {
  apps: AppInfo[];
  total_count: number;
  total_size: number;
}

export interface UpdateItem {
  name: string;
  package_id: string;
  current_version: string;
  new_version: string;
  source: string;
  icon?: string;
}

export interface UpdateInfo {
  total_count: number;
  updates: UpdateItem[];
  flatpak_count: number;
  snap_count: number;
}

export type AppStatus = "waiting" | "updating" | "done" | "error";

export interface AppUpdateStatus {
  name: string;
  source: string;
  icon?: string;
  status: AppStatus;
}

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};
