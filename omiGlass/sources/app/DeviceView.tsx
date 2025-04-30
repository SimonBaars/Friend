import * as React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, Alert, Platform, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { rotateImage } from '../modules/imaging';
import { toBase64Image, toBase64 } from '../utils/base64';
import { Agent } from '../agent/Agent';
import { InvalidateSync } from '../utils/invalidateSync';
import { textToSpeech } from '../modules/openai';
import { Device, Characteristic } from 'react-native-ble-plx';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const SERVICE_UUID = '19B10000-E8F2-537E-4F6C-D104768A1214';
const PHOTO_CHARACTERISTIC_UUID = '19b10005-e8f2-537e-4f6c-d104768a1214';
const PHOTO_CONTROL_CHARACTERISTIC_UUID = '19b10006-e8f2-537e-4f6c-d104768a1214';

// Define photo type
interface Photo {
    data: Uint8Array;
    timestamp: number;
    filePath?: string;
}

function usePhotos(device: Device) {
    // Subscribe to device
    const [photos, setPhotos] = React.useState<Array<Photo>>([]);
    const [subscribed, setSubscribed] = React.useState<boolean>(false);
    
    React.useEffect(() => {
        let previousChunk = -1;
        let buffer: Uint8Array = new Uint8Array(0);
        
        function onChunk(id: number | null, data: Uint8Array) {
            // Resolve if packet is the first one
            if (previousChunk === -1) {
                if (id === null) {
                    return;
                } else if (id === 0) {
                    previousChunk = 0;
                    buffer = new Uint8Array(0);
                } else {
                    return;
                }
            } else {
                if (id === null) {
                    console.log('Photo received', buffer);
                    const timestamp = Date.now(); // Get current timestamp
                    
                    // Save the photo to the file system
                    const filename = `omiglass_${timestamp}.jpg`;
                    const filePath = `${FileSystem.documentDirectory}photos/${filename}`;
                    
                    // Ensure the photos directory exists
                    FileSystem.getInfoAsync(`${FileSystem.documentDirectory}photos`)
                        .then(dirInfo => {
                            if (!dirInfo.exists) {
                                return FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}photos`, {
                                    intermediates: true
                                });
                            }
                        })
                        .then(() => {
                            // Convert Uint8Array to base64 for storage
                            const base64Data = toBase64(buffer);
                            
                            // Save the file to disk
                            return FileSystem.writeAsStringAsync(filePath, base64Data, {
                                encoding: FileSystem.EncodingType.Base64
                            });
                        })
                        .then(() => {
                            console.log(`Photo saved to ${filePath}`);
                        })
                        .catch(error => {
                            console.error('Error saving photo:', error);
                        });
                    
                    // Process the image and add to state
                    rotateImage(buffer, '270').then((rotated) => {
                        console.log('Rotated photo', rotated);
                        setPhotos((p) => [...p, { 
                            data: rotated, 
                            timestamp: timestamp,
                            filePath: filePath // Store the file path for reference
                        }]); // Store data and timestamp
                    });
                    
                    previousChunk = -1;
                    return;
                } else {
                    if (id !== previousChunk + 1) {
                        previousChunk = -1;
                        console.error('Invalid chunk', id, previousChunk);
                        return;
                    }
                    previousChunk = id;
                }
            }

            // Append data
            buffer = new Uint8Array([...buffer, ...data]);
        }

        try {
            // Set up BLE notification subscription
            device.monitorCharacteristicForService(
                SERVICE_UUID,
                PHOTO_CHARACTERISTIC_UUID,
                (error, characteristic) => {
                    if (error) {
                        console.error('Notification error:', error);
                        return;
                    }
                    
                    if (!characteristic?.value) {
                        console.error('No value in notification');
                        return;
                    }
                    
                    // Convert base64 to Uint8Array using the native base64 decoder
                    const base64String = characteristic.value;
                    // React Native doesn't have Buffer, so we need to use a different method
                    // Here, we'll use a simple base64 decoding function
                    const binString = atob(base64String);
                    const array = new Uint8Array(binString.length);
                    for (let i = 0; i < binString.length; i++) {
                        array[i] = binString.charCodeAt(i);
                    }
                    
                    if (array[0] == 0xff && array[1] == 0xff) {
                        onChunk(null, new Uint8Array());
                    } else {
                        let packetId = array[0] + (array[1] << 8);
                        let packet = array.slice(2);
                        onChunk(packetId, packet);
                    }
                }
            );
            
            // Start automatic photo capture every 5s
            // Base64 encode a byte array manually
            const writeData = btoa(String.fromCharCode(0x05));
            device.writeCharacteristicWithResponseForService(
                SERVICE_UUID,
                PHOTO_CONTROL_CHARACTERISTIC_UUID,
                writeData
            ).then(() => {
                console.log('Started automatic photo capture');
                setSubscribed(true);
            }).catch(error => {
                console.error('Failed to start photo capture:', error);
            });
        } catch (error) {
            console.error('Error setting up notifications:', error);
        }
        
        // Clean up - just stop monitoring on unmount
        return () => {
            try {
                device.cancelTransaction('monitor');
            } catch (e) {
                console.error('Error cleaning up BLE monitoring:', e);
            }
        };
    }, [device]);

    return [subscribed, photos] as const;
}

export const DeviceView = React.memo((props: { device: Device }) => {
    const [subscribed, photos] = usePhotos(props.device);
    const agent = React.useMemo(() => new Agent(), []);
    const agentState = agent.use();
    const [activePhotoIndex, setActivePhotoIndex] = React.useState<number | null>(null);

    // Background processing agent
    const processedPhotos = React.useRef<Uint8Array[]>([]);
    const sync = React.useMemo(() => {
        let processed = 0;
        return new InvalidateSync(async () => {
            if (processedPhotos.current.length > processed) {
                let unprocessed = processedPhotos.current.slice(processed);
                processed = processedPhotos.current.length;
                await agent.addPhoto(unprocessed);
            }
        });
    }, []);
    React.useEffect(() => {
        processedPhotos.current = photos.map(p => p.data);
        sync.invalidate();
    }, [photos]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {/* Display photos in a grid filling the screen */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#111' }}>
                <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 5 }}>
                    {photos.slice().reverse().map((photo, index) => ( // Display newest first
                        <Pressable
                            key={photos.length - 1 - index} // Use original index for key stability if needed
                            onPressIn={() => setActivePhotoIndex(photos.length - 1 - index)}
                            onPressOut={() => setActivePhotoIndex(null)}
                            style={{
                                position: 'relative',
                                width: '33%', // Roughly 3 images per row
                                aspectRatio: 1, // Make images square
                                padding: 2 // Add spacing
                            }}
                        >
                            <Image style={{ width: '100%', height: '100%', borderRadius: 5 }} source={{ uri: toBase64Image(photo.data) }} />
                            {activePhotoIndex === (photos.length - 1 - index) && (
                                <View style={{
                                    position: 'absolute',
                                    bottom: 2, // Adjusted for padding
                                    left: 2,
                                    right: 2,
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    paddingVertical: 3,
                                    paddingHorizontal: 5,
                                    alignItems: 'center',
                                    borderRadius: 3
                                }}>
                                    <Text style={{ color: 'white', fontSize: 10 }}>
                                        {new Date(photo.timestamp).toLocaleTimeString()}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
});