# PLAN: x-desktop (Electron wrapper for https://x.com)

Context: Ubuntu 24.04, Node via nvm, plain JavaScript (CommonJS), no
frameworks, no build step. Personal-use v1. No extra features (no tray,
notifications, packaging).

Note on verifying: the app is a GUI and never exits on its own, so verify
launches with `timeout 15 npm run start:nosandbox; echo "exit: $?"`.
Exit code 124 means it ran until the timeout, which counts as a pass.
Any other exit code or error output is a fail.

## T1 - Scaffold project [x]
Goal: npm project with Electron installed and git initialized.
Files: package.json, .gitignore
Do:
- `npm init -y`, then set name "x-desktop", "private": true, short
  description, "main": "main.js".
- `npm install --save-dev electron` (latest stable).
- Scripts: "start": "electron ." and "start:nosandbox": "electron . --no-sandbox".
- .gitignore: node_modules, dist, .DS_Store, *.log
- `git init` if not already a repo.
Acceptance: package.json has main, both scripts, private true, and electron
in devDependencies. node_modules is ignored by git.
Verify: `npx electron --no-sandbox --version` prints a version number.

## T2 - Window, session, security [x]
Goal: main.js opens a window on x.com and keeps login between launches.
Files: main.js
Do:
- BrowserWindow 1200x900, minWidth 800, minHeight 600, title "X",
  autoHideMenuBar true.
- webPreferences: partition "persist:x", contextIsolation true,
  nodeIntegration false, sandbox true. No preload.
- loadURL("https://x.com").
- app.whenReady creates the window; quit when all windows close.
Acceptance: window opens and shows x.com's page; no console errors.
Verify: the timeout command in the note above.

## T3 - User-Agent and link handling [x]
Goal: X login works, and external links open in the system browser.
Files: main.js
Do:
- Set the window's User-Agent to a Chrome-on-Linux string built from
  process.versions.chrome, with the "Electron/x.y.z" token removed
  (e.g. "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like
  Gecko) Chrome/<ver> Safari/537.36").
- setWindowOpenHandler plus the "will-navigate" event: allow hostnames
  x.com, twitter.com, t.co, accounts.google.com, appleid.apple.com (and
  their subdomains) inside the app. Everything else: shell.openExternal(url)
  and deny in-app. Parse URLs with new URL() and compare hostnames; do not
  use substring or loose regex matching.
Acceptance: allowed-host logic uses exact hostname or subdomain checks.
Verify: the timeout command in the note above.

## T4 - Single instance [x]
Goal: launching twice focuses the existing window.
Files: main.js
Do:
- app.requestSingleInstanceLock(). If not acquired, app.quit().
- On "second-instance": restore the window if minimized, then focus it.
Acceptance: only one window can exist.
Verify: the timeout command in the note above.

## T5 - README and first commit [x]
Goal: documented and committed.
Files: README.md
Do:
- Short README: prerequisites (Node via nvm), install (`npm install`), run
  (`npm start`), and a Troubleshooting section for the Ubuntu 23.10+/24.04
  sandbox error ("SUID sandbox helper binary..." or AppArmor/user namespace):
  use `npm run start:nosandbox`; a proper fix for packaged builds comes later.
- Mention that Google sign-in may fail in embedded apps; use X's own
  username/password login.
- `git add -A` and commit: "Initial Electron wrapper for X".
Acceptance: README exists, working tree clean, one commit.
Verify: `git status --short` prints nothing and `git log --oneline` shows the commit.

## Manual test checklist (user, after T5)
1. Window opens and loads x.com.
2. Log in with username and password.
3. Close and reopen with `npm run start:nosandbox`; still logged in.
4. Click an external link in a post; it opens in the default browser.
5. Launch a second time while running; the existing window is focused.