/**
 * Converts a local file or asset URI (like those returned by expo-image-picker or expo-document-picker)
 * into a Blob object that can be uploaded to Supabase Storage.
 * 
 * We use XMLHttpRequest instead of the global fetch() because fetch() frequently throws "Network request failed"
 * on iOS/Android physical devices when fetching local assets.
 */
export function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.error('uriToBlob XHR Error:', e);
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}
