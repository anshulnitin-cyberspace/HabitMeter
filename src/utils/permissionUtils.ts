import { Filesystem } from '@capacitor/filesystem';
import type { PermissionStatus } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const checkStoragePermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true; // Web fallback
  try {
    const status: PermissionStatus = await Filesystem.checkPermissions();
    return status.publicStorage === 'granted';
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

export const requestStoragePermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const status: PermissionStatus = await Filesystem.requestPermissions();
    return status.publicStorage === 'granted';
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
};

// Step 2 & 3: The Native OS Trigger - exact blueprint for two-step architecture
export const requestNativeStoragePermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const status: PermissionStatus = await Filesystem.requestPermissions();
    return status.publicStorage === 'granted';
  } catch (error) {
    console.error('OS Permission request failed:', error);
    return false;
  }
};


