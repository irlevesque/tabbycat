import express, { Response } from 'express';
import { Device } from '../models/Device';
import { Tab } from '../models/Tab';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let devices;
    try {
      devices = await Device.find({ userId: req.userId });
    } catch (err) {
      console.error('Find error:', err);
      throw err;
    }
    devices.sort((a, b) => b.lastSync.getTime() - a.lastSync.getTime());
    
    const deviceList = [];

    for (const device of devices) {
      const tabs = await Tab.find({ userId: req.userId, deviceId: device.deviceId }).limit(100);
      tabs.sort((a, b) => Number(b.lastAccessed) - Number(a.lastAccessed));

      deviceList.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        browser: device.browser,
        os: device.os,
        lastSync: device.lastSync.getTime(),
        tabs: tabs.map(tab => ({
          url: tab.url,
          title: tab.title
        }))
      });
    }

    res.json(deviceList);
  } catch (error) {
    console.error('Devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

router.post('/register', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { deviceId, name, browser, os } = req.body;

    if (!deviceId || !name || !browser || !os) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let device = await Device.findOne({ userId: req.userId, deviceId });
    
    if (device) {
      device.name = name;
      device.browser = browser;
      device.os = os;
      device.lastSync = new Date();
      await device.save();
    } else {
      device = await Device.create({
        userId: req.userId,
        deviceId,
        name,
        browser,
        os,
        lastSync: new Date()
      });
    }

    res.json({ success: true, device });
  } catch (error: any) {
    if (error.name === 'ValidationError' || error.name === 'MongooseError') {
      console.error('Device validation error:', error.message);
      res.status(400).json({ error: 'Validation failed', details: error.message });
    } else {
      console.error('Device registration error:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
  }
});

export default router;
