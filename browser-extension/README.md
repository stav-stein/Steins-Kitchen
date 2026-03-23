# Stein's Kitchen — browser extension

Opens a new tab to your app at `/add?url=<current tab URL>` so the recipe URL field is prefilled (then tap **Extract** in the app).

## Install (Chrome or Edge)

1. Start the app: run the Vite client on port **5173** and the API server on **3001** (same as local dev).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose this `browser-extension` folder.
5. Optional: click **Details** → **Extension options** (or right-click the extension icon → **Options**) and set **App base URL** if you do not use `http://localhost:5173`.

## Use

1. Open a recipe page in a normal tab.
2. Click the extension icon in the toolbar (pin it if needed).
3. A new tab opens on **Add recipe** with the URL filled in; press **Extract** to run your existing API flow.

Internal browser pages (`chrome://`, PDF viewer, etc.) are ignored.
