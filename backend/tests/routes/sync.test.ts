import request from 'supertest';
import { app } from '../src/server';
import { User } from '../src/models/User';
import { Device } from '../src/models/Device';
import { Tab } from '../src/models/Tab';
import { TabGroup } from '../src/models/TabGroup';

describe('Sync Routes', () => {
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
    await TabGroup.deleteMany({});
  });

  describe('POST /api/sync', () => {
    it('should sync valid tabs and tab groups', async () => {
      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [{
            id: 'tab123',
            url: 'https://example.com',
            title: 'Example',
            faviconUrl: 'https://example.com/favicon.ico',
            active: false,
            windowId: 'window123',
            index: 0,
            groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
            pinned: false,
            lastAccessed: Date.now()
          }],
          tabGroups: [{
            id: 'group123',
            title: 'Work',
            color: 'blue',
            collapsed: false,
            windowId: 'window123',
            tabs: ['tab123']
          }],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deviceTabs).toBeDefined();
    });

    it('should delete existing tabs for device', async () => {
      await Tab.create({
        userId,
        deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        tabId: 'existing-tab123',
        url: 'https://existing.com',
        title: 'Existing',
        windowId: 'window123',
        index: 0,
        lastAccessed: new Date()
      });

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [{
            id: 'new-tab123',
            url: 'https://new.com',
            title: 'New',
            windowId: 'window123',
            index: 0,
            lastAccessed: Date.now()
          }],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);

      const tabs = await Tab.find({ userId, deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012') });
      expect(tabs).toHaveLength(1);
      expect(tabs[0].tabId).toBe('new-tab123');
    });

    it('should delete existing tab groups for device', async () => {
      await TabGroup.create({
        userId,
        deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        groupId: 'existing-group123',
        title: 'Existing Group',
        color: 'red',
        collapsed: false,
        windowId: 'window123',
        tabs: ['tab123'],
        timestamp: new Date()
      });

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [{
            id: 'tab123',
            url: 'https://example.com',
            title: 'Example',
            windowId: 'window123',
            index: 0,
            lastAccessed: Date.now()
          }],
          tabGroups: [{
            id: 'new-group123',
            title: 'New Group',
            color: 'blue',
            collapsed: false,
            windowId: 'window123',
            tabs: ['tab123']
          }],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);

      const groups = await TabGroup.find({ userId, deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012') });
      expect(groups).toHaveLength(1);
      expect(groups[0].groupId).toBe('new-group123');
    });

    it('should update device lastSync timestamp', async () => {
      const device = await Device.create({
        userId,
        deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Test Device',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(Date.now() - 86400000),
        createdAt: new Date()
      });

      await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [{
            id: 'tab123',
            url: 'https://example.com',
            title: 'Example',
            windowId: 'window123',
            index: 0,
            lastAccessed: Date.now()
          }],
          timestamp: Date.now()
        });

      const updatedDevice = await Device.findById(device._id);
      expect(updatedDevice?.lastSync).toBeDefined();
    });

    it('should return other devices\' tabs', async () => {
      await Device.create({
        userId,
        deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Current Device',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(),
        createdAt: new Date()
      });

      await Device.create({
        userId,
        deviceId: 'device456',
        name: 'Other Device',
        browser: 'firefox',
        os: 'macOS',
        lastSync: new Date(),
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [{
            id: 'tab123',
            url: 'https://example.com',
            title: 'Example',
            windowId: 'window123',
            index: 0,
            lastAccessed: Date.now()
          }],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);
      expect(response.body.deviceTabs).toBeDefined();
      expect(Object.keys(response.body.deviceTabs)).toHaveLength(1);
      expect(response.body.deviceTabs['device456']).toBeDefined();
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .post('/api/sync')
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [],
          timestamp: Date.now()
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid request data', async () => {
      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: '',
          tabs: []
        });

      expect(response.status).toBe(400);
    });

    it('should handle empty tabs array', async () => {
      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);
    });

    it('should handle missing tabGroups array', async () => {
      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);
    });

    it('should limit returned tabs to 10 per device', async () => {
      await Device.create({
        userId,
        deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        name: 'Device with many tabs',
        browser: 'chrome',
        os: 'Windows',
        lastSync: new Date(),
        createdAt: new Date()
      });

      const tabs = Array.from({ length: 20 }, (_, i) => ({
        id: `tab-${i}`,
        url: `https://example${i}.com`,
        title: `Example ${i}`,
        windowId: 'window123',
        index: i,
        lastAccessed: Date.now() - i * 1000
      }));

      await Tab.create({
        userId,
        deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        tabId: tabs.map(t => t.id),
        url: tabs.map(t => t.url),
        title: tabs.map(t => t.title),
        windowId: 'window123',
        index: tabs.map(t => t.index),
        lastAccessed: new Date()
      });

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs,
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);
      const deviceTabs = response.body.deviceTabs['device123'];
      expect(deviceTabs.tabs.length).toBeLessThanOrEqual(10);
    });

    it('should handle sync errors gracefully', async () => {
      jest.spyOn(Tab, 'deleteMany').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [],
          timestamp: Date.now()
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Sync failed');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve tab data integrity', async () => {
      const tabData = {
        id: 'tab123',
        url: 'https://example.com',
        title: 'Example',
        faviconUrl: 'https://example.com/favicon.ico',
        active: true,
        windowId: 'window123',
        index: 0,
        groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
        pinned: true,
        lastAccessed: Date.now()
      };

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [tabData],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);

      const savedTab = await Tab.findOne({ userId, deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), tabId: tabData.id });
      expect(savedTab).toBeDefined();
      expect(savedTab?.url).toBe(tabData.url);
      expect(savedTab?.title).toBe(tabData.title);
      expect(savedTab?.active).toBe(tabData.active);
      expect(savedTab?.pinned).toBe(tabData.pinned);
    });

    it('should preserve group data integrity', async () => {
      const groupData = {
        id: 'group123',
        title: 'Work',
        color: 'blue',
        collapsed: true,
        windowId: 'window123',
        tabs: ['tab123', 'tab456']
      };

      const response = await request(app)
        .post('/api/sync')
        .set('Authorization', authToken)
        .send({
          deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
          tabs: [],
          tabGroups: [groupData],
          timestamp: Date.now()
        });

      expect(response.status).toBe(200);

      const savedGroup = await TabGroup.findOne({ userId, deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'), groupId: groupData.id });
      expect(savedGroup).toBeDefined();
      expect(savedGroup?.title).toBe(groupData.title);
      expect(savedGroup?.color).toBe(groupData.color);
      expect(savedGroup?.collapsed).toBe(groupData.collapsed);
      expect(savedGroup?.tabs).toEqual(groupData.tabs);
    });
  });
});
