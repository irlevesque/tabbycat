# Quick Start Guide

Get Tabbycat up and running in 5 minutes.

## Prerequisites Check

Before starting, make sure you have:
- Node.js 18 or higher installed
- MongoDB running locally or a MongoDB Atlas connection string

## Setup

### 1. Run Setup Script

```bash
cd tabbycat
./setup.sh
```

This will install all necessary dependencies and create a `.env` file.

### 2. Configure Environment

Edit `backend/.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tabsync
JWT_SECRET=change-this-to-a-secure-random-string
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

For Google OAuth setup, see [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md).

### 3. Start MongoDB

If using local MongoDB:
```bash
mongod
```

### 4. Start Backend

In a new terminal:
```bash
cd tabbycat/backend
npm run dev
```

You should see: `Server running on port 3000`

### 5. Build Extension

In another terminal:
```bash
cd tabbycat/extension
npm run build
```

### 6. Load Extension

#### Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Navigate to `tabbycat/extension/dist`
5. Click "Select Folder"

#### Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Navigate to `tabbycat/extension/dist/manifest.json`
4. Click "Open"

### 7. Authenticate

1. Click the extension icon in your browser toolbar
2. Click "Sign in with Google"
3. Authorize the extension
4. Copy the token displayed
5. (Manual step for now - will be automated)

### 8. Test Sync

1. Open some tabs in your browser
2. Click "Sync Now" in the extension popup
3. The tabs will be synced to the backend
4. View synced tabs in the popup under "Connected Devices"

## Next Steps

- Install the extension on another browser or device
- Sign in with the same Google account
- Tabs should sync between devices automatically

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check the MONGODB_URI in `backend/.env`

### OAuth Error
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in `backend/.env`
- Check that the redirect URI matches: `http://localhost:3000/auth/callback/google`

### Extension Won't Load
- Check that `extension/dist` folder exists and contains all files
- Look at Chrome/Firefox extension error logs

For more detailed information, see the main [README.md](README.md).
