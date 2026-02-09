import express, { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Temporary token storage (in-memory, 5 minute TTL)
const pendingTokens = new Map<string, { token: string; expiresAt: number }>();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CLIENT_URL = process.env.CLIENT_URL || 'chrome-extension://*';

router.get('/google', (req: Request, res: Response) => {
  const { extensionId } = req.query;
  const redirectUri = `http://localhost:3000/auth/callback/google`;
  const scope = 'openid email profile';

  const state = extensionId ? Buffer.from(JSON.stringify({ extensionId })).toString('base64') : '';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `state=${encodeURIComponent(state)}`;

  res.redirect(authUrl);
});

router.get('/callback/google', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'No code provided' });
    }

    let extensionId = '';

    if (state && typeof state === 'string') {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        extensionId = stateData.extensionId || '';
      } catch (e) {
        console.error('Failed to parse OAuth state:', e);
      }
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: 'http://localhost:3000/auth/callback/google',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token: string; error?: string };

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error || 'Failed to exchange code for token');
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = (await userResponse.json()) as { id: string; email: string; name?: string };

    let user = await User.findOne({ oauthProvider: 'google', oauthId: userData.id });

    if (!user) {
      user = new User({
        email: userData.email,
        name: userData.name,
        oauthProvider: 'google',
        oauthId: userData.id,
      });
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Generate a unique token ID for polling (works even without extensionId)
    const tokenId = crypto.randomUUID();
    const tokenExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store token for polling with multiple keys for robustness
    // 1. Store with unique tokenId (primary method)
    pendingTokens.set(tokenId, {
      token,
      expiresAt: tokenExpiration
    });

    // 2. Store with extensionId if available (secondary method)
    if (extensionId) {
      pendingTokens.set(extensionId, {
        token,
        expiresAt: tokenExpiration
      });
    }

    // Clean up expired tokens periodically
    setTimeout(() => {
      const now = Date.now();
      for (const [key, value] of pendingTokens.entries()) {
        if (value.expiresAt < now) {
          pendingTokens.delete(key);
        }
      }
    }, 60000);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Complete</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            max-width: 500px;
          }
          h1 {
            margin-bottom: 20px;
            font-size: 32px;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .status {
            font-size: 18px;
            margin-bottom: 10px;
          }
          .instructions {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 20px;
          }
          .close-hint {
            font-size: 12px;
            opacity: 0.6;
            margin-bottom: 20px;
          }
          .fallback-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
          }
          .token-display {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
            max-height: 150px;
            overflow-y: auto;
          }
          .copy-button {
            margin-top: 10px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
          }
          .copy-button:hover {
            background: rgba(255,255,255,0.3);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1 id="title">Authentication Successful</h1>
          <div class="status" id="status">Sending token to extension...</div>
          <div class="instructions" id="instructions"></div>
          <div class="close-hint" id="closeHint"></div>

          <div class="fallback-section" id="fallback" style="display: none;">
            <div class="instructions">Automatic token delivery failed. Please manually copy the token:</div>
            <div class="token-display">${token}</div>
            <button class="copy-button" onclick="copyToken()">Copy Token</button>
          </div>
        </div>
        <script>
          const extensionId = '${extensionId}';
          const jwtToken = '${token}';
          const tokenId = '${tokenId}';
          const TOKEN_KEY = 'pending_auth_token';

          function updateSuccess() {
            document.getElementById('status').textContent = 'Authentication complete!';
            document.getElementById('instructions').textContent = 'Your extension will automatically receive the token';
            document.getElementById('closeHint').textContent = 'You can close this tab - the extension will sync shortly';
          }

          function showFallback() {
            document.getElementById('title').textContent = 'Authentication Successful';
            document.getElementById('status').textContent = 'Automatic delivery not available';
            document.getElementById('instructions').textContent = 'Please copy the token below and manually save it in the extension';
            document.getElementById('closeHint').textContent = '';
            document.getElementById('fallback').style.display = 'block';
          }

          function copyToken() {
            navigator.clipboard.writeText(jwtToken);
            const btn = document.querySelector('.copy-button');
            btn.textContent = 'Copied!';
            setTimeout(() => {
              btn.textContent = 'Copy Token';
            }, 2000);
          }

          // Store token info for polling
          localStorage.setItem(TOKEN_KEY, tokenId);

          // Try to send token to extension via message (Chrome)
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage && extensionId) {
            chrome.runtime.sendMessage(extensionId, { type: 'AUTH_SUCCESS', token: jwtToken, tokenId }, (response) => {
              if (chrome.runtime.lastError) {
                console.log('Extension message failed (expected in Firefox):', chrome.runtime.lastError);
                // Token is in backend storage for polling, extension will retrieve it
                updateSuccess();
              } else {
                console.log('Token sent to extension successfully');
                localStorage.removeItem(TOKEN_KEY);
                updateSuccess();
              }
            });
          } else {
            console.log('Chrome runtime not available (Firefox), token stored in backend for polling');
            updateSuccess();
          }

          // After 3 seconds, show fallback if polling didn't work
          setTimeout(() => {
            const tokenInStorage = localStorage.getItem(TOKEN_KEY);
            if (tokenInStorage) {
              console.log('Token not retrieved by extension, showing fallback');
              showFallback();
            }
          }, 3000);
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/poll', (req: Request, res: Response) => {
  const { extensionId, tokenId } = req.query;

  const tokenIdStr = Array.isArray(tokenId) ? tokenId[0] : tokenId;
  const extensionIdStr = Array.isArray(extensionId) ? extensionId[0] : extensionId;

  let pending = null;

  // Try to find token by tokenId first (primary method)
  if (tokenIdStr && typeof tokenIdStr === 'string') {
    pending = pendingTokens.get(tokenIdStr);
    if (pending) {
      console.log('Token found by tokenId:', tokenIdStr);
    }
  }

  // If not found, try by extensionId (fallback for Chrome)
  if (!pending && extensionIdStr && typeof extensionIdStr === 'string') {
    pending = pendingTokens.get(extensionIdStr);
    if (pending) {
      console.log('Token found by extensionId:', extensionIdStr);
    }
  }

  if (!pending) {
    return res.json({ found: false });
  }

  // Check if token expired
  if (pending.expiresAt < Date.now()) {
    // Clean up expired tokens
    if (tokenIdStr && typeof tokenIdStr === 'string') pendingTokens.delete(tokenIdStr);
    if (extensionIdStr && typeof extensionIdStr === 'string') pendingTokens.delete(extensionIdStr);
    return res.json({ found: false });
  }

  // Token found and valid, remove from storage
  if (tokenIdStr && typeof tokenIdStr === 'string') pendingTokens.delete(tokenIdStr);
  if (extensionIdStr && typeof extensionIdStr === 'string') pendingTokens.delete(extensionIdStr);

  console.log('Token successfully delivered to extension');
  return res.json({ found: true, token: pending.token });
});

router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ valid: false });
    }

    res.json({ valid: true, user: { email: user.email, name: user.name } });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

export default router;
