# Font Setup Guide

This project uses a single command to regenerate native font assets:

```bash
npm run fonts:setup
```

Use this guide for:

- adding a new text font family
- updating existing text fonts (Manrope/Gambetta/etc.)
- updating the custom icon font (`CydFont`)

---

## 1) Add or update a text font family

### Step 1: Place font files

Add the font files to `assets/fonts/`.

Example:

- `Inter-Regular.ttf`
- `Inter-Medium.ttf`
- `Inter-SemiBold.ttf`
- `Inter-Bold.ttf`

### Step 2: Regenerate native assets

Run:

```bash
npm run fonts:setup
```

This updates:

- `android/app/src/main/res/font/*`
- `ios/Cypherd/Info.plist`
- `ios/Cypherd.xcodeproj/project.pbxproj`

### Step 3: Update typography mapping

Edit `src/constants/typography.ts`:

- add the family to `AppFontFamily`
- add iOS + Android weight mappings in `FONT_FAMILIES`

Use fonts from code via `typography` helpers, not hardcoded names.

### Step 4: Update Tailwind/NativeWind font aliases

If you use font classes like `font-manrope`, add the new family in `tailwind.config.js`:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        manrope: ['Manrope'],
        gambetta: ['Gambetta'],
        inter: ['Inter'], // add new family alias here
      },
    },
  },
};
```

Then use it in UI:

```tsx
<CyDText className='font-inter font-semibold text-[16px]'>Example</CyDText>
```

Notes:

- left side (`inter`) is the class alias (`font-inter`)
- right side (`Inter`) must match the registered family name
- keep `typography.ts` and `tailwind.config.js` in sync for the same family

---

## 2) Update the CydFont icon font

`CydFont` is the custom icon font used by `CyDIconsPack` via `@react-native-vector-icons/icomoon` v13.

### How it works

- **Source of truth**: `assets/fonts/CydFont.ttf` + `src/customFonts/selection.json`
- **v13 native font**: `rnvi-fonts/icomoon/CydFont.ttf` (copied by `fonts:setup`)
- **Icon config**: `src/customFonts/generator.tsx` transforms the IcoMoon App JSON format to v13 format
- CydFont.ttf is NOT linked via `react-native-asset` — it's managed by the icomoon pod/gradle plugin

### Step 1: Export from IcoMoon App

Export your icon set from [IcoMoon App](https://icomoon.io/app/).

The new IcoMoon App exports a JSON with this structure:
```json
{
  "glyphs": [
    { "extras": { "name": "icon-name", "codePoint": 61445 }, ... }
  ]
}
```

`generator.tsx` automatically transforms this to the v13 expected format.

### Step 2: Replace icon font artifacts

- Replace `rnvi-fonts/icomoon/CydFont.ttf` with the new `.ttf` from the export
- Replace `src/customFonts/selection.json` with the new JSON from the export
- Update `src/customFonts/type.ts` if icon names changed (add/remove from `IconNames` union)

> **Important:** CydFont.ttf lives in `rnvi-fonts/icomoon/`, NOT `assets/fonts/`.
> Placing it in `assets/fonts/` causes duplicate build errors.

### Step 3: Regenerate native assets

Run:

```bash
npm run fonts:setup
```

This copies `CydFont.ttf` → `rnvi-fonts/icomoon/CydFont.ttf` and relinks text fonts.

### Step 4: Rebuild

```bash
# iOS
cd ios && pod install && cd ..
npm run ios

# Android
cd android && ./gradlew clean && cd ..
npm run android
```

### Step 5: Validate icon usage

Confirm icons render correctly in screens that use:

- `CyDIconsPack`
- `CyDIcons`

---

## 3) Update app references (if needed)

For any new font family, ensure these are aligned:

- `tailwind.config.js` `fontFamily` map
- `src/constants/typography.ts` family + weights
- `android/app/src/main/java/com/cypherd/androidwallet/MainApplication.kt` registration for the family

If `react-native-asset` does not insert the registration line for a new family, add it manually.

---

## 4) Commit checklist

After setup, commit all relevant files:

- `assets/fonts/*` (the source fonts)
- `rnvi-fonts/icomoon/CydFont.ttf` (v13 managed copy)
- `android/app/src/main/res/font/*` (generated Android fonts/xml)
- `ios/Cypherd/Info.plist`
- `ios/Cypherd.xcodeproj/project.pbxproj`
- `src/customFonts/selection.json` and `src/customFonts/type.ts` (if `CydFont` changed)

---

## 5) Troubleshooting

### "Multiple commands produce CydFont.ttf"

CydFont.ttf must NOT be in both `react-native-asset` linking AND `rnvi-fonts/icomoon/`.
The `fonts:setup` script handles this automatically by hiding CydFont.ttf during asset linking.

If you still get this error:
1. Remove `CydFont.ttf` from `ios/Cypherd/Info.plist` UIAppFonts array
2. Clean Xcode derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/Cypherd-*`
3. Re-run `npm run fonts:setup` and `pod install`

### Duplicate Android font resources

If you see duplicate resource errors (`font/cydfont` etc.), run:

```bash
npm run fonts:setup
cd android && ./gradlew clean && cd ..
```

The setup script already resolves `xml + same-name ttf` collisions automatically.

### Icons not rendering / wrong glyphs

1. Verify `selection.json` has the correct `glyphs[].extras.name` and `glyphs[].extras.codePoint`
2. Verify `type.ts` `IconNames` union matches the names in `selection.json`
3. Run `npm run fonts:setup` to re-sync the font file
4. Clear Metro cache: `npx react-native start --reset-cache`

### Fonts are out of sync in CI/local

Run:

```bash
npm run fonts:check
```
