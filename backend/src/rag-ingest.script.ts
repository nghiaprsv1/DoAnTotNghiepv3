import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { RagV2Service } from './modules/ragv2/ragv2.service';

/**
 * Script nạp tài liệu RAG v2 vào vector store.
 * Chạy: npm run rag:ingest   (từ thư mục backend/)
 *
 * Đọc các file .txt/.md trong documemtRAG/, chunk → Gemini embedding → lưu DB.
 * Cần GEMINI_API_KEY trong môi trường.
 */
async function main() {
  const logger = new Logger('rag:ingest');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const svc = app.get(RagV2Service);
    logger.log('Bắt đầu nạp tài liệu RAG v2...');
    const result = await svc.ingest();
    for (const d of result.documents) {
      logger.log(`  • ${d.docName}: ${d.chunks} chunk, ${d.chars} ký tự`);
    }
    logger.log(
      `Hoàn tất: ${result.totalChunks} chunk (model: ${result.embeddingModel}).`,
    );
  } catch (e) {
    logger.error(`Nạp thất bại: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
