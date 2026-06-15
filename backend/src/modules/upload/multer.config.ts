import { diskStorage, memoryStorage } from 'multer';
import { extname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const UPLOAD_DIR = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
const MAX_MB = Number(process.env.UPLOAD_MAX_SIZE_MB ?? 10);
const ALLOWED = /\.(jpe?g|png|webp|gif|avif)$/i;

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const fileFilter: MulterOptions['fileFilter'] = (
  _req: Request,
  file: Express.Multer.File,
  cb: (err: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED.test(file.originalname)) {
    cb(new BadRequestException('Only image files are allowed'), false);
    return;
  }
  cb(null, true);
};

const limits = { fileSize: MAX_MB * 1024 * 1024 };

/**
 * Disk-storage variant — used when Firebase isn't configured. The controller
 * persists buffers to local `uploads/` and serves them from `/static/...`.
 */
export const localMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      const id = randomBytes(8).toString('hex');
      cb(null, `${Date.now()}-${id}${ext}`);
    },
  }),
  fileFilter,
  limits,
};

/**
 * Memory-storage variant — used when Firebase is configured. Buffers stay in
 * RAM long enough for the controller to forward them to Firebase Storage.
 */
export const memoryMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  fileFilter,
  limits,
};

/**
 * Default options the controller uses. We always go through memory storage
 * so the controller can pick the destination at runtime — local disk if
 * Firebase isn't configured, Firebase otherwise. Falls back to disk if the
 * runtime decides we should keep the file locally.
 */
export const multerOptions = memoryMulterOptions;

export const UPLOAD_PATH = UPLOAD_DIR;
