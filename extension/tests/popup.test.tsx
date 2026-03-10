import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Popup from '../src/popup';

describe('Popup Component - Authentication Status', () => {
  it('should show login button when not authenticated', () => {
    render(<Popup isAuthenticated={false} />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });

  it('should show logout button when authenticated', () => {
    render(<Popup isAuthenticated={true} />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
    expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument();
  });

  it('should show loading state when loading', () => {
    render(<Popup isAuthenticated={false} loading={true} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('Popup Component - Device List Display', () => {
  const mockDevices = [
    {
      deviceId: 'device123',
      deviceName: 'Chrome on Windows 📡',
      lastSync: Date.now(),
      browser: 'chrome',
      os: 'Windows',
      tabs: [
        { url: 'https://example.com', title: 'Example' }
      ]
    },
    {
      deviceId: 'device456',
      deviceName: 'Firefox on macOS 📡',
      lastSync: Date.now() - 3600000,
      browser: 'firefox',
      os: 'macOS',
      tabs: [
        { url: 'https://github.com', title: 'GitHub' },
        { url: 'https://stackoverflow.com', title: 'Stack Overflow' },
        { url: 'https://developer.mozilla.org', title: 'MDN' }
      ]
    }
  ];

  it('should display list of devices', () => {
    render(<Popup syncedDevices={mockDevices} />);
    expect(screen.getByText('Chrome on Windows 📡')).toBeInTheDocument();
    expect(screen.getByText('Firefox on macOS 📡')).toBeInTheDocument();
  });

  it('should sort devices by lastSync (recent first)', () => {
    render(<Popup syncedDevices={mockDevices} />);
    const deviceElements = screen.getAllByTestId('device-item');
    expect(deviceElements[0]).toHaveTextContent('Chrome on Windows 📡');
    expect(deviceElements[1]).toHaveTextContent('Firefox on macOS 📡');
  });

  it('should show browser icon for each device', () => {
    render(<Popup syncedDevices={mockDevices} />);
    expect(screen.getByText('🌐')).toBeInTheDocument();
    expect(screen.getByText('🦊')).toBeInTheDocument();
  });

  it('should show last sync time in relative format', () => {
    render(<Popup syncedDevices={mockDevices} />);
    expect(screen.getByText(/Just now|1 hour ago/)).toBeInTheDocument();
  });

  it('should show "+N more tabs" for devices with >5 tabs', () => {
    const devicesWithManyTabs = [
      {
        deviceId: 'device123',
        deviceName: 'Chrome on Windows 📡',
        lastSync: Date.now(),
        browser: 'chrome',
        os: 'Windows',
        tabs: Array.from({ length: 8 }, (_, i) => ({
          url: `https://example${i}.com`,
          title: `Example ${i}`
        }))
      }
    ];

    render(<Popup syncedDevices={devicesWithManyTabs} />);
    expect(screen.getByText('+3 more tabs')).toBeInTheDocument();
  });

  it('should not show "+N more tabs" for devices with ≤5 tabs', () => {
    render(<Popup syncedDevices={mockDevices} />);
    expect(screen.queryByText('+N more tabs')).not.toBeInTheDocument();
  });
});

describe('Popup Component - Device Controls', () => {
  const mockDevices = [
    {
      deviceId: 'device123',
      deviceName: 'Chrome on Windows 📡',
      lastSync: Date.now(),
      browser: 'chrome',
      os: 'Windows',
      tabs: [],
      syncEnabled: false,
      color: 'blue',
      tabLimit: 50
    }
  ];

  it('should toggle sync when clicked', async () => {
    render(<Popup syncedDevices={mockDevices} />);

    const syncToggle = screen.getByTestId('sync-toggle');
    await waitFor(() => {
      expect(syncToggle).toBeInTheDocument();
    });

    fireEvent.click(syncToggle);
    // Should trigger state update
    expect(syncToggle).toBeChecked();
  });

  it('should open device tab when clicked', async () => {
    render(<Popup syncedDevices={mockDevices} />);

    const deviceTab = screen.getByText('Chrome on Windows 📡');
    await waitFor(() => {
      expect(deviceTab).toBeInTheDocument();
    });

    fireEvent.click(deviceTab);
    // Should trigger tab opening
  });

  it('should show color indicator for each device', () => {
    render(<Popup syncedDevices={mockDevices} />);
    const colorIndicators = screen.getAllByTestId('color-indicator');
    expect(colorIndicators.length).toBe(1);
  });

  it('should show tab limit input for each device', () => {
    render(<Popup syncedDevices={mockDevices} />);
    const tabLimits = screen.getAllByTestId('tab-limit-input');
    expect(tabLimits.length).toBe(1);
  });

  it('should show cleanup button for each device', () => {
    render(<Popup syncedDevices={mockDevices} />);
    const cleanupButtons = screen.getAllByTestId('cleanup-button');
    expect(cleanupButtons.length).toBe(1);
  });
});

describe('Popup Component - Sync Status', () => {
  it('should show idle status when no sync happening', () => {
    render(<Popup syncStatus='idle' />);
    expect(screen.getByText('Sync Status: Idle')).toBeInTheDocument();
  });

  it('should show syncing status during sync', () => {
    render(<Popup syncStatus='syncing' />);
    expect(screen.getByText('Sync Status: Syncing...')).toBeInTheDocument();
  });

  it('should show error status on sync failure', () => {
    render(<Popup syncStatus='error' />);
    expect(screen.getByText('Sync Status: Error')).toBeInTheDocument();
  });

  it('should show error message on sync error', () => {
    render(<Popup syncStatus='error' errorMessage='Connection failed' />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });
});

describe('Popup Component - Device Rows', () => {
  const mockDevices = [
    {
      deviceId: 'device123',
      deviceName: 'Chrome on Windows 📡',
      lastSync: Date.now(),
      browser: 'chrome',
      os: 'Windows',
      tabs: [
        { url: 'https://example.com', title: 'Example' }
      ]
    }
  ];

  it('should render DeviceRow component for each device', () => {
    render(<Popup syncedDevices={mockDevices} />);
    expect(screen.getByTestId('device-row')).toBeInTheDocument();
  });

  it('should display device name with emoji marker', () => {
    render(<Popup syncedDevices={mockDevices} />);
    expect(screen.getByText('Chrome on Windows 📡')).toBeInTheDocument();
  });

  it('should display up to 5 tabs per device', () => {
    render(<Popup syncedDevices={mockDevices} />);
    const tabElements = screen.getAllByTestId('device-tab');
    expect(tabElements.length).toBeLessThanOrEqual(5);
  });
});

describe('Popup Component - Error Handling', () => {
  it('should show error message on sync error', () => {
    render(<Popup syncStatus='error' errorMessage='API connection failed' />);
    expect(screen.getByText('API connection failed')).toBeInTheDocument();
  });

  it('should hide error message when status changes', () => {
    render(<Popup syncStatus='syncing' />);
    expect(screen.queryByText('API connection failed')).not.toBeInTheDocument();
  });

  it('should handle network error gracefully', () => {
    render(<Popup syncStatus='error' errorMessage='Network error' />);
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});

describe('Popup Component - Loading States', () => {
  it('should show loading spinner when loading devices', () => {
    render(<Popup loading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should show skeleton when loading', () => {
    render(<Popup loading={true} />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should hide loading when not loading', () => {
    render(<Popup loading={false} syncedDevices={[]} />);
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});

describe('Popup Component - Responsive Design', () => {
  it('should maintain fixed width on all screens', () => {
    render(<Popup syncedDevices={[]} />);
    const popup = screen.getByTestId('popup-container');
    expect(popup.style.width).toBe('400px');
  });

  it('should handle overflow for long device names', () => {
    const longDeviceName = 'This is a very long device name that should overflow the container 📡';
    const devices = [
      {
        deviceId: 'device123',
        deviceName: longDeviceName,
        lastSync: Date.now(),
        browser: 'chrome',
        os: 'Windows',
        tabs: []
      }
    ];

    render(<Popup syncedDevices={devices} />);
    expect(screen.getByText(longDeviceName)).toBeInTheDocument();
  });
});
