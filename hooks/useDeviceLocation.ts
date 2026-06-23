import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

export function useDeviceLocation() {
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return null;
      }

      // Try to get last known location first (very fast, no permission pop-up hang)
      let currentLoc = await Location.getLastKnownPositionAsync({});
      if (!currentLoc) {
        // Fallback to getCurrentPositionAsync with accuracy set to balanced
        currentLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }

      if (currentLoc) {
        const coords = {
          latitude: currentLoc.coords.latitude,
          longitude: currentLoc.coords.longitude
        };
        setLocation(coords);
        return coords;
      }
      return null;
    } catch (e: any) {
      setErrorMsg(e.message);
      return null;
    }
  }, []);

  return { location, errorMsg, requestLocation };
}
