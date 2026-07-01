import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FirebaseStorageService } from './firebase-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';

@Module({
  providers: [CloudinaryStorageService, FirebaseStorageService],
  controllers: [UploadController],
  exports: [CloudinaryStorageService, FirebaseStorageService],
})
export class UploadModule {}
