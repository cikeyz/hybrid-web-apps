# Hybrid Web Apps

<p align="center">
  <strong>Three Apache Cordova Android apps built from vanilla web UIs.</strong><br>
  Karaoke player, terminal portfolio, and student registration form.
</p>

<p align="center">
  <a href="#apps">Apps</a>
  &nbsp;·&nbsp;
  <a href="#quick-start">Quick Start</a>
  &nbsp;·&nbsp;
  <a href="#android-apk">Android / APK</a>
  &nbsp;·&nbsp;
  <a href="#project-structure">Structure</a>
  &nbsp;·&nbsp;
  <a href="#license">License</a>
</p>

<p align="center">
  <img alt="Apache Cordova" src="https://img.shields.io/badge/Apache%20Cordova-E8E8E8?logo=apachecordova&logoColor=111111">
  <img alt="Android" src="https://img.shields.io/badge/Android-3DDC84?logo=android&logoColor=white">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?logo=css&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=111111">
  <img alt="PowerShell" src="https://img.shields.io/badge/Build-PowerShell-5391FE?logo=powershell&logoColor=white">
  <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-22c55e?logo=open-source-initiative&logoColor=white">
</p>

## Contents

- [Overview](#overview)
- [Apps](#apps)
- [Quick Start](#quick-start)
- [Android / APK](#android--apk)
- [Project Structure](#project-structure)
- [Build Notes](#build-notes)
- [License](#license)
- [Course Note](#course-note)

## Overview

This monorepo packages three completed web UIs as Cordova Android apps. Each app keeps its own `www/`, `config.xml`, icons, and splash resources. Shared PowerShell scripts under `_shared/` scaffold builds outside OneDrive-synced paths.

## Apps

| App | Folder | Package idea |
|-----|--------|--------------|
| PUP Hymn | `PUP-Hymn/` | Word-synced karaoke player |
| ck.dev-verse | `CK-DevVerse/` | Terminal-style personal site |
| Student Registration | `Student-Registration/` | Multi-section registration form |

## Quick Start

Preview any web UI without Cordova:

```bash
git clone https://github.com/cikeyz/hybrid-web-apps.git
cd hybrid-web-apps
python -m http.server 8000 --directory PUP-Hymn/www
# http://localhost:8000
```

## Android / APK

Prebuilt APKs are attached to [GitHub Releases](https://github.com/cikeyz/hybrid-web-apps/releases).

To rebuild locally (Windows), install Node.js, the Cordova CLI, and an Android SDK toolchain, then:

```powershell
.\.\_shared\build-all.ps1
```

`platforms/`, `plugins/`, and `node_modules/` are gitignored and regenerated at build time.

## Project Structure

```text
hybrid-web-apps/
├── README.md
├── LICENSE
├── .gitignore
├── _shared/
│   ├── build-all.ps1
│   └── cordova-env.ps1
├── CK-DevVerse/
│   ├── config.xml
│   ├── package.json
│   ├── res/
│   └── www/
├── PUP-Hymn/
│   ├── config.xml
│   ├── package.json
│   ├── res/
│   └── www/
└── Student-Registration/
    ├── config.xml
    ├── package.json
    ├── res/
    └── www/
```

## Build Notes

Cordova installs can misbehave under OneDrive-synced project paths. The shared scripts target a plain local folder (default `C:\cordova-builds`) for scaffold and compile steps.

## License

MIT. See [LICENSE](LICENSE).

PUP names, logos, and hymn audio belong to the Polytechnic University of the Philippines. Code is MIT; institutional media and marks are not free for commercial reuse.

## Course Note

Built for CMPE 364 (Web and Mobile Systems), Polytechnic University of the Philippines, under Engr. Arlene B. Canlas. Published here as a standalone project.
