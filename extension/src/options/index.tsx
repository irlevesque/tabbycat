import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './options.css';

interface Settings {
  syncInterval: number;
  autoSync: boolean;
  notifyOnSync: boolean;
  deviceName: string;
}

const Options: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    syncInterval: 30,
    autoSync: true,
    notifyOnSync: true,
    deviceName: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await chrome.storage.local.get([
      'syncInterval',
      'autoSync',
      'notifyOnSync',
      'deviceName'
    ]);
    
    setSettings({
      syncInterval: result.syncInterval || 30,
      autoSync: result.autoSync !== undefined ? result.autoSync : true,
      notifyOnSync: result.notifyOnSync !== undefined ? result.notifyOnSync : true,
      deviceName: result.deviceName || getDefaultDeviceName()
    });
  };

  const getDefaultDeviceName = () => {
    const platform = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';

    if (platform.includes('Chrome')) browser = 'Chrome';
    else if (platform.includes('Firefox')) browser = 'Firefox';
    else if (platform.includes('Safari')) browser = 'Safari';
    else if (platform.includes('Edge')) browser = 'Edge';

    if (platform.includes('Windows')) os = 'Windows';
    else if (platform.includes('Mac')) os = 'macOS';
    else if (platform.includes('Linux')) os = 'Linux';
    else if (platform.includes('Android')) os = 'Android';
    else if (platform.includes('iOS')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  const handleSave = async () => {
    await chrome.storage.local.set(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    const defaultSettings = {
      syncInterval: 30,
      autoSync: true,
      notifyOnSync: true,
      deviceName: getDefaultDeviceName()
    };
    await chrome.storage.local.set(defaultSettings);
    setSettings(defaultSettings);
  };

  return (
    <div className="options">
      <div className="container">
        <header>
          <h1>Tab Sync Settings</h1>
          <p>Configure how your tabs sync across devices</p>
        </header>

        <div className="settings-section">
          <h2>Device Settings</h2>
          <div className="setting">
            <label htmlFor="deviceName">Device Name</label>
            <input
              id="deviceName"
              type="text"
              value={settings.deviceName}
              onChange={(e) => setSettings({ ...settings, deviceName: e.target.value })}
              placeholder="My Chrome on Windows"
            />
            <small>Identify this device in your synced devices list</small>
          </div>
        </div>

        <div className="settings-section">
          <h2>Sync Settings</h2>
          
          <div className="setting">
            <label htmlFor="autoSync">
              <input
                id="autoSync"
                type="checkbox"
                checked={settings.autoSync}
                onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
              />
              Auto-sync tabs
            </label>
            <small>Automatically sync your tabs in the background</small>
          </div>

          {settings.autoSync && (
            <div className="setting">
              <label htmlFor="syncInterval">Sync Interval (seconds)</label>
              <input
                id="syncInterval"
                type="number"
                min="10"
                max="300"
                value={settings.syncInterval}
                onChange={(e) => setSettings({ ...settings, syncInterval: parseInt(e.target.value) || 30 })}
              />
              <small>How often to sync tabs (minimum 10 seconds)</small>
            </div>
          )}

          <div className="setting">
            <label htmlFor="notifyOnSync">
              <input
                id="notifyOnSync"
                type="checkbox"
                checked={settings.notifyOnSync}
                onChange={(e) => setSettings({ ...settings, notifyOnSync: e.target.checked })}
              />
              Show notifications on sync
            </label>
            <small>Get notified when tabs are synced from other devices</small>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Default
          </button>
        </div>

        <footer>
          <p>Tab Sync Extension v1.0.0</p>
        </footer>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<Options />);
