# HabitMeter

<p align="center">
  <img src="public/favicon.svg" width="80" height="80" alt="HabitMeter Logo" />
</p>

<p align="center">
  <strong>Minimalist habit tracker for Android — pure AMOLED black, local-first, no cloud.</strong>
</p>

<p align="center">
  <a href="https://github.com/anshulnitin-cyberspace/HabitMeter/releases/tag/v2.0.0"><img src="https://img.shields.io/github/v/release/anshulnitin-cyberspace/HabitMeter?label=version&color=brightgreen" alt="Version"></a>
  <a href="https://github.com/anshulnitin-cyberspace/HabitMeter/releases"><img src="https://img.shields.io/github/downloads/anshulnitin-cyberspace/HabitMeter/total?color=blue" alt="Downloads"></a>
  <a href="https://github.com/anshulnitin-cyberspace/HabitMeter/blob/main/LICENSE"><img src="https://img.shields.io/github/license/anshulnitin-cyberspace/HabitMeter?color=lightgrey" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Android-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/theme-AMOLED%20black-black" alt="Theme">
</p>

<p align="center">
  <a href="https://github.com/anshulnitin-cyberspace/HabitMeter/releases/download/v2.0.0/HabitMeter-v2.0.0.apk"><strong>⬇ Download APK (v2.0.0)</strong></a>
  •
  <a href="https://github.com/anshulnitin-cyberspace/HabitMeter/releases">All Releases</a>
</p>

---

HabitMeter is a **1:1 HabitKit-inspired** habit tracker built with **React + Capacitor**. No accounts, no subscriptions, no tracking — all data stays on device in `localStorage`/`Capacitor Preferences`, with optional JSON backup via native share sheet. Designed for **AMOLED black (#000000)** with GitHub-style contribution grids, right-anchored scrolling, and haptic feedback.

> **v2.0.0** — Command palette, bulk mark-all, haptics, skeleton loading, daily reminders, and security hardening. See [Releases](https://github.com/anshulnitin-cyberspace/HabitMeter/releases) for changelog.

## ✨ Features

- **GitHub-Style Grids** — 7×20 continuous matrix (140 days), Sunday→Saturday weeks, Today far-right, `overflow-x-auto scroll-smooth` snap to Today. Only last 14 days editable via long-press.
- **Long-Press Edit** — Long-press (550ms) or double-click card → colored border + `EDIT` badge → tap squares within 14-day window (and after `createdAt`) to toggle. `Done` ✓ saves instantly to `localStorage`.
- **Command Palette** — Floating search (`Search` in Dashboard header or pull-down) — `Create New Habit`, `Mark All Complete/Incomplete`, `Export/Import Backup`, `Go to Analytics/Profile`, plus dynamic `Mark <Habit> as Complete` per habit. Debounced, `backdrop-blur-sm`, haptics on select.
- **Analytics** — Global total completions, 14-day windowed consistency (average of individual rates), unified heatmap (7×20, `Today` far-right, intensity `0%→#1C1C1E` `25%→#4B5563` `50%→#9CA3AF` `75%→#D1D5DB` `100%→#FFFFFF`), most consistent habit (handles ties).
- **Haptics & Skeletons** — `@capacitor/haptics` `Light` on toggle, `Medium` on delete/reset, `Heavy/SUCCESS` on 7/30-day streak; `HabitCardSkeleton` (`bg-[#1c1c1e]` `animate-pulse`) prevents flash, `isLoading` 200ms.
- **Daily Reminders** — `Profile > Settings` → `Daily Reminder` (`Bell` + `input[type=time]` dark + toggle). `LocalNotifications` `checkPermissions`/`requestPermissions` → `checkExactNotificationSetting` → `createChannel(daily_reminders)` → `schedule({on:{hour,minute}, allowWhileIdle:true, presentationOptions:["badge","sound","alert"]})`.
- **Backup & Restore** — `Profile > Data Management` → **Export** writes `habitmeter_backup_YYYY-MM-DD.json` to `Directory.Cache` + `Share.share({files:[uri]})` (Android) / blob download (web); **Import** via hidden `<input type=file accept=.json>` + `FileReader` + strict `isValidHabit` + `sortCompletions` + `JSON.parse` reviver stripping `__proto__`.
- **Security Hardened** — `JSON.parse` reviver, `slice(0,5000)` DoS cap, `isStrictValidDate`, `hasOwnProperty` checks, pseudo-atomic `localStorage` (`_tmp` → `main` → `remove` + 300ms debounce + `visibilitychange`/`App` listener), `QuotaExceededError` toast, `FLAG_SECURE` + `filterTouchesWhenObscured`.
- **AMOLED Black** — `bg-[#000000]` locked, `border-neutral-900`, `overscroll-behavior:none`, `safe-area-inset-*`, `user-select:none`, `tap-highlight-color:transparent`.

## 📸 Screenshots

| Dashboard | Analytics | Profile |
|-----------|-----------|---------|
| ![Dashboard](https://via.placeholder.com/270x600/000000/FFFFFF?text=Dashboard) | ![Analytics](https://via.placeholder.com/270x600/000000/FFFFFF?text=Analytics) | ![Profile](https://via.placeholder.com/270x600/000000/FFFFFF?text=Profile) |

> Replace placeholders with real screenshots in `docs/screenshots/` and update paths.

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **UI** | React 19, TypeScript, Tailwind CSS 4, lucide-react, Vite |
| **Native** | Capacitor 8 (Android), `@capacitor/*` (filesystem, share, preferences, local-notifications, haptics, keyboard, app) |
| **State** | React Context (`HabitContext` → `habitmeter_data` + `CapacitorStorage` `widget_habits_data`), `useMemo` derived streaks |
| **Date** | Local-only `YYYY-MM-DD` via `toLocalDateString` + `getCalendarDaysElapsed` (noon-block DST-proof) |
| **Storage** | `localStorage` (5MB) + `Preferences` bridge for Android Widget |

## 📦 Installation

### For Users
1. Go to [**Releases**](https://github.com/anshulnitin-cyberspace/HabitMeter/releases) → **v2.0.0** → **Assets** → `HabitMeter-v2.0.0.apk` (or `HabitMeter-v1.0.0.apk`)
2. Download on Android → Enable `Install unknown apps` if prompted → Install.

### For Developers

**Prerequisites:** Node 18+, Android Studio + SDK, `JAVA_HOME` (`Android Studio/jbr`)

```bash
# Clone
git clone https://github.com/anshulnitin-cyberspace/HabitMeter.git
cd HabitMeter  # or habitkit-clone locally

# Install
npm install

# Web dev (live reload for phone)
# 1. Ensure capacitor.config.json has server block:
#    "server": { "url": "http://192.168.0.124:5173", "cleartext": true }
npm run dev -- --host
# Then in another terminal:
npx cap copy android

# Production build (standalone, no server)
# Remove server block from capacitor.config.json
npm run build
npx cap copy android
npx cap sync android
# Open Android Studio:
npx cap open android
# Build → Clean Project → Build APK(s) or Run
```

## 🗂️ Project Structure

```
src/
├── components/
│   ├── HabitCard.tsx              # Card + streak/consistency + long-press edit + sparkline
│   ├── HabitGrid.tsx              # 7×20 continuous grid, 14-day edit window, right-anchored
│   ├── HabitCardSkeleton.tsx      # AMOLED skeleton (animate-pulse)
│   ├── HabitModal.tsx             # Create/Edit (icon/color/frequency)
│   ├── CommandPalette.tsx         # Spotlight search (debounced, haptics)
│   ├── AnalyticsView.tsx          # Total, consistency, heatmap, most consistent (ties)
│   └── ProfileView.tsx            # Settings (reminder) + Data Management + About
├── context/
│   └── HabitContext.tsx           # habits, isLoading, toggle, markAll, Preferences bridge
├── utils/
│   ├── dateUtils.ts               # toLocalDateString, getCurrentWeekDateStrings, getCalendarDaysElapsed
│   ├── habitMath.ts               # getCurrentStreak, getLongestStreak, calculateLifetimeConsistency, getCompletionsForCurrentWeek
│   └── permissionUtils.ts         # checkStoragePermission, requestNativeStoragePermission
├── App.tsx                        # Dashboard/Analytics/Profile tabs + BottomTabBar
└── main.tsx
android/app/src/main/
├── AndroidManifest.xml            # INTERNET, STORAGE, POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, requestLegacyExternalStorage, usesCleartextTraffic
├── java/com/habitmeter/app/MainActivity.java  # FLAG_SECURE
└── res/layout/activity_main.xml   # filterTouchesWhenObscured
```

## 🧪 Data Model

```ts
interface Habit {
  id: string;
  name: string;
  description?: string;
  color: string;       // hex #RRGGBB
  icon: string;        // lucide name
  frequency: number;   // 1-7
  createdAt: string;   // YYYY-MM-DD local
  completions: string[]; // YYYY-MM-DD[], sorted, unique, max 5000
}
```
- **Key:** `habitmeter_data` in `localStorage` + `CapacitorStorage` `widget_habits_data` for widget.
- **Backup:** `habitmeter_backup_YYYY-MM-DD.json` via `Directory.Cache` + `Share.share({files:[uri]})`.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit: `git commit -m "feat: add amazing feature"`
4. Push: `git push origin feat/amazing-feature`
5. Open a Pull Request

Please ensure `npm run build` passes and no `alert()`/`confirm()` remain (use `showCustomToast`).

## 📄 License

MIT — see [LICENSE](LICENSE) (add MIT file if missing).

## 🙏 Acknowledgements

- Inspired by [HabitKit](https://habitkit.app)
- Icons by [Lucide](https://lucide.dev)
- Built with [Capacitor](https://capacitorjs.com) + [Vite](https://vitejs.dev)

---

<p align="center">Made with 🖤 for AMOLED lovers — HabitMeter Mobile 1.0.0 (Production Shell) • v2.0.0</p>
