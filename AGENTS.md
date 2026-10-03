# Areos
Minimal Electron wrapper for https://x.com. Ubuntu 24.04, Node via fnm.
Plain JavaScript (CommonJS), no frameworks, no build step.
Personal-use v1. Do not add features beyond PLAN.md.

## Ubuntu notes
- Electron's sandbox fails on 24.04 (AppArmor). Always run the app with
  `npm run start:nosandbox`. Never use sudo.
- The app is a GUI and never exits. Verify launches with
  `timeout 15 npm run start:nosandbox; echo $?` (124 = pass).
