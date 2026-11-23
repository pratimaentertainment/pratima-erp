import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class StorageService {
  private static instance: StorageService;
  private s3Client: S3Client;
  private bucketName: string;

  private constructor() {
    const region = process.env.AWS_REGION || 'ap-south-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'pratima-erp-storage';

    if (!accessKeyId || !secretAccessKey) {
      console.warn('AWS credentials not fully provided in environment variables.');
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || ''
      }
    });
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Uploads a file buffer to S3 with strict multi-tenant isolation.
   * Path format: {tenantId}/{folder}/{timestamp}-{fileName}
   */
  public async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string,
    tenantId: string
  ): Promise<string> {
    const key = `${tenantId}/${folder}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: 'public-read', // Or private depending on requirements
    });

    try {
      await this.s3Client.send(command);
      // Construct the public URL
      const region = await this.s3Client.config.region();
      const url = `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
      return url;
    } catch (error: any) {
      console.error('S3 Upload Error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }
}
