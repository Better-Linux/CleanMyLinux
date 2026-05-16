# Security Policy

## Supported Versions

We actively provide security updates for the following versions of CleanMyLinux:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Better Linux team takes the security of our software seriously. If you believe you have found a security vulnerability, please do not open a public issue. Instead, please report it through the following process:

1.  Send an email to security@betterlinux.com.
2.  Include a detailed description of the vulnerability and steps to reproduce it.
3.  We will acknowledge receipt of your report within 48 hours and provide a timeline for a fix if the vulnerability is confirmed.

We request that you practice responsible disclosure and give us time to resolve the issue before making it public.

## Security Architecture Overview

CleanMyLinux utilizes a multi-layered security model:
*   **Process Isolation**: The main GUI process remains unprivileged.
*   **PolicyKit Integration**: All destructive system changes are routed through a hardened helper script (`cleanmylinux-helper.sh`) authorized by a signed Polkit policy.
*   **Static Analysis**: The backend is written in Memory-Safe Rust, mitigating common memory-related vulnerabilities.
