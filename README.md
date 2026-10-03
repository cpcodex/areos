# Areos

A minimal Electron app that opens [x.com](https://x.com) in its own desktop
window, so you don't need a browser tab open. Your login persists between
launches.

## Features

- Standalone window with a persistent login session
- Links outside x.com open in your default browser
- Single instance: launching it twice focuses the existing window
- Desktop notifications from x.com while Areos is running; the app quits when
  you close the window

## Prerequisites

- Linux (developed on Ubuntu 24.04)
- Node.js 20 or newer. [nvm](https://github.com/nvm-sh/nvm) or
  [fnm](https://github.com/Schniz/fnm) is the easiest way to install it.

## Install & Run

```bash
git clone https://github.com/cpcodex/areos.git
cd areos
npm install
npm run start:nosandbox
```

> Note: `npm start` runs Electron with its sandbox on, which fails on Ubuntu 23.10+,
> so `start:nosandbox` is the recommended command.

## Add it to your app launcher (optional)

Create `~/.local/share/applications/areos.desktop`:

```ini
[Desktop Entry]
Name=Areos
Exec=/bin/bash -ic /FULL/PATH/TO/YOUR-REPO/launch.sh
Type=Application
Terminal=false
Categories=Network;
```

Use the full absolute path (no `~`). Then run:

```bash
chmod +x launch.sh
update-desktop-database ~/.local/share/applications
```

## Login information storage

Your login is saved as browser cookies in Electron's persistent session, not
as a username or password in the project.

The window uses partition `persist:areos` in `main.js`, so Chromium writes
that session to:

```
~/.config/areos/Partitions/areos/
```

The session cookies themselves are in the SQLite file `Cookies` in that
folder. Because Google sign-in runs in the same window (`accounts.google.com`
is an allowed host), both the Google sign-in cookies and the X auth cookies
(`auth_token`, `ct0`, and similar) end up there.

## Disclaimer

> Unofficial, not affiliated with or endorsed by X Corp. It loads x.com
> in a window with some QOL features and nothing more.
> "X" is a trademark of its respective owner.

Use at your own risk. Check X's Terms of Service before using any
third-party client. This is a personal project, provided as-is.

## License

MIT. See [LICENSE](LICENSE).
