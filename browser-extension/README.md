# amita.ai Browser Extension

Real-time AI writing assistant that helps you preserve your authentic voice while writing anywhere on the web.

## Features

✨ **Real-time Analysis**: Analyze text as you type in any text field
🔍 **One-click Analysis**: Analyze selected text or entire pages instantly  
⚡ **Quick Fixes**: Apply AI-powered improvements with a single click
📊 **Writing Stats**: Track your writing authenticity over time
⌨️ **Keyboard Shortcuts**: Fast access with customizable hotkeys
🎨 **Smart Indicators**: Visual badges on text fields for easy access

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `browser-extension` folder from this project
5. The extension icon will appear in your toolbar

## Usage

### First Time Setup
1. Click the extension icon in your toolbar
2. Sign in with your amita.ai account (or create one)
3. Start analyzing text on any website!

### Analyzing Text
- **Option 1**: Select text and right-click → "Analyze with amita.ai"
- **Option 2**: Click the green amita.ai badge next to any text field
- **Option 3**: Use keyboard shortcut `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows)
- **Option 4**: Click extension icon → "Analyze Current Page"

### Applying Fixes
- After analysis, click "Apply Fix" on individual suggestions
- Or use "Apply All Fixes" to improve everything at once
- Keyboard shortcut: `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows)

## Configuration

Access settings by:
1. Right-clicking the extension icon → "Options"
2. Or clicking the gear icon in the extension popup

### Available Settings
- **Real-time Analysis**: Toggle automatic analysis while typing
- **Field Indicators**: Show/hide amita.ai badges on text fields
- **Auto-analyze**: Automatically analyze when text reaches minimum length
- **Minimum Text Length**: Set minimum characters for analysis (20-500)
- **Theme**: Choose between Light, Dark, or Auto themes
- **Notifications**: Enable/disable desktop notifications

## Keyboard Shortcuts

Default shortcuts (customizable in Chrome settings):
- `Cmd+Shift+A` / `Ctrl+Shift+A`: Analyze selected text
- `Cmd+Shift+F` / `Ctrl+Shift+F`: Apply quick fixes

To customize: Chrome menu → More Tools → Extensions → Keyboard shortcuts

## Privacy & Security

- All text is processed through your authenticated amita.ai account
- No data is stored locally except your authentication token
- Analysis history can be cleared anytime from settings
- Your writing samples are never shared or used for training

## Supported Sites

The extension works on all websites, with optimized support for:
- Gmail
- LinkedIn  
- Twitter/X
- Facebook
- Reddit
- Medium
- Google Docs (limited)
- And any site with text input fields!

## Troubleshooting

### Extension not working?
1. Make sure you're signed in (check popup)
2. Refresh the page after installation
3. Check that the site allows extensions

### Analysis not appearing?
1. Ensure text is at least 50 characters
2. Check your internet connection
3. Try signing out and back in

### Keyboard shortcuts not working?
1. Check for conflicts in chrome://extensions/shortcuts
2. Some sites may override shortcuts
3. Use right-click menu as alternative

## Development

### File Structure
```
browser-extension/
├── manifest.json       # Extension configuration
├── src/
│   ├── background.js   # Service worker for API calls
│   ├── content.js      # Injected into web pages
│   ├── popup.js        # Extension popup UI
│   ├── options.js      # Settings page
│   ├── auth.js         # Authentication helpers
│   ├── api.js          # API communication
│   └── *.css           # Styling files
└── public/
    ├── popup.html      # Popup structure
    ├── options.html    # Settings page
    └── icons/          # Extension icons
```

### Building for Production
1. Update version in `manifest.json`
2. Remove development URLs from `background.js`
3. Create ZIP of entire `browser-extension` folder
4. Upload to Chrome Web Store

## Support

- **Documentation**: https://amita.ai/docs
- **Dashboard**: https://amita.ai/dashboard
- **Support**: support@amita.ai

## License

© 2024 amita.ai - All rights reserved