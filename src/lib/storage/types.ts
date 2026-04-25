export interface StorageDriver {
  generatePresignedUploadUrl(key: string, contentType: string): Promise<string>;
  generatePresignedDownloadUrl(key: string): Promise<string>;
  getObject(key: string): Promise<Buffer>;
  putObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  deleteObjects(keys: string[]): Promise<void>;
}
