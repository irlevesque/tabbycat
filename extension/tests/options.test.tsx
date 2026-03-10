import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Options from '../src/options';

// Mock chrome.storage
const mockStorage: Record<string, any> = {};

const mockChrome = {
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys: string | string[] | object) => {
        if (Array.isArray(keys)) {
          const result: Record<string, any> = {};
          keys.forEach(key => {
            if (mockStorage[key] !== undefined) {
              result[key] = mockStorage[key];
            }
          });
          return Promise.resolve(result);
        }
        return Promise.resolve({ [keys]: mockStorage[keys] });
      }),
      set: jest.fn().mockImplementation((items: Record<string, any>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: jest.fn().mockImplementation((key: string) => {
        delete mockStorage[key];
        return Promise.resolve();
      })
    }
  },
  runtime: {
    id: 'test-extension-id'
  }
};

Object.assign(global, { chrome: mockChrome });

describe('Options Component', () => {
  beforeEach(() => {
    mockStorage.syncInterval = 30;
    mockStorage.autoSync = true;
    mockStorage.notifyOnSync = true;
    mockStorage.deviceName = 'Test Device';
  });

  afterEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
  });

  describe('Settings Display', () => {
    it('should show device name input', async () => {
      render(<Options />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/device name/i)).toBeInTheDocument();
      });
    });

    it('should show sync interval input', async () => {
      render(<Options />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/sync interval/i)).toBeInTheDocument();
      });
    });

    it('should show auto-sync toggle', async () => {
      render(<Options />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/auto-sync/i)).toBeInTheDocument();
      });
    });

    it('should show notification preferences toggle', async () => {
      render(<Options />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/notification/i)).toBeInTheDocument();
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should save device name changes', async () => {
      render(<Options />);
      
      const deviceNameInput = await waitFor(() => 
        screen.getByLabelText(/device name/i)
      );
      
      await userEvent.clear(deviceNameInput);
      await userEvent.type(deviceNameInput, 'New Device Name');
      
      const saveButton = await waitFor(() => 
        screen.getByText(/save/i)
      );
      await userEvent.click(saveButton);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceName: 'New Device Name'
        })
      );
    });

    it('should save sync interval changes', async () => {
      render(<Options />);
      
      const intervalInput = await waitFor(() => 
        screen.getByLabelText(/sync interval/i)
      );
      
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, '60');
      
      const saveButton = await waitFor(() => 
        screen.getByText(/save/i)
      );
      await userEvent.click(saveButton);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          syncInterval: 60
        })
      );
    });

    it('should save auto-sync preference', async () => {
      render(<Options />);
      
      const autoSyncCheckbox = await waitFor(() => 
        screen.getByLabelText(/auto-sync/i)
      );
      
      await userEvent.click(autoSyncCheckbox);
      
      const saveButton = await waitFor(() => 
        screen.getByText(/save/i)
      );
      await userEvent.click(saveButton);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          autoSync: false
        })
      );
    });

    it('should save notification preference', async () => {
      render(<Options />);
      
      const notifyCheckbox = await waitFor(() => 
        screen.getByLabelText(/notification/i)
      );
      
      await userEvent.click(notifyCheckbox);
      
      const saveButton = await waitFor(() => 
        screen.getByText(/save/i)
      );
      await userEvent.click(saveButton);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          notifyOnSync: false
        })
      );
    });
  });

  describe('Validation', () => {
    it('should validate sync interval minimum', async () => {
      render(<Options />);
      
      const intervalInput = await waitFor(() => 
        screen.getByLabelText(/sync interval/i)
      );
      
      expect(intervalInput).toHaveAttribute('min', '10');
    });

    it('should validate sync interval maximum', async () => {
      render(<Options />);
      
      const intervalInput = await waitFor(() => 
        screen.getByLabelText(/sync interval/i)
      );
      
      expect(intervalInput).toHaveAttribute('max', '300');
    });

    it('should prevent invalid settings', async () => {
      render(<Options />);
      
      const intervalInput = await waitFor(() => 
        screen.getByLabelText(/sync interval/i)
      );
      
      // Try to enter invalid value
      await userEvent.clear(intervalInput);
      await userEvent.type(intervalInput, 'abc');
      
      // Value should be constrained
      expect(intervalInput).not.toHaveValue('abc');
    });
  });

  describe('UI Elements', () => {
    it('should show save button', async () => {
      render(<Options />);
      
      await waitFor(() => {
        expect(screen.getByText(/save/i)).toBeInTheDocument();
      });
    });

    it('should show reset button', async () => {
      render(<Options />);
      
      await waitFor(() => {
        expect(screen.getByText(/reset/i)).toBeInTheDocument();
      });
    });

    it('should display current device name', async () => {
      render(<Options />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/device name/i);
        expect(input).toHaveValue('Test Device');
      });
    });

    it('should display current sync interval', async () => {
      render(<Options />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/sync interval/i);
        expect(input).toHaveValue(30);
      });
    });

    it('should show auto-sync checkbox as checked by default', async () => {
      render(<Options />);
      
      await waitFor(() => {
        const checkbox = screen.getByLabelText(/auto-sync/i);
        expect(checkbox).toBeChecked();
      });
    });

    it('should show notification checkbox as checked by default', async () => {
      render(<Options />);
      
      await waitFor(() => {
        const checkbox = screen.getByLabelText(/notification/i);
        expect(checkbox).toBeChecked();
      });
    });
  });
});