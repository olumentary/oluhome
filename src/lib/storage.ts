import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ---------------------------------------------------------------------------
// S3 Client — Linode Object Storage (S3-compatible)
// ---------------------------------------------------------------------------

const endpoint = process.env.LINODE_ENDPOINT!;
const bucket = process.env.LINODE_BUCKET!;

const s3 = new S3Client({
  region: 'us-east-1', // Linode ignores region but SDK requires one
  endpoint,
  credentials: {
    accessKeyId: process.env.LINODE_ACCESS_KEY!,
    secretAccessKey: process.env.LINODE_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for Linode Object Storage
});

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Presigned URLs
// ---------------------------------------------------------------------------

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes
}

export async function generatePresignedDownloadUrl(
  key: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

// ---------------------------------------------------------------------------
// Object operations
// ---------------------------------------------------------------------------

export async function getObject(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return s3.send(command);
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return s3.send(command);
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return s3.send(command);
}

export async function deleteObjects(keys: string[]) {
  if (keys.length === 0) return;

  const command = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: keys.map((Key) => ({ Key })),
      Quiet: true,
    },
  });
  return s3.send(command);
}
