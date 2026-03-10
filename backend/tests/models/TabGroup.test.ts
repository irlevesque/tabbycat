import mongoose from 'mongoose';
import { TabGroup } from '../src/models/TabGroup';
import { mongoServer } from './setup';

describe('TabGroup Model', () => {
  beforeEach(async () => {
    await TabGroup.deleteMany({});
  });

  it('should create tab group with all fields', async () => {
    const tabGroup = new TabGroup({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      title: 'Work',
      color: 'blue',
      collapsed: false,
      windowId: 'window123',
      tabs: ['tab1', 'tab2'],
      timestamp: new Date()
    });

    await tabGroup.save();

    expect(tabGroup._id).toBeDefined();
    expect(tabGroup.userId).toBe('user123');
    expect(tabGroup.deviceId).toBe('device123');
    expect(tabGroup.groupId).toBe('group123');
    expect(tabGroup.title).toBe('Work');
    expect(tabGroup.color).toBe('blue');
    expect(tabGroup.collapsed).toBe(false);
    expect(tabGroup.windowId).toBe('window123');
    expect(tabGroup.tabs).toEqual(['tab1', 'tab2']);
    expect(tabGroup.timestamp).toBeDefined();
  });

  it('should reject duplicate userId+deviceId+groupId', async () => {
    await TabGroup.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      title: 'Work',
      color: 'blue',
      collapsed: false,
      windowId: 'window123',
      tabs: ['tab1'],
      timestamp: new Date()
    });

    const duplicateGroup = new TabGroup({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      title: 'Different',
      color: 'red',
      collapsed: true,
      windowId: 'window456',
      tabs: ['tab2'],
      timestamp: new Date()
    });

    await expect(duplicateGroup.save()).rejects.toThrow();
  });

  it('should handle empty tabs array', async () => {
    const tabGroup = new TabGroup({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      title: 'Empty Group',
      color: 'grey',
      collapsed: true,
      windowId: 'window123',
      tabs: [],
      timestamp: new Date()
    });

    await tabGroup.save();

    expect(tabGroup.tabs).toEqual([]);
  });

  it('should have correct composite index', async () => {
    const tabGroup = await TabGroup.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      groupId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      title: 'Work',
      color: 'blue',
      collapsed: false,
      windowId: 'window123',
      tabs: ['tab1'],
      timestamp: new Date()
    });

    const indexes = await TabGroup.collection.indexes();
    const compositeIndex = indexes.find((i: any) => 
      i.key.userId === 1 && i.key.deviceId === 1 && i.key.groupId === 1
    );
    expect(compositeIndex).toBeDefined();
    expect(compositeIndex.unique).toBe(true);
  });
});