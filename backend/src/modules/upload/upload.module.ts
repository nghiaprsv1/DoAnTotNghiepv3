import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FirebaseStorageService } from './firebase-storage.service';

@Module({
  providers: [FirebaseStorageService],
  controllers: [UploadController],
  exports: [FirebaseStorageService],
})
export class UploadModule {}
