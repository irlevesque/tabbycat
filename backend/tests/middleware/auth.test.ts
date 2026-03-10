import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/server';
import { User } from '../src/models/User';
import { mongoServer, createTestToken } from '../setup';

describe('Auth Middleware', () => {
  let testUser: any;
  let testToken: string;

  beforeAll(async () => {
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      oauthProvider: 'google',
      oauthId: '123456789',
      createdAt: new Date()
    });
    testToken = createTestToken(testUser._id.toString());
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('GET /api/test-protected', () => {
    beforeEach(() => {
      app.get('/api/test-protected', async (req: any, res: any) => {
        res.json({ userId: req.userId });
      });
    });

    afterEach(() => {
      app._router.stack = app._router.stack.filter(
        (layer: any) => layer.route?.path !== '/api/test-protected'
      );
    });

    it('should attach userId to request', async () => {
      const response = await request(app)
        .get('/api/test-protected')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUser._id.toString());
    });

    it('should return 401 for missing Authorization header', async () => {
      const response = await request(app).get('/api/test-protected');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid Authorization format', async () => {
      const response = await request(app)
        .get('/api/test-protected')
        .set('Authorization', 'invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/test-protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 if user not found', async () => {
      const invalidToken = createTestToken('nonexistent-user-id');
      
      const response = await request(app)
        .get('/api/test-protected')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should pass request to next middleware on success', async () => {
      let middlewareCalled = false;
      
      app.get('/api/test-pass', (req: any, res: any) => {
        middlewareCalled = true;
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/api/test-pass')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(middlewareCalled).toBe(true);
    });
  });
});