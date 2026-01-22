# Font Management Guide

This guide explains how to add and configure custom fonts in the Cypher mobile app for both iOS and Android platforms.

## Table of Contents

- [Quick Start](#quick-start)
- [Detailed Steps](#detailed-steps)
- [Android Font Family Configuration](#android-font-family-configuration)
- [Verifying Font Installation](#verifying-font-installation)
- [Using Fonts in Components](#using-fonts-in-components)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

To add a new font to the app:

```bash
# 1. Place your font files (.ttf or .otf) in this directory
cp /path/to/your/font.ttf ./assets/fonts/

# 2. Run the React Native asset linker
npx react-native-asset

# 3. Create Android font family XML (see detailed steps below)

# 4. Update tailwind.config.js to add the font family

# 5. Rebuild the app
npm run android  # For Android
npm run ios      # For iOS
```

---

## Detailed Steps

### Step 1: Add Font Files to Assets Directory

Place your font files (`.ttf` or `.otf`) in the `assets/fonts/` directory:

```bash
# Example: Adding a new font family
assets/fonts/
├── YourFont-Regular.ttf
├── YourFont-Bold.ttf
├── YourFont-SemiBold.ttf
├── YourFont-Light.ttf
└── ...
```

**Naming Convention:**

- Use descriptive names with weight indicators
- Examples: `Roboto-Regular.ttf`, `Roboto-Bold.ttf`, `OpenSans-Light.ttf`
- Avoid spaces in filenames (use hyphens or underscores)

### Step 2: Run React Native Asset Linker

The asset linker will automatically copy fonts to both iOS and Android:

```bash
npx react-native-asset
```

**What this command does:**

- ✅ Copies fonts to `android/app/src/main/res/font/` (converted to lowercase)
- ✅ Updates Android project configuration
- ✅ Copies fonts to iOS project
- ✅ Updates iOS `Info.plist` with font references
- ✅ Creates/updates `link-assets-manifest.json` in both platforms

**Important Notes:**

- Font filenames will be converted to lowercase on Android
- Special characters and spaces will be replaced with underscores
- Example: `YourFont-Bold.ttf` → `yourfont_bold.ttf` (on Android)

### Step 3: Create Android Font Family XML

**Why is this needed?**
Android requires XML configuration files to properly map font weights to font files. Without this, Android will artificially synthesize bold text, which looks poor compared to iOS.

Navigate to the Android font resources directory:

```bash
cd android/app/src/main/res/font/
```

Create an XML file named after your font family (e.g., `yourfont.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<font-family xmlns:app="http://schemas.android.com/apk/res-auto">
  <font app:fontStyle="normal" app:fontWeight="200" app:font="@font/yourfont_extralight"/>
  <font app:fontStyle="normal" app:fontWeight="300" app:font="@font/yourfont_light"/>
  <font app:fontStyle="normal" app:fontWeight="400" app:font="@font/yourfont_regular"/>
  <font app:fontStyle="normal" app:fontWeight="500" app:font="@font/yourfont_medium"/>
  <font app:fontStyle="normal" app:fontWeight="600" app:font="@font/yourfont_semibold"/>
  <font app:fontStyle="normal" app:fontWeight="700" app:font="@font/yourfont_bold"/>
  <font app:fontStyle="normal" app:fontWeight="800" app:font="@font/yourfont_extrabold"/>
</font-family>
```

**Font Weight Mapping:**
| Weight | CSS Value | Common Name |
|--------|-----------|-------------|
| 100 | Thin | Thin |
| 200 | ExtraLight| Extra Light |
| 300 | Light | Light |
| 400 | Normal | Regular |
| 500 | Medium | Medium |
| 600 | SemiBold | Semi Bold |
| 700 | Bold | Bold |
| 800 | ExtraBold | Extra Bold |
| 900 | Black | Black |

**If you only have one font file:**
You can map all weights to the same file to prevent synthetic bolding:

```xml
<?xml version="1.0" encoding="utf-8"?>
<font-family xmlns:app="http://schemas.android.com/apk/res-auto">
  <font app:fontStyle="normal" app:fontWeight="400" app:font="@font/yourfont"/>
  <font app:fontStyle="normal" app:fontWeight="500" app:font="@font/yourfont"/>
  <font app:fontStyle="normal" app:fontWeight="600" app:font="@font/yourfont"/>
  <font app:fontStyle="normal" app:fontWeight="700" app:font="@font/yourfont"/>
  <font app:fontStyle="normal" app:fontWeight="800" app:font="@font/yourfont"/>
</font-family>
```

**Example: See existing configurations**

- `android/app/src/main/res/font/manrope.xml` - Multiple weight variants
- `android/app/src/main/res/font/nord.xml` - Single weight
- `android/app/src/main/res/font/gambette.xml` - Single file, multiple weights

### Step 4: Register Font in MainApplication.java (Optional)

If the font doesn't load properly, you may need to manually register it in `android/app/src/main/java/com/cypherd/androidwallet/MainApplication.java`:

```java
// Inside the onCreate() method
ReactFontManager.getInstance().addCustomFont(this, "Your Font Family Name", R.font.yourfont);
```

**Example from our app:**

```java
ReactFontManager.getInstance().addCustomFont(this, "Manrope", R.font.manrope);
ReactFontManager.getInstance().addCustomFont(this, "Gambette", R.font.gambette);
```

### Step 5: Update Tailwind Configuration

Add the font family to `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        manrope: ['Manrope'],
        nord: ['Cypher Nord'],
        gambette: ['Gambette'],
        yourfont: ['Your Font Family Name'], // Add your font here
      },
    },
  },
};
```

**Important:** The font family name should match:

- The name used in iOS `Info.plist` (can check in Xcode)
- The name registered in `MainApplication.java`
- The display name of the font (not necessarily the filename)

### Step 6: Rebuild the App

After adding fonts, you must rebuild the native apps:

**Android:**

```bash
# Clean build (recommended for font changes)
cd android && ./gradlew clean && cd ..
npm run android

# Or use the npm script
npm run clean-android && npm run android
```

**iOS:**

```bash
# Clean and rebuild
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
npm run ios

# Or use the npm script
npm run pod-install && npm run ios
```

---

## Verifying Font Installation

### Check Android

1. **Verify font files copied:**

```bash
ls -la android/app/src/main/res/font/
```

2. **Check link-assets-manifest.json:**

```bash
cat android/link-assets-manifest.json
```

3. **Verify XML file created:**

```bash
cat android/app/src/main/res/font/yourfont.xml
```

### Check iOS

1. **Verify fonts in Info.plist:**

```bash
cat ios/Cypherd/Info.plist | grep -A 20 "UIAppFonts"
```

2. **Check link-assets-manifest.json:**

```bash
cat ios/link-assets-manifest.json
```

3. **Verify in Xcode:**

- Open `ios/Cypherd.xcworkspace` in Xcode
- Check target → Build Phases → Copy Bundle Resources
- Fonts should be listed there

---

## Using Fonts in Components

### Using with Tailwind/NativeWind

```tsx
import { Text } from 'react-native';

// Using Tailwind classes
<CyDText className="font-yourfont text-[24px] font-bold">
  Your Text Here
</CyDText>

// Available weight classes
<CyDText className="font-yourfont font-thin">Thin (100)</CyDText>
<CyDText className="font-yourfont font-extralight">Extra Light (200)</CyDText>
<CyDText className="font-yourfont font-light">Light (300)</CyDText>
<CyDText className="font-yourfont font-normal">Regular (400)</CyDText>
<CyDText className="font-yourfont font-medium">Medium (500)</CyDText>
<CyDText className="font-yourfont font-semibold">Semi Bold (600)</CyDText>
<CyDText className="font-yourfont font-bold">Bold (700)</CyDText>
<CyDText className="font-yourfont font-extrabold">Extra Bold (800)</CyDText>
<CyDText className="font-yourfont font-black">Black (900)</CyDText>
```

### Using with Direct Style

```tsx
import { Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  customText: {
    fontFamily: 'Your Font Family Name',
    fontWeight: '700', // Bold
    fontSize: 24,
  },
});

<Text style={styles.customText}>Your Text Here</Text>;
```

---

## Troubleshooting

### Font Not Showing on Android

**Symptoms:** Font displays as default system font on Android

**Solutions:**

1. **Check font file was copied:**

```bash
ls -la android/app/src/main/res/font/ | grep yourfont
```

2. **Verify XML file exists and is correct:**

```bash
cat android/app/src/main/res/font/yourfont.xml
```

3. **Clean and rebuild:**

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

4. **Check font filename matches XML reference:**

   - XML reference: `@font/yourfont_bold`
   - File must exist: `yourfont_bold.ttf`
   - Names are case-sensitive

5. **Register in MainApplication.java if needed**

### Font Not Showing on iOS

**Symptoms:** Font displays as default system font on iOS

**Solutions:**

1. **Check Info.plist includes the font:**

```bash
cat ios/Cypherd/Info.plist | grep -A 20 "UIAppFonts"
```

2. **Verify font is in Bundle Resources:**

   - Open Xcode
   - Target → Build Phases → Copy Bundle Resources
   - Font should be listed

3. **Clean and rebuild:**

```bash
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
npm run ios
```

4. **Use correct font family name:**
   - The family name might differ from filename
   - Check font properties in Font Book (macOS) or similar tool

### Font Looks Bold/Synthetic on Android

**Cause:** Missing or incorrect Android font family XML configuration

**Solution:**

1. Create the XML file as described in Step 3
2. Map all weights you use in your app
3. Rebuild the Android app

### React Native Asset Command Not Found

**Solution:**

```bash
# Install react-native-asset globally
npm install -g react-native-asset

# Or use npx (recommended)
npx react-native-asset
```

### Font Weight Not Working

**Cause:** Font file doesn't include that weight variant

**Solutions:**

1. Add the specific weight font file (e.g., `YourFont-Bold.ttf`)
2. Update the Android XML to reference the new file
3. Rebuild the app

---

## Examples from Our Codebase

### Manrope (Multiple Weights)

**Files:**

- `Manrope-ExtraLight.ttf` (200)
- `Manrope-Light.ttf` (300)
- `Manrope-Regular.ttf` (400)
- `Manrope-Medium.ttf` (500)
- `Manrope-SemiBold.ttf` (600)
- `Manrope-Bold.ttf` (700)
- `Manrope-ExtraBold.ttf` (800)

**Android XML:** `android/app/src/main/res/font/manrope.xml`

**Usage:**

```tsx
<CyDText className='font-manrope font-bold text-[20px]'>Bold Text</CyDText>
```

---

## Best Practices

1. **Always create Android XML files** for optimal rendering quality
2. **Use descriptive font filenames** with weight indicators
3. **Test on both platforms** after adding fonts
4. **Document font licenses** if using third-party fonts
5. **Keep font file sizes reasonable** - large fonts increase app size
6. **Use font subsets** if only specific characters are needed
7. **Prefer TTF over OTF** for better React Native compatibility
8. **Clean build when changing fonts** to avoid caching issues

---

## Commands Reference

```bash
# Add font and link
npx react-native-asset

# Clean build Android
cd android && ./gradlew clean && cd .. && npm run android

# Clean build iOS
cd ios && rm -rf Pods Podfile.lock && pod install && cd .. && npm run ios

# Check Android fonts
ls -la android/app/src/main/res/font/

# Check iOS fonts in plist
cat ios/Cypherd/Info.plist | grep -A 20 "UIAppFonts"

# Verify font linking
cat android/link-assets-manifest.json
cat ios/link-assets-manifest.json
```

---

## Additional Resources

- [React Native Custom Fonts](https://reactnative.dev/docs/custom-fonts)
- [Android Font Resources](https://developer.android.com/guide/topics/ui/look-and-feel/fonts-in-xml)
- [iOS Custom Fonts](https://developer.apple.com/documentation/uikit/text_display_and_fonts/adding_a_custom_font_to_your_app)
- [NativeWind Font Family](https://www.nativewind.dev/tailwind/typography/font-family)

---

**Last Updated:** January 2026
**Maintained By:** Cypher Mobile Team
