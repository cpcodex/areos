# x-desktop

Minimal Electron wrapper for https://x.com.

## Prerequisites

Node via nvm.

## Install

```bash
npm install
```

## Run

```bash
npm start
```

Google sign-in may fail in embedded apps. Use X's own username/password login.

## Troubleshooting

On Ubuntu 23.10+ and 24.04, Electron can exit with "The SUID sandbox helper binary was found, but is not configured correctly" or an AppArmor/user namespace error. Run:

```bash
npm run start:nosandbox
```

A proper fix for packaged builds comes later.
