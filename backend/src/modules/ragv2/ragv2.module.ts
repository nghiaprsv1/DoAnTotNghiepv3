import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { RagV2Service } from './ragv2.service';
import { RagV2Controller } from './ragv2.controller';
import { GeminiEmbeddings } from './lib/gemini-embeddings';
import { GeminiChat } from './lib/gemini-chat';

/**
 * Module chatbot RAG v2 (thử nghiệm) — hoàn toàn độc lập với AiModule.
 * Chunking + Gemini embedding + vector store Postgres + cosine search.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([KnowledgeChunk])],
  providers: [RagV2Service, GeminiEmbeddings, GeminiChat],
  controllers: [RagV2Controller],
})
export class RagV2Module {}
