import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageDriver } from './types';

const endpoint = process.env.LINODE_ENDPOINT;
const bucket = process.env.LINODE_BUCKET;

let s3Client: S3Client | null = null;
function getClient(): S3Client {
  if (!s3Client) {
    if (!endpoint || !bucket) {
      throw new Error(
        'S3 storage driver selected but LINODE_ENDPOINT / LINODE_BUCKET are not set',
      );
    }
    s3Client = new S3Client({
      region: 'us-east-1',
      endpoint,
      credentials: {
        accessKeyId: process.env.LINODE_ACCESS_KEY!,
        secretAccessKey: process.env.LINODE_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export const s3Driver: StorageDriver = {
  async generatePresignedUploadUrl(key, contentType) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(getClient(), command, { expiresIn: 900 });
  },

  async generatePresignedDownloadUrl(key) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(getClient(), command, { expiresIn: 3600 });
  },

  async getObject(key) {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error(`getObject: empty body for key ${key}`);
    return Buffer.from(bytes);
  },

  async putObject(key, body, contentType) {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async deleteObject(key) {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },

  async deleteObjects(keys) {
    if (keys.length === 0) return;
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  },
};
