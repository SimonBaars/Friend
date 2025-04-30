import * as React from 'react';
import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { Platform } from 'react-native';

const DEVICE_STORAGE_KEY = 'openglassDeviceId';
const SERVICE_UUID = '19B10000-E8F2-537E-4F6C-D104768A1214';

// Create a single BLE manager instance
const bleManager = new BleManager();

export function useDevice(): [Device | null, () => Promise<void>, boolean] {
    // Create state
    const deviceRef = React.useRef<Device | null>(null);
    const [device, setDevice] = React.useState<Device | null>(null);
    const [isAutoConnecting, setIsAutoConnecting] = React.useState<boolean>(false);

    // Handle device disconnection
    React.useEffect(() => {
        if (!deviceRef.current?.id) {
            return () => {}; // No cleanup needed if no device
        }
        
        // Set up event listener for disconnection
        const disconnectSubscription = bleManager.onDeviceDisconnected(deviceRef.current.id, (error, disconnectedDevice) => {
            if (error) {
                console.error('Disconnection error:', error);
            }
            
            console.log('Device disconnected, attempting to reconnect...');
            
            // Attempt to reconnect
            if (disconnectedDevice) {
                reconnectToDevice(disconnectedDevice.id);
            }
        });
        
        // Clean up subscription
        return () => {
            if (typeof disconnectSubscription?.remove === 'function') {
                disconnectSubscription.remove();
            }
        };
    }, [device]);

    // Function to reconnect to a device by ID
    const reconnectToDevice = async (deviceId: string) => {
        setIsAutoConnecting(true);
        try {
            console.log('Reconnecting to device:', deviceId);
            const connectedDevice = await bleManager.connectToDevice(deviceId);
            await connectedDevice.discoverAllServicesAndCharacteristics();
            
            deviceRef.current = connectedDevice;
            setDevice(connectedDevice);
            console.log('Reconnection successful!');
        } catch (err) {
            console.error('Reconnection failed:', err);
            deviceRef.current = null;
            setDevice(null);
        } finally {
            setIsAutoConnecting(false);
        }
    };

    // Create callback to connect to device
    const doConnect = React.useCallback(async () => {
        try {
            // The permissions are now handled automatically by the library 
            // or should be requested at app startup

            // Start scanning for devices
            console.log('Scanning for OpenGlass devices...');
            setIsAutoConnecting(true);
            
            // Start scanning for devices
            bleManager.startDeviceScan(
                null, 
                { allowDuplicates: false }, 
                (error, scannedDevice) => {
                    if (error) {
                        console.error('Scan error:', error);
                        setIsAutoConnecting(false);
                        bleManager.stopDeviceScan();
                        return;
                    }
                    
                    // Check if this is our device
                    if (scannedDevice && scannedDevice.name === 'OpenGlass') {
                        console.log('Found OpenGlass device:', scannedDevice.id);
                        
                        // Stop scanning once we've found our device
                        bleManager.stopDeviceScan();
                        
                        // Connect to the device
                        bleManager.connectToDevice(scannedDevice.id)
                            .then(connectedDevice => {
                                console.log('Connected to device, discovering services...');
                                return connectedDevice.discoverAllServicesAndCharacteristics();
                            })
                            .then(discoveredDevice => {
                                console.log('Services discovered!');
                                deviceRef.current = discoveredDevice;
                                setDevice(discoveredDevice);
                            })
                            .catch(err => {
                                console.error('Connection error:', err);
                                deviceRef.current = null;
                                setDevice(null);
                            })
                            .finally(() => {
                                setIsAutoConnecting(false);
                            });
                    }
                }
            );
            
            // Stop scanning after 10 seconds if no device found
            setTimeout(() => {
                if (!device) {
                    console.log('Scan timeout - no devices found');
                    bleManager.stopDeviceScan();
                    setIsAutoConnecting(false);
                }
            }, 10000);
        } catch (e) {
            console.error('Connection failed:', e);
            setIsAutoConnecting(false);
        }
    }, []);

    // Return
    return [device, doConnect, isAutoConnecting];
}