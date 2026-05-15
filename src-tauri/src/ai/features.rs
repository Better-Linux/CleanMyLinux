/// A normalized feature vector representing a system package or application.
/// 
/// This structure encapsulates various "signals" (metadata, naming patterns, behavioral traits)
/// that allow the ML classifier to distinguish between user-facing GUI applications and
/// background system libraries or services.
/// 
/// IMPORTANT: The order of fields in `to_vec()` must exactly match the training configuration
/// used to generate the model weights.
#[derive(Debug, Clone)]
pub struct AppFeatures {
    // --- Source Signals ---
    /// 1.0 if the app is a Flatpak, 0.0 otherwise.
    pub is_flatpak:           f32,
    /// 1.0 if the app is a Snap, 0.0 otherwise.
    pub is_snap:              f32,
    /// 1.0 if a valid .desktop file was found.
    pub has_desktop_file:     f32,
    /// 1.0 if an icon path was resolved.
    pub has_icon:             f32,
    /// 1.0 if an executable path was found.
    pub has_exec:             f32,
    /// 1.0 if the app belongs to a known GUI category (e.g., "Game", "Office").
    pub has_gui_category:     f32,

    // --- Name Patterns ---
    /// 1.0 if name starts with "lib" (excluding "libre", "liber").
    pub name_starts_lib:      f32,
    /// 1.0 if name ends with development suffixes (-dev, -devel).
    pub name_ends_dev:        f32,
    /// 1.0 if name ends with documentation suffixes (-doc).
    pub name_ends_doc:        f32,
    /// 1.0 if name ends with debug suffixes (-dbg, -debug).
    pub name_ends_dbg:        f32,
    /// 1.0 if name ends with data/common suffixes (-data, -common).
    pub name_ends_data:       f32,
    /// 1.0 if package is a Python library.
    pub name_starts_python:   f32,
    /// 1.0 if package is a Perl library.
    pub name_starts_perl:     f32,
    /// 1.0 if package is a Ruby library.
    pub name_starts_ruby:     f32,
    /// 1.0 if package is a font.
    pub name_starts_fonts:    f32,
    /// 1.0 if package is a Go library.
    pub name_starts_golang:   f32,
    /// 1.0 if package is a Node.js library.
    pub name_starts_nodejs:   f32,
    /// 1.0 if name contains "plugin".
    pub name_has_plugin:      f32,
    /// 1.0 if name contains "common".
    pub name_has_common:      f32,
    /// 1.0 if name contains "utils" or "tools".
    pub name_has_utils:       f32,
    /// Normalized count of hyphens in the name (0.0 to 1.0).
    pub name_hyphen_count:    f32,
    /// Normalized length of the package name (0.0 to 1.0).
    pub name_length_norm:     f32,

    // --- Description Signals ---
    /// 1.0 if description mentions "library".
    pub desc_has_library:     f32,
    /// 1.0 if description mentions "daemon" or "service".
    pub desc_has_daemon:      f32,
    /// 1.0 if description mentions "plugin" or "extension".
    pub desc_has_plugin:      f32,
    /// 1.0 if description mentions "development" or "sdk".
    pub desc_has_development: f32,
    /// 1.0 if description mentions "binding" or "wrapper".
    pub desc_has_binding:     f32,
    /// 1.0 if description mentions "module".
    pub desc_has_module:      f32,
    /// 1.0 if description mentions "framework" or "toolkit".
    pub desc_has_framework:   f32,
    /// 1.0 if a description summary is present.
    pub has_summary:          f32,

    // --- System Signals ---
    /// 1.0 if package is marked as "required" by the distro.
    pub priority_required:    f32,
    /// 1.0 if package is marked as "important" or "standard".
    pub priority_important:   f32,
    /// Normalized count of packages depending on this one.
    pub reverse_dependency_count: f32,
    /// 1.0 if package provides a Polkit policy.
    pub has_polkit_policy:    f32,
    /// 1.0 if package places files in /etc.
    pub has_etc_config:       f32,
    /// 1.0 if package provides a Systemd service.
    pub has_systemd_service:  f32,
    /// 1.0 if the user explicitly installed this package (manual vs auto).
    pub is_user_installed:    f32,
    /// 1.0 if the vendor matches the system distribution (e.g., "Fedora", "Ubuntu").
    pub vendor_is_distro:     f32,
}

impl AppFeatures {
    /// Extracts a normalized feature vector from raw package metadata.
    /// 
    /// This performs the "Featurization" step, converting strings and booleans 
    /// into a fixed-length numerical vector suitable for model inference.
    pub fn from_package(name: &str, source: &str, description: &str,
                        has_desktop: bool, has_icon: bool,
                        has_exec: bool, categories: &str,
                        priority: &str, rdepends_count: usize,
                        has_polkit: bool, has_etc: bool,
                        has_systemd: bool, is_manual: bool,
                        vendor: &str) -> Self {
        let n = name.to_lowercase();
        let d = description.to_lowercase();
        let c = categories.to_lowercase();
        let p = priority.to_lowercase();
        let v = vendor.to_lowercase();

        let gui_cats = ["audiovideo","audio","video","development","education",
                        "game","graphics","network","office","science","settings",
                        "system","utility","photography","player","browser"];
        let has_gui_cat = if !c.is_empty() {
            gui_cats.iter().any(|cat| c.contains(cat)) as u8 as f32
        } else {
            has_desktop as u8 as f32
        };

        let hyphen_count = n.chars().filter(|&ch| ch == '-').count().min(6) as f32 / 6.0;
        let name_len = n.len().min(40) as f32 / 40.0;
        let rdepends_norm = rdepends_count.min(20) as f32 / 20.0;

        fn b(v: bool) -> f32 { v as u8 as f32 }

        let is_distro_vendor = v.contains("fedora") || v.contains("ubuntu") || 
                               v.contains("debian") || v.contains("canonical") || 
                               v.contains("red hat") || v.contains("suse") ||
                               v.contains("arch linux");

        Self {
            is_flatpak:           b(source == "flatpak"),
            is_snap:              b(source == "snap"),
            has_desktop_file:     b(has_desktop),
            has_icon:             b(has_icon),
            has_exec:             b(has_exec),
            has_gui_category:     has_gui_cat,
            name_starts_lib:      b(n.starts_with("lib") && !n.starts_with("libre") && !n.starts_with("liber")),
            name_ends_dev:        b(n.ends_with("-dev") || n.ends_with("-devel") || n.ends_with("-headers")),
            name_ends_doc:        b(n.ends_with("-doc") || n.ends_with("-docs") || n.ends_with("-man")),
            name_ends_dbg:        b(n.ends_with("-dbg") || n.ends_with("-debug") || n.ends_with("-debuginfo")),
            name_ends_data:       b(n.ends_with("-data") || n.ends_with("-common") || n.ends_with("-base")),
            name_starts_python:   b(n.starts_with("python3-") || n.starts_with("python-")),
            name_starts_perl:     b(n.starts_with("perl-")),
            name_starts_ruby:     b(n.starts_with("ruby-") || n.starts_with("rubygem-")),
            name_starts_fonts:    b(n.starts_with("fonts-") || n.starts_with("ttf-") || n.starts_with("otf-")),
            name_starts_golang:   b(n.starts_with("golang-") || n.starts_with("go-")),
            name_starts_nodejs:   b(n.starts_with("nodejs-") || n.starts_with("node-")),
            name_has_plugin:      b(n.contains("plugin")),
            name_has_common:      b(n.ends_with("-common") || n.contains("-common-")),
            name_has_utils:       b(n.ends_with("-utils") || n.ends_with("-tools")),
            name_hyphen_count:    hyphen_count,
            name_length_norm:     name_len,
            desc_has_library:     b(d.contains("library") || d.contains("shared library")),
            desc_has_daemon:      b(d.contains("daemon") || d.contains("background service")),
            desc_has_plugin:      b(d.contains("plugin") || d.contains("extension")),
            desc_has_development: b(d.contains("development") || d.contains("developer tools") || d.contains("sdk")),
            desc_has_binding:     b(d.contains("binding") || d.contains("wrapper")),
            desc_has_module:      b(d.contains("module") || d.contains("kernel module")),
            desc_has_framework:   b(d.contains("framework") || d.contains("toolkit")),
            has_summary:          b(!description.is_empty()),
            priority_required:    b(p == "required"),
            priority_important:   b(p == "important" || p == "standard"),
            reverse_dependency_count: rdepends_norm,
            has_polkit_policy:    b(has_polkit),
            has_etc_config:       b(has_etc),
            has_systemd_service:  b(has_systemd),
            is_user_installed:    b(is_manual),
            vendor_is_distro:     b(is_distro_vendor),
        }
    }

    /// Converts the feature structure into a raw vector of floats for model processing.
    pub fn to_vec(&self) -> Vec<f32> {
        vec![
            self.is_flatpak, self.is_snap, self.has_desktop_file, self.has_icon,
            self.has_exec, self.has_gui_category, self.name_starts_lib,
            self.name_ends_dev, self.name_ends_doc, self.name_ends_dbg,
            self.name_ends_data, self.name_starts_python, self.name_starts_perl,
            self.name_starts_ruby, self.name_starts_fonts, self.name_starts_golang,
            self.name_starts_nodejs, self.name_has_plugin, self.name_has_common,
            self.name_has_utils, self.name_hyphen_count, self.name_length_norm,
            self.desc_has_library, self.desc_has_daemon, self.desc_has_plugin,
            self.desc_has_development, self.desc_has_binding, self.desc_has_module,
            self.desc_has_framework, self.has_summary,
            self.priority_required, self.priority_important, self.reverse_dependency_count,
            self.has_polkit_policy, self.has_etc_config, self.has_systemd_service,
            self.is_user_installed, self.vendor_is_distro,
        ]
    }
}