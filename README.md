# Hybrid Web Apps

Three Apache Cordova Android apps built from vanilla HTML, CSS, and JavaScript UIs. Same web sources, packaged for mobile with shared PowerShell build helpers.

| App | Folder | What it is |
|-----|--------|------------|
| PUP Hymn | `PUP-Hymn/` | Word-synced karaoke player |
| ck.dev-verse | `CK-DevVerse/` | Terminal-style personal site |
| Student Registration | `Student-Registration/` | Multi-section registration form |

## Preview in a browser

No Cordova required for a quick look:

```bash
# open any app's www entry
start PUP-Hymn/www/index.html
# or serve the folder
python -m http.server 8000 --directory PUP-Hymn/www
```

## Project layout

```text
hybrid-web-apps/
  CK-DevVerse/
    www/                 # web UI
    config.xml
    package.json
    res/                 # icons / splash
  PUP-Hymn/
  Student-Registration/
  _shared/
    cordova-env.ps1
    build-all.ps1
```

`platforms/`, `plugins/`, and `node_modules/` are gitignored. Rebuild them locally.

## Build Android APKs (Windows)

Cordova builds can misbehave on OneDrive-synced paths. The shared scripts scaffold under a plain local folder (default `C:\cordova-builds`), then you can copy APKs out.

Requirements: Node.js, Cordova CLI, Android SDK / Gradle toolchain.

```powershell
# from repo root
.\.\_shared\build-all.ps1
```

See `_shared/cordova-env.ps1` for environment hooks.

## Stack

- Apache Cordova (Android)
- Vanilla web UI per app
- PowerShell build automation

## License

MIT. See [LICENSE](LICENSE).

PUP names, logos, and hymn audio belong to the Polytechnic University of the Philippines. Code is MIT; institutional media and marks are not free for commercial reuse.

## Course note

Built for CMPE 364 (Web and Mobile Systems), Polytechnic University of the Philippines, under Engr. Arlene B. Canlas. Published here as a standalone project.
