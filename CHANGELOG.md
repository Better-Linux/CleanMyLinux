# Changelog

All notable changes to CleanMyLinux will be documented in this file.

## [v1.0.0-beta.2] - 2026-05-24

### Fixed
- **Ghost Updates:** Resolved an issue where native DNF packages (like Brave Browser) would continuously reappear in the update list after successfully updating, caused by stale cache queries ([#3](https://github.com/Better-Linux/CleanMyLinux/issues/3)).
- **Flatpak Privilege Blindspot:** Fixed an issue where the updater could not detect or update user-installed flatpaks. Flatpak updates now seamlessly integrate with the system polkit for native permission handling ([#3](https://github.com/Better-Linux/CleanMyLinux/issues/3)).
- **System App Protection:** Fixed a bug where third-party apps were incorrectly flagged as protected system applications, which prevented users from uninstalling them ([#2](https://github.com/Better-Linux/CleanMyLinux/issues/2)).
- **KDE Dock Icon:** Fixed missing app icon in the KDE panel. ([#1](https://github.com/Better-Linux/CleanMyLinux/issues/1)) by @Joy-Majumder in [#4](https://github.com/Better-Linux/CleanMyLinux/pull/4).
- **Queue Manager UX:** Fixed a bug where a single failed application update would wipe the entire operations queue and force a false "Success" screen. Failed operations now correctly stay in the queue with visible error badges.
- **Queue Operation Clashing:** Fixed an issue where restarting an operation in the queue manager would overwrite previous operations. Every queued action now generates a mathematically unique ID.

## [v1.0.0-beta.1] - 2026-05-22

### Added
- **Initial Beta Release:** First public preview of CleanMyLinux.
- **Unified App Manager:** Core architecture to scan, manage, update, and uninstall Native (RPM/APT/Pacman), Flatpak, and Snap packages.
- **System Optimizer:** Initial modules for cleaning system caches, logs, and unused dependencies.
- **Operations Queue:** Real-time background progress tracking for batch uninstalls and updates.
- **Polkit Integration:** Secure privilege escalation layer for system-level operations.
