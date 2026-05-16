# CleanMyLinux Technical Architecture

This document provides a low-level technical specification of the machine learning modules, stream processing pipelines, and security isolation models implemented in CleanMyLinux.

---

## Machine Learning Application Classifier

To safely separate user space GUI applications from critical system libraries, drivers, and background services, CleanMyLinux uses a native Logistic Regression classifier written in Rust.

### The 38-Feature Vector Model
The application featurizer normalizes and maps package characteristics into a fixed-length numerical vector across 38 distinct dimensions. 

```rust
pub struct AppFeatures {
    // Source signals (6)
    pub is_flatpak: f32,
    pub is_snap: f32,
    pub has_desktop_file: f32,
    pub has_icon: f32,
    pub has_exec: f32,
    pub has_gui_category: f32,
    
    // Naming patterns (16)
    pub name_starts_lib: f32,
    pub name_ends_dev: f32,
    ...
    
    // Descriptive indicators (8)
    pub desc_has_library: f32,
    pub desc_has_daemon: f32,
    ...
    
    // System indicators (8)
    pub priority_required: f32,
    pub priority_important: f32,
    pub reverse_dependency_count: f32,
    pub has_polkit_policy: f32,
    pub has_etc_config: f32,
    pub has_systemd_service: f32,
    pub is_user_installed: f32,
    pub vendor_is_distro: f32,
}
```

### System DNA Protection
To guarantee system stability, any packages that present critical "System DNA" are hard-filtered out of the uninstallation classification regardless of model predictions. This includes:
*   Footprints inside `/etc` configurations.
*   Systemd daemon configurations.
*   System-wide PolicyKit security policies.

---

## Adaptive Progress Engine

The streaming process engine parses non-buffered TTY console outputs from active subprocesses in real-time, feeding progress predictions back to the frontend.

```text
Stream Input  ──>  Feature Extraction  ──>  Sigmoid Inference  ──>  Real-time Progress UI
                        │
                        └── (On Success) ──> SGD Backpropagation ──> Saved Weight Update
```

### Continual Learning Mechanics
The model uses Stochastic Gradient Descent (SGD) to adapt weights dynamically to the user's specific network throughput and hardware I/O limits.

1.  **Prediction Function**: Computes probability using a sigmoid threshold over the features and current weights:
    $$p = \frac{1}{1 + e^{-(\mathbf{w} \cdot \mathbf{x} + b)}}$$
2.  **Backpropagation**: Upon successful task completion, the trace of predicted progress versus actual linear step progress is trained:
    $$\mathbf{w} \leftarrow \mathbf{w} - \eta (p - y) p(1 - p) \mathbf{x}$$
    Where $\eta$ represents the learning rate (`0.01`).

---

## Parallel Scanner Tasks

The package scanner uses task-stealing concurrency via **Rayon** to execute parallel audits across system application directories and sandboxed platforms.

```text
                     ┌── [Thread 1] ──> /usr/share/applications (Native Apps)
                     │
[Scanner Core] ──────┼── [Thread 2] ──> /var/lib/flatpak/exports (Flatpaks)
                     │
                     └── [Thread 3] ──> /var/lib/snapd/desktop (Snaps)
```

---

## Security Escalation Model

CleanMyLinux isolates high-privilege administrative tasks to prevent security vulnerabilities.

```text
┌───────────────────────────┐         Secure Tauri IPC         ┌───────────────────────────┐
│     CleanMyLinux GUI      │ ───────────────────────────────> │    Tauri Native Backend   │
│   (Unprivileged Space)    │ <─────────────────────────────── │    (Unprivileged Space)   │
└───────────────────────────┘                                  └───────────────────────────┘
                                                                             │
                                                                             ▼ (pkexec helper execution)
                                                               ┌───────────────────────────┐
                                                               │   cleanmylinux-helper     │
                                                               │     (Privileged Space)    │
                                                               └───────────────────────────┘
```

*   **GUI Process**: Runs in standard unprivileged user memory.
*   **Administrative Actions**: Privileged package actions (e.g., removing system files or executing package installations) are routed to a custom shell utility (`/usr/bin/cleanmylinux-helper`). This utility is invoked via `pkexec` and authenticated through the native system security policy (`config/com.betterlinux.cleanmylinux.policy`).
