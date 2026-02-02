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

    const devices = await Device.find({ userId: req.userId }).sort({ lastSync: -1 });
    
    const deviceList = [];

    for (const device of devices) {
      const tabs = await Tab.find({ userId: req.userId, deviceId: device.deviceId })
        .sort({ lastAccessed: -1 })
        .limit(100);

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

    const device = await Device.findOneAndUpdate(
      { userId: req.userId, deviceId },
      { 
        name, 
        browser, 
        os, 
        lastSync: new Date() 
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, device });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

export default router;
