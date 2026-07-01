import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * Wraps Cloudinary image storage. Best-effort like FirebaseStorageService: if
 * env config is missing we leave `enabled = false` and the upload controller
 * falls back to the next provider (Firebase) or local disk.
 *
 * Env contract (enable by providing EITHER):
 *  - CLOUDINARY_URL           → cloudinary://<api_key>:<api_secret>@<cloud_name>
 *  - CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 * Optional:
 *  - CLOUDINARY_FOLDER        → thư mục lưu ảnh (mặc định "tripmate")
 *
 * Không cần thẻ tín dụng — free tier 25GB, phù hợp thay Firebase (yêu cầu Blaze).
 */
@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private readonly _enabled: boolean;
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    this.folder = this.config.get<string>('CLOUDINARY_FOLDER') ?? 'tripmate';
    this._enabled = this.init();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  private init(): boolean {
    try {
      const url = this.config.get<string>('CLOUDINARY_URL');
      const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
      const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

      if (url) {
        // SDK tự đọc biến môi trường CLOUDINARY_URL khi gọi config() rỗng.
        cloudinary.config({ secure: true });
      } else if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });
      } else {
        this.logger.warn(
          'Cloudinary env not set — skipping (will try Firebase/local).',
        );
        return false;
      }
      this.logger.log('Cloudinary Storage ready.');
      return true;
    } catch (err) {
      this.logger.error(`Cloudinary init failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Upload a buffer to Cloudinary and return its secure public URL.
   * Ảnh đặt trong folder cấu hình, tên ngẫu nhiên để tránh trùng.
   */
  async uploadBuffer(buffer: Buffer, _originalName: string): Promise<string> {
    if (!this._enabled) throw new Error('Cloudinary not initialized');
    const publicId = `${Date.now()}-${randomBytes(8).toString('hex')}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          public_id: publicId,
          resource_type: 'image',
          overwrite: false,
        },
        (error, res) => {
          if (error || !res) {
            reject(error ?? new Error('Cloudinary upload returned empty result'));
            return;
          }
          resolve(res);
        },
      );
      stream.end(buffer);
    });
    return result.secure_url;
  }
}
