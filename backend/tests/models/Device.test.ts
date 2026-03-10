import mongoose from 'mongoose';
import { Device } from '../src/models/Device';
import { mongoServer } from './setup';

describe('Device Model', () => {
  beforeEach(async () => {
    await Device.deleteMany({});
  });

  it('should create device with all required fields', async () => {
    const device = new Device({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Test Device',
      browser: 'chrome',
      os: 'Windows',
      lastSync: new Date(),
      createdAt: new Date()
    });

    await device.save();

    expect(device._id).toBeDefined();
    expect(device.userId).toBe('user123');
    expect(device.deviceId).toBe('device123');
    expect(device.name).toBe('Test Device');
    expect(device.browser).toBe('chrome');
    expect(device.os).toBe('Windows');
    expect(device.lastSync).toBeDefined();
    expect(device.createdAt).toBeDefined();
  });

  it('should reject duplicate userId+deviceId', async () => {
    await Device.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Test Device',
      browser: 'chrome',
      os: 'Windows',
      lastSync: new Date(),
      createdAt: new Date()
    });

    const duplicateDevice = new Device({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Another Device',
      browser: 'firefox',
      os: 'Linux',
      lastSync: new Date(),
      createdAt: new Date()
    });

    await expect(duplicateDevice.save()).rejects.toThrow();
  });

  it('should update device metadata', async () => {
    const device = await Device.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Old Name',
      browser: 'chrome',
      os: 'Windows',
      lastSync: new Date('2020-01-01'),
      createdAt: new Date()
    });

    device.name = 'New Name';
    device.browser = 'firefox';
    device.lastSync = new Date();
    await device.save();

    expect(device.name).toBe('New Name');
    expect(device.browser).toBe('firefox');
  });

  it('should have correct composite index', async () => {
    const device = await Device.create({
      userId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      deviceId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
      name: 'Test Device',
      browser: 'chrome',
      os: 'Windows',
      lastSync: new Date(),
      createdAt: new Date()
    });

    const indexes = await Device.collection.indexes();
    const compositeIndex = indexes.find((i: any) => 
      i.key.userId === 1 && i.key.deviceId === 1
    );
    expect(compositeIndex).toBeDefined();
  });
});