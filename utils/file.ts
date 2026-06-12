import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}

/**
 * Converts a base64 string to an ArrayBuffer in pure JavaScript.
 * Crucial for React Native where Blob uploads are buggy.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let bufferLength = base64.length * 0.75;
  const len = base64.length;
  let i = 0;
  let p = 0;

  if (base64[len - 1] === '=') {
    bufferLength--;
    if (base64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  for (i = 0; i < len; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arrayBuffer;
}

/**
 * Converts a local file or asset URI into a Blob (via XHR) on web,
 * or reads it as base64 and converts to ArrayBuffer on mobile devices,
 * then uploads it directly to Supabase Storage.
 * 
 * This resolves buggy React Native Blob upload serialization issues on iOS and Android.
 */
export async function uploadToSupabase(
  bucket: string,
  path: string,
  uri: string,
  contentType: string
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        reject(e);
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
  } else {
    // On iOS/Android, read locally using Expo FileSystem and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = base64ToArrayBuffer(base64);

    const { error } = await supabase.storage.from(bucket).upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
  }
}

/**
 * Extracts a clean and valid file extension from a URI path or MIME type.
 * Prevents appending long URL strings (like blob:http...) as file extensions.
 */
export function getCleanExtension(uri: string, mimeType?: string): string {
  const cleanUri = uri.split('?')[0].split('#')[0];
  let ext = cleanUri.split('.').pop()?.toLowerCase() || '';
  
  // Validate that extension is a short alphanumeric string
  if (!/^[a-z0-9]{2,5}$/.test(ext)) {
    if (mimeType && mimeType.includes('/')) {
      ext = mimeType.split('/')[1];
    } else {
      ext = 'jpeg';
    }
  }
  
  // Normalize common variations
  if (ext === 'jpeg') return 'jpg';
  return ext;
}
