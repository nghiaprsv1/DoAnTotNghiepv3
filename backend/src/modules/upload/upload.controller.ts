import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Express } from 'express';
import { writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { multerOptions, UPLOAD_PATH } from './multer.config';
import { FirebaseStorageService } from './firebase-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';

/**
 * Resolve a single uploaded file → public URL. Chooses a storage backend at
 * runtime, in priority order: Cloudinary → Firebase → local `uploads/`
 * (served from `/static/...`). The first enabled provider wins.
 */
async function persistFile(
  file: Express.Multer.File,
  cloudinary: CloudinaryStorageService,
  firebase: FirebaseStorageService,
): Promise<string> {
  if (cloudinary.enabled && file.buffer) {
    return cloudinary.uploadBuffer(file.buffer, file.originalname);
  }
  if (firebase.enabled && file.buffer) {
    return firebase.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype || 'application/octet-stream',
    );
  }
  // Memory-storage fallback — write the buffer to disk ourselves.
  if (file.buffer) {
    const ext = extname(file.originalname).toLowerCase();
    const id = randomBytes(8).toString('hex');
    const filename = `${Date.now()}-${id}${ext}`;
    await writeFile(join(UPLOAD_PATH, filename), file.buffer);
    return `/static/${filename}`;
  }
  // Disk-storage path (legacy) — multer wrote the file already.
  return `/static/${file.filename}`;
}

@ApiTags('Upload')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(
    private readonly cloudinary: CloudinaryStorageService,
    private readonly firebase: FirebaseStorageService,
  ) {}

  /** Single file → returns { url }. Storage chosen at runtime. */
  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadOne(@UploadedFile() file: Express.Multer.File) {
    const url = await persistFile(file, this.cloudinary, this.firebase);
    return { url };
  }

  /** Multi files → returns { urls: string[] }. */
  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async uploadMany(@UploadedFiles() files: Express.Multer.File[]) {
    const urls = await Promise.all(
      files.map((f) => persistFile(f, this.cloudinary, this.firebase)),
    );
    return { urls };
  }
}
