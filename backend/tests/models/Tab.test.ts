import mongoose from 'mongoose';
import { Tab } from '../src/models/Tab';
import { mongoServer } from './setup';

describe('Tab Model', () => {
  beforeEach(async () => {
    await Tab.deleteMany({});
  });

  it('should create tab with all fields', async () => {
    const tab = new Tab({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      tabId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      url: 'https://example.com',
      title: 'Example',
      faviconUrl: 'https://example.com/favicon.ico',
      active: false,
      windowId: 'window123',
      index: 0,
      groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      pinned: false,
      lastAccessed: new Date(),
      timestamp: new Date()
    });

    await tab.save();

    expect(tab._id).toBeDefined();
    expect(tab.userId.toString()).toBe('507f1f77bcf86cd799439011');
    expect(tab.deviceId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(tab.tabId.toString()).toBe('507f1f77bcf86cd799439013');
    expect(tab.url).toBe('https://example.com');
    expect(tab.title).toBe('Example');
    expect(tab.faviconUrl).toBe('https://example.com/favicon.ico');
    expect(tab.active).toBe(false);
    expect(tab.windowId).toBe('window123');
    expect(tab.index).toBe(0);
    expect(tab.groupId.toString()).toBe('507f1f77bcf86cd799439014');
    expect(tab.pinned).toBe(false);
  });

  it('should reject duplicate userId+deviceId+tabId', async () => {
    await Tab.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      tabId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      url: 'https://example.com',
      title: 'Example',
      active: false,
      windowId: 'window123',
      index: 0,
      pinned: false,
      lastAccessed: new Date(),
      timestamp: new Date()
    });

    const duplicateTab = new Tab({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      tabId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      url: 'https://different.com',
      title: 'Different',
      active: true,
      windowId: 'window456',
      index: 1,
      pinned: true,
      lastAccessed: new Date(),
      timestamp: new Date()
    });

    await expect(duplicateTab.save()).rejects.toThrow();
  });

  it('should handle optional fields', async () => {
    const tab = new Tab({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      tabId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      url: 'https://example.com',
      title: 'Example',
      active: false,
      windowId: 'window123',
      index: 0,
      pinned: false,
      lastAccessed: new Date(),
      timestamp: new Date()
    });

    await tab.save();

    expect(tab.faviconUrl).toBeUndefined();
    expect(tab.groupId).toBeUndefined();
  });

  it('should have correct composite index', async () => {
    const tab = await Tab.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      tabId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      url: 'https://example.com',
      title: 'Example',
      active: false,
      windowId: 'window123',
      index: 0,
      pinned: false,
      lastAccessed: new Date(),
      timestamp: new Date()
    });

    const indexes = await Tab.collection.indexes();
    const compositeIndex = indexes.find((i: any) => 
      i.key.userId === 1 && i.key.deviceId === 1 && i.key.tabId === 1
    );
    expect(compositeIndex).toBeDefined();
    expect(compositeIndex.unique).toBe(true);
  });
});