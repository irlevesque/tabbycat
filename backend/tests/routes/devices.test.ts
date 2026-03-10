import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/server';
import { User } from '../src/models/User';
import { Device } from '../src/models/Device';
import { Tab } from '../src/models/Tab';
import { createTestToken } from '../setup';

describe('Device Routes', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      oauthProvider: 'google',
      oauthId: '123456789',
      createdAt: new Date()
    });

    userId = user._id.toString();
    authToken = `Bearer ${createTestToken(userId)}`;
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Device.deleteMany({});
    await Tab.deleteMany({});
  });

  describe('GET /api/devices', () => {
    it('should return all devices for authenticated user', async () => {
      const now = new Date();
      const device1 = await Device.create({
        userId,
        deviceId: 'device123',
        name: 'Chrome on Windows',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(now.getTime() - 1000),
        createdAt: new Date()
      });

      const device2 = await Device.create({
        userId,
        deviceId: 'device456',
        name: 'Firefox on macOS',
        browser: 'firefox',
        os: 'macOS',
        lastSync: now,
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].deviceId).toBe('device456');
      expect(response.body[1].deviceId).toBe('device123');
    });

    it('should include tabs for each device', async () => {
      await Device.create({
        userId,
        deviceId: 'device123',
        name: 'Chrome on Windows',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(),
        createdAt: new Date()
      });

      await Tab.create({
        userId,
        deviceId: 'device123',
        tabId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
        url: 'https://example.com',
        title: 'Example',
        windowId: 'window123',
        index: 0,
        lastAccessed: new Date()
      });

      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      const device = response.body.find((d: any) => d.deviceId === 'device123');
      expect(device).toBeDefined();
      expect(device.tabs).toHaveLength(1);
      expect(device.tabs[0].url).toBe('https://example.com');
    });

    it('should sort devices by lastSync descending', async () => {
      await Device.create({
        userId,
        deviceId: 'device123',
        name: 'Device 1',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(Date.now() - 86400000),
        createdAt: new Date()
      });

      await Device.create({
        userId,
        deviceId: 'device456',
        name: 'Device 2',
        browser: 'firefox',
        os: 'macOS',
        lastSync: new Date(),
        createdAt: new Date()
      });

      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body[0].deviceId).toBe('device456');
      expect(response.body[1].deviceId).toBe('device123');
    });

    it('should limit tabs to 100 per device', async () => {
      await Device.create({
        userId,
        deviceId: 'device123',
        name: 'Device with many tabs',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(),
        createdAt: new Date()
      });

      const tabs = Array.from({ length: 150 }, (_, i) => ({
        userId,
        deviceId: 'device123',
        tabId: `tab-${i}`,
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        windowId: 'window123',
        index: i,
        lastAccessed: new Date()
      }));

      await Tab.insertMany(tabs);

      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      const device = response.body.find((d: any) => d.deviceId === 'device123');
      expect(device.tabs.length).toBeLessThanOrEqual(100);
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app).get('/api/devices');

      expect(response.status).toBe(401);
    });

    it('should handle empty device list', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(Device, 'find').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch devices');
    });
  });

  describe('POST /api/devices/register', () => {
    it('should register new device', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'chrome',
          os: 'Windows'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.device.deviceId).toBe('device123');
      expect(response.body.device.name).toBe('Chrome on Windows');
      expect(response.body.device.browser).toBe('chrome');
      expect(response.body.device.os).toBe('Windows');
    });

    it('should update existing device', async () => {
      const device = await Device.create({
        userId,
        deviceId: 'device123',
        name: 'Old Name',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(),
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'chrome',
          os: 'Windows'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.device.deviceId).toBe('device123');
      expect(response.body.device.name).toBe('Chrome on Windows');
    });

    it('should update device lastSync timestamp', async () => {
      const device = await Device.create({
        userId,
        deviceId: 'device123',
        name: 'Chrome on Windows',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(Date.now() - 86400000),
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'chrome',
          os: 'Windows'
        });

      expect(response.status).toBe(200);

      const updatedDevice = await Device.findById(device._id);
      expect(updatedDevice?.lastSync).toBeDefined();
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'chrome',
          os: 'Windows'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows'
          // Missing browser and os
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should validate browser enum values', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'invalid',
          os: 'Windows'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation');
    });

    it('should handle database errors gracefully', async () => {
      jest.spyOn(Device, 'create').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'chrome',
          os: 'Windows'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to register device');
    });
  });

  describe('Device Data Integrity', () => {
    it('should preserve device metadata', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', authToken)
        .send({
          deviceId: 'device123',
          name: 'Chrome on Windows',
          browser: 'chrome' as const,
          os: 'Windows'
        });

      expect(response.status).toBe(200);

      const device = response.body.device;
      expect(device.deviceId).toBe('device123');
      expect(device.name).toBe('Chrome on Windows');
      expect(device.browser).toBe('chrome');
      expect(device.os).toBe('Windows');
    });

    it('should handle multiple browsers', async () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      const responses = [];

      for (const browser of browsers) {
        const response = await request(app)
          .post('/api/devices/register')
          .set('Authorization', authToken)
          .send({
            deviceId: `device-${browser}`,
            name: `${browser.charAt(0).toUpperCase() + browser.slice(1)} on Windows`,
            browser: browser,
            os: 'Windows'
          });

        responses.push(response);
        expect(response.status).toBe(200);
        expect(response.body.device.browser).toBe(browser);
      }
    });

    it('should handle different operating systems', async () => {
      const osList = ['Windows', 'macOS', 'Linux', 'Chrome OS'];
      const responses = [];

      for (const os of osList) {
        const response = await request(app)
          .post('/api/devices/register')
          .set('Authorization', authToken)
          .send({
            deviceId: `device-${os}`,
            name: `Chrome on ${os}`,
            browser: 'chrome',
            os: os
          });

        responses.push(response);
        expect(response.status).toBe(200);
        expect(response.body.device.os).toBe(os);
      }
    });
  });
});
