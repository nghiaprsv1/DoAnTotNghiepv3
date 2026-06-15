import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import {
  cert,
  applicationDefault,
  initializeApp,
  getApps,
  type App,
  type Credential,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getStorage, type Storage } from 'firebase-admin/storage';

/**
 * Wraps Firebase Admin Storage. The service is best-effort: if env config is
 * missing we leave `enabled = false` and the upload controller falls back to
 * local disk so the rest of the app keeps working without Firebase set up.
 *
 * Env contract (any of these enables Firebase):
 *  - FIREBASE_SERVICE_ACCOUNT_JSON  → full JSON of the service account (string)
 *  - FIREBASE_SERVICE_ACCOUNT_PATH  → path to service-account.json on disk
 *  - GOOGLE_APPLICATION_CREDENTIALS → standard Google ADC env
 *  - FIREBASE_STORAGE_BUCKET (required) → e.g. "tripmate-xxx.appspot.com"
 */
@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private bucket: ReturnType<Storage['bucket']> | null = null;
  private app: App | null = null;
  private readonly _enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this._enabled = this.init();
  }

  get enabled(): boolean {
    return this._enabled;
  }

  private init(): boolean {
    try {
      const bucketName = this.config.get<string>('FIREBASE_STORAGE_BUCKET');
      if (!bucketName) {
        this.logger.warn(
          'FIREBASE_STORAGE_BUCKET not set — falling back to local disk storage.',
        );
        return false;
      }
      if (getApps().length === 0) {
        const credential = this.resolveCredential();
        if (!credential) {
          this.logger.warn(
            'No Firebase credential found — falling back to local disk storage.',
          );
          return false;
        }
        this.app = initializeApp({ credential, storageBucket: bucketName });
      } else {
        this.app = getApps()[0];
      }
      this.bucket = getStorage(this.app).bucket(bucketName);
      this.logger.log(`Firebase Storage ready (bucket=${bucketName})`);
      return true;
    } catch (err) {
      this.logger.error(`Firebase init failed: ${(err as Error).message}`);
      return false;
    }
  }

  private resolveCredential(): Credential | null {
    const json = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (json) {
      try {
        return cert(JSON.parse(json) as ServiceAccount);
      } catch (err) {
        this.logger.error(`Bad FIREBASE_SERVICE_ACCOUNT_JSON: ${(err as Error).message}`);
        return null;
      }
    }
    const path = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (path) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sa = require(path) as ServiceAccount;
        return cert(sa);
      } catch (err) {
        this.logger.error(`Bad FIREBASE_SERVICE_ACCOUNT_PATH: ${(err as Error).message}`);
        return null;
      }
    }
    if (this.config.get<string>('GOOGLE_APPLICATION_CREDENTIALS')) {
      return applicationDefault();
    }
    return null;
  }

  /**
   * Upload a buffer to Firebase Storage and return its public URL.
   * Files are placed under `images/<unix>-<rand><ext>` and made readable.
   */
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<string> {
    if (!this.bucket) throw new Error('Firebase Storage not initialized');
    const ext = extname(originalName).toLowerCase();
    const id = randomBytes(8).toString('hex');
    const objectName = `images/${Date.now()}-${id}${ext}`;
    const file = this.bucket.file(objectName);
    await file.save(buffer, {
      contentType,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      resumable: false,
      validation: false,
    });
    // Make the object publicly readable (simplest path; matches local behavior).
    try {
      await file.makePublic();
    } catch {
      // Some buckets disallow makePublic — fall back to a long-lived signed URL.
      const [signed] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
      });
      return signed;
    }
    return `https://storage.googleapis.com/${this.bucket.name}/${objectName}`;
  }
}
