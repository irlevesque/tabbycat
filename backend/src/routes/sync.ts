import express, { Response } from 'express';
import { Tab } from '../models/Tab';
import { TabGroup } from '../models/TabGroup';
import { Device } from '../models/Device';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { deviceId, tabs, tabGroups, timestamp } = req.body;
    
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!deviceId || !Array.isArray(tabs)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    await Tab.deleteMany({ userId: req.userId, deviceId });
    await TabGroup.deleteMany({ userId: req.userId, deviceId });

    const tabsToInsert = tabs.map((tab: any) => ({
      userId: req.userId,
      deviceId,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      faviconUrl: tab.faviconUrl,
      active: tab.active,
      windowId: tab.windowId,
      index: tab.index,
      groupId: tab.groupId,
      pinned: tab.pinned,
      lastAccessed: new Date(tab.lastAccessed),
      timestamp: new Date(timestamp)
    }));

    await Tab.insertMany(tabsToInsert);

    if (Array.isArray(tabGroups)) {
      const groupsToInsert = tabGroups.map((group: any) => ({
        userId: req.userId,
        deviceId,
        groupId: group.id,
        title: group.title,
        color: group.color,
        collapsed: group.collapsed,
        windowId: group.windowId,
        tabs: group.tabs,
        timestamp: new Date(timestamp)
      }));

      await TabGroup.insertMany(groupsToInsert);
    }

    await Device.findOneAndUpdate(
      { userId: req.userId, deviceId },
      { lastSync: new Date() },
      { upsert: true }
    );

    const devices = await Device.find({ userId: req.userId, deviceId: { $ne: deviceId } });
    const deviceTabs: any = {};

    for (const device of devices) {
      const tabs = await Tab.find({ userId: req.userId, deviceId: device.deviceId })
        .sort({ lastAccessed: -1 })
        .limit(10);

      deviceTabs[device.deviceId] = {
        deviceName: device.name,
        tabs: tabs.map(tab => ({
          url: tab.url,
          title: tab.title
        })),
        lastSync: device.lastSync.getTime()
      };
    }

    res.json({ success: true, deviceTabs });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
