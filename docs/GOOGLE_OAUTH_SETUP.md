# Setting up Google OAuth

This guide will help you set up Google OAuth credentials for the Tab Sync Extension.

## Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" at the top
3. Click "New Project"
4. Enter a project name (e.g., "Tab Sync Extension")
5. Click "Create"

### 2. Enable Google+ API

1. In the left sidebar, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and click "Enable"

### 3. Create OAuth 2.0 Credentials

1. In the left sidebar, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External"
   - Enter app name: "Tab Sync Extension"
   - User support email: your email
   - Developer contact: your email
   - Click "Save and Continue"
   - Click "Save and Continue" on remaining steps (optional)
   - Click "Back to Dashboard"

4. Configure the OAuth client:
   - Application type: Web application
   - Name: "Tab Sync Extension"
   - Authorized redirect URIs: `http://localhost:3000/auth/callback/google`
   - Click "Create"

### 4. Copy Credentials

After creating the OAuth client, you'll see:
- Client ID: Copy this to `GOOGLE_CLIENT_ID` in `backend/.env`
- Client Secret: Copy this to `GOOGLE_CLIENT_SECRET` in `backend/.env`

### 5. Test

1. Update `backend/.env` with your credentials
2. Restart the backend server
3. Open the extension and click "Sign in with Google"
4. Complete the OAuth flow
5. You should receive an authentication token

## Notes

- For development, using `http://localhost:3000` is fine
- For production, you'll need to use HTTPS and update the redirect URI
- Make sure your OAuth consent screen is configured properly before going to production
- You can add additional redirect URIs for different environments
