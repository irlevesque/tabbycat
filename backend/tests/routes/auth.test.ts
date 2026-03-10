import request from 'supertest';
import { app } from '../src/server';
import { User } from '../src/models/User';
import { createTestToken } from '../setup';
import { pendingTokens } from '../src/routes/auth';

describe('Auth Routes', () => {
  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app).get('/auth/google');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
    });

    it('should include extensionId in state parameter', async () => {
      const response = await request(app)
        .get('/auth/google?extensionId=test123');
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('state=');
    });

    it('should generate correct OAuth URL', async () => {
      const response = await request(app).get('/auth/google');
      const url = response.headers.location;
      expect(url).toContain('client_id=');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback%2Fgoogle');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid%20email%20profile');
    });
  });

  describe('GET /auth/callback/google', () => {
    it('should handle valid OAuth code and return user', async () => {
      const response = await request(app)
        .get('/auth/callback/google?code=test-code');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Authentication Successful');
    });

    it('should create new user if not exists', async () => {
      const response = await request(app)
        .get('/auth/callback/google?code=test-code-2');

      expect(response.status).toBe(200);

      const user = await User.findOne({ oauthProvider: 'google', oauthId: '123456789' });
      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
    });

    it('should update existing user if OAuthId matches', async () => {
      await User.create({
        email: 'existing@example.com',
        name: 'Existing User',
        oauthProvider: 'google',
        oauthId: 'existing123',
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/auth/callback/google?code=existing-code');

      expect(response.status).toBe(200);

      const user = await User.findOne({ oauthProvider: 'google', oauthId: 'existing123' });
      expect(user?.email).toBe('existing@example.com');
      expect(user?.name).toBe('Existing User');
    });

    it('should generate valid JWT token', async () => {
      const response = await request(app)
        .get('/auth/callback/google?code=test-code-3');

      expect(response.status).toBe(200);
      expect(response.text).toContain('jwtToken =');
    });

    it('should return HTML with token display', async () => {
      const response = await request(app)
        .get('/auth/callback/google?code=test-code-4');

      expect(response.status).toBe(200);
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('Authentication Successful');
    });

    it('should return 400 error for missing code', async () => {
      const response = await request(app)
        .get('/auth/callback/google');

      expect(response.status).toBe(400);
      expect(response.text).toContain('No code provided');
    });

    it('should return 500 error for OAuth failure', async () => {
      const originalFetch = global.fetch;
      (global.fetch as any) = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'invalid_grant' })
        })
      );

      const response = await request(app)
        .get('/auth/callback/google?code=invalid');

      expect(response.status).toBe(500);

      (global.fetch as any) = originalFetch;
    });
  });

  describe('GET /auth/poll', () => {
    beforeEach(() => {
      pendingTokens.clear();
    });

    it('should return token by tokenId', async () => {
      pendingTokens.set('test-token-id', {
        token: createTestToken('user123'),
        expiresAt: Date.now() + 3600000
      });

      const response = await request(app)
        .get('/auth/poll?tokenId=test-token-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ found: true, token: expect.any(String) });
    });

    it('should return token by extensionId as fallback', async () => {
      pendingTokens.set('test-extension-id', {
        token: createTestToken('user123'),
        expiresAt: Date.now() + 3600000
      });

      const response = await request(app)
        .get('/auth/poll?extensionId=test-extension-id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ found: true, token: expect.any(String) });
    });

    it('should return 404 for expired tokens', async () => {
      pendingTokens.set('expired-token', {
        token: createTestToken('user123'),
        expiresAt: Date.now() - 1000
      });

      const response = await request(app)
        .get('/auth/poll?tokenId=expired-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ found: false });
    });

    it('should remove token after successful retrieval', async () => {
      pendingTokens.set('test-token-id', {
        token: createTestToken('user123'),
        expiresAt: Date.now() + 3600000
      });

      const initialSize = pendingTokens.size;

      await request(app)
        .get('/auth/poll?tokenId=test-token-id');

      expect(pendingTokens.size).toBe(initialSize - 1);
    });

    it('should return 404 for non-existent tokens', async () => {
      const response = await request(app)
        .get('/auth/poll?tokenId=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ found: false });
    });
  });

  describe('GET /auth/verify', () => {
    it('should return valid token with user info', async () => {
      const user = await User.create({
        email: 'test@example.com',
        name: 'Test User',
        oauthProvider: 'google',
        oauthId: '123456789',
        createdAt: new Date()
      });

      const token = createTestToken(user._id.toString());

      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
    });

    it('should return 401 for missing Authorization header', async () => {
      const response = await request(app).get('/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('should return 401 for invalid Authorization format', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('should return 401 for expired token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });

    it('should return 401 if user not found', async () => {
      const token = createTestToken('nonexistent-user');

      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.valid).toBe(false);
    });
  });

  describe('Token Cleanup', () => {
    beforeEach(() => {
      pendingTokens.clear();
    });

    it('should clean up expired tokens periodically', async () => {
      const token = createTestToken('user123');
      pendingTokens.set('cleanup-test', {
        token,
        expiresAt: Date.now() - 1000
      });

      expect(pendingTokens.size).toBe(1);

      // Manually trigger cleanup
      pendingTokens.forEach((value: { expiresAt: number }, key: string) => {
        if (value.expiresAt < Date.now()) {
          pendingTokens.delete(key);
        }
      });

      expect(pendingTokens.size).toBe(0);
    });
  });
});
