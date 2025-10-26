# Chrome AI Setup for Tabby

This extension uses **Chrome's on-device AI (Gemini Nano)** to extract product details from shopping pages. This feature is currently only available in **Chrome Canary** with specific flags enabled.

## Requirements

- **Chrome Canary** (version 127 or later)
- Approximately 22 GB of free disk space (for AI model download)

## Setup Instructions

### 1. Download Chrome Canary

Download from: https://www.google.com/chrome/canary/

### 2. Enable Required Flags

Open Chrome Canary and navigate to these URLs to enable the flags:

#### Enable Prompt API
```
chrome://flags/#prompt-api-for-gemini-nano
```
Set to: **Enabled**

#### Enable Optimization Guide
```
chrome://flags/#optimization-guide-on-device-model
```
Set to: **Enabled BypassPerfRequirement**

### 3. Restart Chrome Canary

After enabling both flags, restart Chrome Canary completely.

### 4. Download the AI Model

1. Open Chrome DevTools (F12)
2. Go to the **Console** tab
3. Run this command:
```javascript
await ai.languageModel.create()
```

4. If the model needs to download, you'll see a message. Wait for the download to complete (this may take several minutes)
5. Check the status with:
```javascript
(await ai.languageModel.capabilities()).available
```

**Expected responses:**
- `"readily"` - Model is ready to use ✅
- `"after-download"` - Model is downloading, please wait
- `"no"` - Model not available (check flags)

### 5. Install the Extension

1. Build the extension:
```bash
pnpm install
pnpm dev
```

2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `.output/chrome-mv3` folder

## Testing

Visit a product page like:
```
https://www.bhphotovideo.com/c/product/1852445-REG/apple_mww43am_a_airpods_max_midnight.html
```

Open DevTools Console and look for `tabby-test:` logs to see the AI extraction in action:

```
tabby-test: Checking URL: https://www.bhphotovideo.com/...
tabby-test: Potential product page detected
tabby-test: Falling back to Chrome AI extraction
tabby-test: Creating AI session
tabby-test: AI session created successfully
tabby-test: Sending prompt to AI
tabby-test: AI raw response: { ... }
tabby-test: Successfully parsed AI response: { title: "...", price: ... }
```

## Supported Sites

The extension works on any product page but has optimized selectors for:

- **Amazon** (amazon.com)
- **eBay** (ebay.com)
- **B&H Photo Video** (bhphotovideo.com)
- Other sites will use Chrome AI for extraction

## Troubleshooting

### "Chrome AI not available" error

1. Verify you're using Chrome Canary
2. Check both flags are enabled
3. Restart Chrome completely
4. Try downloading the model again

### AI model not downloading

1. Ensure you have 22+ GB free disk space
2. Check your internet connection
3. Try again in a few minutes

### No logs appearing

1. Open DevTools Console
2. Make sure you're on a product page
3. Check that the extension is loaded
4. Look for any error messages

## Privacy

All AI processing happens **on-device**. Your browsing data never leaves your computer.
