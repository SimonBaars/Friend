import * as React from 'react';
import { Main } from './sources/app/Main';
import { Platform, PermissionsAndroid } from 'react-native';

const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);
      
      return (
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted' &&
        (granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' || Platform.Version < 31) &&
        (granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' || Platform.Version < 31)
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  return true;
};

export default function Root() {
  const [permissionsGranted, setPermissionsGranted] = React.useState(Platform.OS !== 'android');
  
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      requestPermissions().then(granted => {
        setPermissionsGranted(granted);
      });
    }
  }, []);
  
  if (!permissionsGranted && Platform.OS === 'android') {
    return null; // Or a loading screen while waiting for permissions
  }
  
  return <Main />;
}