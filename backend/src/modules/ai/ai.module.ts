import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '@/modules/trip/entities/trip.entity';
import { Category } from '@/modules/place/entities/category.entity';
import { Province } from '@/modules/place/entities/province.entity';
import { Place } from '@/modules/place/entities/place.entity';
import { UserPreference } from '@/modules/user/entities/user-preference.entity';
import { AiChatSession } from './entities/ai-chat-session.entity';
import { AiChatMessage } from './entities/ai-chat-message.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { TripsModule } from '@/modules/trip/trips.module';
import { LLM_PROVIDER } from './llm/llm-provider.interface';
import { LocalLlmProvider } from './llm/local-llm.provider';
import { GeminiProvider } from './llm/gemini.provider';
import { TemplateProvider } from './llm/template.provider';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Trip,
      Category,
      Province,
      Place,
      AiChatSession,
      AiChatMessage,
      UserPreference,
    ]),
    TripsModule,
  ],
  providers: [
    AiService,
    LocalLlmProvider,
    GeminiProvider,
    TemplateProvider,
    {
      // Chọn provider theo env LLM_PROVIDER (mặc định 'gemini'; 'local' = Qwen self-host).
      provide: LLM_PROVIDER,
      inject: [ConfigService, LocalLlmProvider, GeminiProvider, TemplateProvider],
      useFactory: (
        config: ConfigService,
        local: LocalLlmProvider,
        gemini: GeminiProvider,
        template: TemplateProvider,
      ) => {
        // Mặc định 'gemini' (đổi từ 'local'/Qwen). Qwen được GIỮ LẠI để chạy
        // luân phiên đo hiệu quả: đặt LLM_PROVIDER=local là quay về self-host.
        const choice = (config.get<string>('LLM_PROVIDER') || 'gemini').toLowerCase();
        if (choice === 'gemini') return gemini;
        if (choice === 'template') return template;
        return local; // 'local' = Qwen2.5-3B self-host (node-llama-cpp)
      },
    },
  ],
  controllers: [AiController],
})
export class AiModule {}
