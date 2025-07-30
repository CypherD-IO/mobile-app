# Custom Fonts - Adding New Icons

This directory contains the custom icon font for the Cypher mobile app. The font is generated using [IcoMoon.io](https://icomoon.io/app/).

## Current Font Files

- `selection.json` - IcoMoon project file containing all icon definitions
- `CydFont.ttf` - The generated font file
- `generator.tsx` - Font generation script
- `index.ts` - Font loading configuration

## How to Add New Icons

### Step 1: Import Existing Selection File

1. Go to [IcoMoon.io](https://icomoon.io/app/)
2. Click "Import Icons" button
3. Upload the existing `selection.json` file from this directory
4. This will load all current icons with their existing settings and codes

### Step 2: Add New Icons

1. **Prepare SVG Files**: Create your new icons as SVG files

   - Recommended size: 32x32 pixels
   - Use simple, clean paths
   - Ensure proper viewBox attribute
   - Remove unnecessary attributes (fill, stroke, etc.)

2. **Upload to IcoMoon**:

   - Click "Import Icons" again
   - Select your new SVG files
   - IcoMoon will automatically assign new codes to new icons

3. **Organize Icons**:
   - Arrange icons in desired order
   - Set appropriate names for new icons
   - Ensure consistent sizing (32px recommended)

### Step 3: Generate New Font

1. **Download Font Files**:

   - Click "Generate Font" button
   - Download the generated package
   - Extract the files

2. **Replace Files**:
   - Replace `selection.json` with the new selection file
   - Replace `CydFont.ttf` with the new font file
   - Update any other generated files as needed

### Step 4: Link Fonts in React Native

After replacing the font files, run the following command to link the fonts:

```bash
npx react-native-asset
```

This command will:

- Copy the font files to the appropriate platform directories
- Update the necessary configuration files
- Ensure the fonts are properly linked for both iOS and Android

## Important Notes

### Font Codes

- Each icon has a unique code (e.g., `59737` for `airdrop-icon`)
- These codes are used in the app to reference specific icons
- When adding new icons, IcoMoon will automatically assign new codes
- Keep track of new icon codes for use in the app

### Icon Naming

- Use descriptive, kebab-case names (e.g., `new-feature-icon`)
- Avoid spaces or special characters
- Be consistent with existing naming conventions

### File Structure

```
src/customFonts/
├── README.md          # This file
├── selection.json     # IcoMoon project file
├── CydFont.ttf       # Generated font file
├── generator.tsx      # Font generation script
└── index.ts          # Font loading configuration
```

### Usage in App

Icons are used in the app via their unicode codes. The font family name is defined as a constant in the types file for consistency:

```typescript
// Import the font family constant
import { CUSTOM_FONT_FAMILY } from '../customFonts/type';

// In your component
<Text style={{ fontFamily: CUSTOM_FONT_FAMILY }}>{'\ue8a9'}</Text>
```

**Note**: Always use the `CUSTOM_FONT_FAMILY` constant instead of hardcoding the font name to ensure consistency across the application.

### Troubleshooting

1. **Font not loading**: Run `npx react-native-asset` again
2. **Icons not showing**: Check that the font family name matches in your code
3. **Wrong icons**: Verify the unicode codes match the IcoMoon codes
4. **Build issues**: Clean and rebuild the project after font changes

## Best Practices

1. **Backup**: Always backup the current `selection.json` before making changes
2. **Test**: Test new icons thoroughly on both iOS and Android
3. **Documentation**: Update this README when adding new icons
4. **Version Control**: Commit both the selection file and font file together
5. **Consistency**: Maintain consistent icon style and sizing

## Icon Guidelines

- **Size**: 32x32 pixels recommended
- **Style**: Simple, clean, monochrome designs
- **Format**: SVG with clean paths
- **Colors**: Use single color (will be controlled by CSS)
- **Complexity**: Keep designs simple for better font rendering

## Support

For issues with the custom font system:

1. Check the IcoMoon documentation
2. Verify font linking with `npx react-native-asset`
3. Test on both platforms (iOS/Android)
4. Check the React Native asset linking documentation
