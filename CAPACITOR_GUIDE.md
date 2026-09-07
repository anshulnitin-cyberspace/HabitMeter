# CapacitorJS Native Build Guide — HabitMeter (AMOLED #000000)

This guide wraps the current React/Tailwind (Vite) codebase into native iOS (.ipa / .app) and Android (.apk / .aab) bundles.

> Prereqs: Node 18+, Xcode (macOS for iOS), Android Studio + SDK (for Android)

## 1. Install Capacitor dependencies

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/status-bar @capacitor/splash-screen
# Optional but recommended for Haptics/file feel:
npm install @capacitor/haptics @capacitor/preferences
```

Verify install:
```bash
npx cap --version
```

## 2. Build the web app

The Capacitor `webDir` is `dist` (see `capacitor.config.ts:6`).

```bash
npm run build
# Preview check (optional)
npm run preview
```

This must succeed with no `tsc` errors. Our AMOLED theme is locked in `src/index.css` (`background:#000000`, `overscroll-behavior:none`, `*{-webkit-tap-highlight-color:transparent; user-select:none;}`) and `index.html` `viewport-fit=cover` + `theme-color #000000`.

## 3. Initialize Capacitor (already provided)

`capacitor.config.ts` is already in the repo root:

```ts
// com.habitmeter.app / HabitMeter / webDir: dist
// SplashScreen/StatusBar backgroundColor #000000, style DARK, overlaysWebView false for safe-area
```

If starting fresh, you can regenerate:
```bash
npx cap init "HabitMeter" "com.habitmeter.app" --web-dir=dist
```

## 4. Add native platforms

```bash
npx cap add android
npx cap add ios      # macOS only
```

This creates `android/` and `ios/` folders.

## 5. Sync web build to native projects

After every `npm run build` or config change:

```bash
npx cap sync
# or
npx cap copy && npx cap sync android && npx cap sync ios
```

For live reload on device (dev):

```bash
# Find your LAN IP (e.g., 192.168.1.50)
npx cap run android --livereload --external
npx cap run ios --livereload --external
# Alternatively set server.url in capacitor.config.ts to http://192.168.1.50:5173 temporarily
```

## 6. Open native IDEs

```bash
npx cap open android  # Opens Android Studio
npx cap open ios      # Opens Xcode
```

### Android (.apk / .aab)

- In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)** or `Build > Generate Signed Bundle` for Play Store `.aab`.
- CLI alternative:
  ```bash
  cd android
  ./gradlew assembleDebug       # dist -> android/app/build/outputs/apk/debug/app-debug.apk
  ./gradlew bundleRelease       # .aab for Play Store (requires signing)
  ```

### iOS (.app / .ipa)

- In Xcode: Select Team (Apple ID), set Bundle ID `com.habitmeter.app`, **Product > Archive**, then **Distribute App** for TestFlight/App Store `.ipa`.
- CLI (requires certs):
  ```bash
  cd ios/App
  xcodebuild -workspace App.xcworkspace -scheme App -configuration Release archive -archivePath build/App.xcarchive
  ```

## 7. Safe Area & Native UI Notes (Already implemented)

- `index.html` has `viewport-fit=cover`, `theme-color #000000`, `apple-mobile-web-app-status-bar-style black-translucent`.
- `src/index.css` locks `html,body,#root` to `#000000`, `overscroll-behavior:none`, `user-select:none` + `safe-pt/pb` utilities and `env(safe-area-inset-*)` padding.
- `capacitor.config.ts` sets `StatusBar.style DARK`, `overlaysWebView:false`, `backgroundColor #000000` so notch/home-indicator areas stay true black.

## 8. Data Portability Testing

- Export: Settings (gear icon top-right) → **Export habitmeter_backup.json** → verifies `localStorage.getItem('habitmeter_data')` bundled as `{version, exportedAt, habits}` download.
- Import: Choose `.json` → schema validates `id/name/color/icon/frequency(1-7)/createdAt/completions` → `localStorage` overwrite + immediate state reload.
- Clear: **Reset App** → type `RESET` → `localStorage.removeItem('habitmeter_data')` → empty state.

## 9. Common Issues

- White bounce on drag → ensure `overscroll-behavior:none` on `html,body,#root` (already set) and no light background in `index.css`.
- Blue highlight on tap → `*{-webkit-tap-highlight-color:transparent}` already set; inputs re-enable `user-select:text`.
- Notch clipping → check `env(safe-area-inset-*)` on header/footer (`src/App.tsx` uses `safe-pt safe-pb`).

## 10. Update cycle

```bash
npm run build && npx cap sync && npx cap open android  # repeat for every web change
```

You're ready to build `.apk` and `.ipa` bundles.


