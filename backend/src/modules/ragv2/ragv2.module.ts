import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { Place } from '@/modules/place/entities/place.entity';
import { GuideProfile } from '@/modules/guide/entities/guide-profile.entity';
import { Post } from '@/modules/post/entities/post.entity';
import { RagV2Service } from './ragv2.service';
import { RagV2Controller } from './ragv2.controller';
import { RagEmbeddings, RagChat } from './lib/rag-llm.interface';
import { RagReranker } from './lib/rag-reranker.interface';
import { GeminiEmbeddings } from './lib/gemini-embeddings';
import { GeminiChat } from './lib/gemini-chat';
import { OpenAiEmbeddings } from './lib/openai-embeddings';
import { OpenAiChat } from './lib/openai-chat';
import { CrossEncoderReranker } from './lib/cross-encoder-reranker';
import { LlmReranker } from './lib/llm-reranker';
import { TripRetriever } from './lib/retrievers/trip.retriever';
import { PlaceRetriever } from './lib/retrievers/place.retriever';
import { GuideRetriever } from './lib/retrievers/guide.retriever';
import { PostRetriever } from './lib/retrievers/post.retriever';

/**
 * Module chatbot RAG v2 (thử nghiệm) — hoàn toàn độc lập với AiModule.
 * Modular RAG: Router + nhiều retriever (tài liệu vector + DB trips/places/
 * guides/posts) + Fusion + reranking. Chỉ ĐỌC các entity domain qua repository
 * (không gọi service domain) → không tạo phụ thuộc vòng.
 *
 * LLM đa provider: RagEmbeddings/RagChat là token trừu tượng, factory dưới đây
 * chọn implementation theo env `RAGV2_LLM_PROVIDER` (gemini mặc định | openai).
 * ⚠️ Đổi provider → số chiều embedding khác → PHẢI chạy lại `npm run rag:ingest`.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([KnowledgeChunk, Trip, Place, GuideProfile, Post]),
  ],
  providers: [
    RagV2Service,
    // Giữ cả 2 bản trong container để factory chọn (không cái nào tự chạy khi không được chọn).
    GeminiEmbeddings,
    GeminiChat,
    OpenAiEmbeddings,
    OpenAiChat,
    {
      provide: RagEmbeddings,
      inject: [ConfigService, GeminiEmbeddings, OpenAiEmbeddings],
      useFactory: (config: ConfigService, gemini: GeminiEmbeddings, openai: OpenAiEmbeddings) =>
        config.get<string>('RAGV2_LLM_PROVIDER') === 'openai' ? openai : gemini,
    },
    {
      provide: RagChat,
      inject: [ConfigService, GeminiChat, OpenAiChat],
      useFactory: (config: ConfigService, gemini: GeminiChat, openai: OpenAiChat) =>
        config.get<string>('RAGV2_LLM_PROVIDER') === 'openai' ? openai : gemini,
    },
    // Reranker: CROSS-ENCODER local mặc định (đúng bản chất reranker IR); đổi
    // sang LLM (cách cũ) qua env RAGV2_RERANK_PROVIDER=llm để so sánh trong báo cáo.
    CrossEncoderReranker,
    LlmReranker,
    {
      provide: RagReranker,
      inject: [ConfigService, CrossEncoderReranker, LlmReranker],
      useFactory: (config: ConfigService, cross: CrossEncoderReranker, llm: LlmReranker) =>
        config.get<string>('RAGV2_RERANK_PROVIDER') === 'llm' ? llm : cross,
    },
    TripRetriever,
    PlaceRetriever,
    GuideRetriever,
    PostRetriever,
  ],
  controllers: [RagV2Controller],
})
export class RagV2Module {}
