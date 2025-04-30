import * as React from 'react';
import { SafeAreaView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { RoundButton } from './components/RoundButton';
import { Theme } from './components/theme';
import { useDevice } from '../modules/useDevice';
import { DeviceView } from './DeviceView';
import { startAudio } from '../modules/openai';

export const Main = React.memo(() => {

    const [device, connectDevice, isAutoConnecting] = useDevice();
    const [isConnecting, setIsConnecting] = React.useState(false);
    
    // Handle connection attempt
    const handleConnect = React.useCallback(async () => {
        setIsConnecting(true);
        try {
            await connectDevice();
        } finally {
            setIsConnecting(false);
        }
    }, [connectDevice]);
    
    return (
        <SafeAreaView style={styles.container}>
            {!device && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', alignSelf: 'center' }}>
                    {isConnecting || isAutoConnecting ? (
                        <View>
                            <Text style={styles.statusText}>
                                {isConnecting ? "Scanning for OpenGlass devices..." : "Connecting to OpenGlass..."}
                            </Text>
                            <ActivityIndicator size="large" color={Theme.primary} />
                        </View>
                    ) : (
                        <RoundButton title="Connect to the device" action={handleConnect} />
                    )}
                </View>
            )}
            {device && (
                <DeviceView device={device} />
            )}
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.background,
        alignItems: 'stretch',
        justifyContent: 'center',
    },
    statusText: {
        color: Theme.text,
        fontSize: 18,
        marginBottom: 16,
    }
});