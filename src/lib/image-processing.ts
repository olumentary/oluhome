import sharp from 'sharp';
import { getObject, putObject } from './storage';

// ---------------------------------------------------------------------------
// Thumbnail generation
// ---------------------------------------------------------------------------

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

export interface ImageMetadata {
  widthPx: number;
  heightPx: number;
}

/**
 * Fetches the original image from S3, generates a 400px-wide JPEG thumbnail,
 * uploads it back to S3, and returns the original image dimensions.
 */
export async function processUploadedPhoto(
  key: string,
  thumbKey: string,
): Promise<ImageMetadata> {
  // Fetch original from S3
  const response = await getObject(key);
  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const originalBuffer = Buffer.concat(chunks);

  // Read metadata from original
  const metadata = await sharp(originalBuffer).metadata();
  const widthPx = metadata.width ?? 0;
  const heightPx = metadata.height ?? 0;

  // Generate thumbnail: 400px wide, maintain aspect ratio, JPEG 80%
  const thumbnailBuffer = await sharp(originalBuffer)
    .resize(THUMB_WIDTH, null, { withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();

  // Upload thumbnail to S3
  await putObject(thumbKey, thumbnailBuffer, 'image/jpeg');

  return { widthPx, heightPx };
}
