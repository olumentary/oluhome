import type { StorageDriver } from './types';
import { s3Driver } from './s3';
import { localDriver } from './local';

const driverName = (process.env.STORAGE_DRIVER || 's3').toLowerCase();
const driver: StorageDriver = driverName === 'local' ? localDriver : s3Driver;

if (process.env.NODE_ENV !== 'test') {
  console.log(`[storage] driver=${driverName === 'local' ? 'local' : 's3'}`);
}

export function photoKey(
  userId: string,
  itemId: string,
  photoId: string,
  filename: string,
): string {
  return `${userId}/items/${itemId}/photos/${photoId}/${filename}`;
}

export function thumbnailKey(
  userId: string,
  itemId: string,
  photoId: string,
  filename: string,
): string {
  return `${userId}/items/${itemId}/photos/${photoId}/thumb_${filename}`;
}

export const generatePresignedUploadUrl = driver.generatePresignedUploadUrl.bind(driver);
export const generatePresignedDownloadUrl = driver.generatePresignedDownloadUrl.bind(driver);
export const getObject = driver.getObject.bind(driver);
export const putObject = driver.putObject.bind(driver);
export const deleteObject = driver.deleteObject.bind(driver);
export const deleteObjects = driver.deleteObjects.bind(driver);

export type { StorageDriver };
