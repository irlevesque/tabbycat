import express, { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CLIENT_URL = process.env.CLIENT_URL || 'chrome-extension://*';

router.get('/google', (req: Request, res: Response) => {
  const redirectUri = `http://localhost:3000/auth/callback/google`;
  const scope = 'openid email profile';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}`;
  
  res.redirect(authUrl);
});

router.get('/callback/google', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'No code provided' });
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

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error || 'Failed to exchange code for token');
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

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

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Complete</title>
      </head>
      <body>
        <h1>Authentication Successful</h1>
        <p>Please copy this token and paste it into the extension:</p>
        <textarea readonly style="width: 400px; height: 100px;">${token}</textarea>
        <p>You can now close this window and return to the extension.</p>
        <script>
          if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'AUTH_SUCCESS', token: '${token}' });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
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
