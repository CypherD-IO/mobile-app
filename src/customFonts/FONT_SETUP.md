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

`CydFont` is the custom icon font used by `CyDIconsPack`.

### Step 1: Replace icon font artifacts

Usually from IcoMoon export:

- replace `assets/fonts/CydFont.ttf`
- update `src/customFonts/selection.json`
- update icon types in `src/customFonts/type.ts` if icon names changed

### Step 2: Regenerate native assets

Run:

```bash
npm run fonts:setup
```

### Step 3: Validate icon usage

Confirm icons render correctly in screens that use:

- `CyDIconsPack`
- `CyDIcons`
- `typography.icon` (where relevant)

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
- `android/app/src/main/res/font/*` (generated Android fonts/xml)
- `ios/Cypherd/Info.plist`
- `ios/Cypherd.xcodeproj/project.pbxproj`
- `src/constants/typography.ts` (if updated)
- `src/customFonts/selection.json` and `src/customFonts/type.ts` (if `CydFont` changed)

---

## 5) Troubleshooting

### Duplicate Android font resources

If you see duplicate resource errors (`font/cydfont` etc.), run:

```bash
npm run fonts:setup
cd android && ./gradlew clean && cd ..
```

The setup script already resolves `xml + same-name ttf` collisions automatically.

### "Class MainApplication not found"

If this appears during asset linking, do not revert `MainApplication` signature changes in this repo.
The current class structure is intentionally compatible with the font linker tool.

### Fonts are out of sync in CI/local

Run:

```bash
npm run fonts:check
```
