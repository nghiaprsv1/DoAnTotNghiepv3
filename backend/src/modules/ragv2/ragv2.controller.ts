import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Public } from '@/common/decorators/public.decorator';
import { RagV2Service } from './ragv2.service';

class HistoryTurnDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

class RagAskDto {
  // Trim trước khi validate để câu chỉ gồm khoảng trắng cũng bị chặn (400, không 500).
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Câu hỏi không được để trống.' })
  @MaxLength(2000)
  question!: string;

  /** Lộ trình đang dựng (nếu có) — gửi kèm để bot chỉnh sửa thay vì dựng mới. */
  @IsOptional()
  draft?: unknown;

  /** Lịch sử hội thoại (các lượt trước) để agent hiểu câu nối tiếp. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HistoryTurnDto)
  history?: HistoryTurnDto[];
}

class RagIngestDto {
  /** Chỉ index các file này; bỏ trống = index toàn bộ thư mục tài liệu. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  files?: string[];
}

/**
 * API cho chatbot RAG v2 — ĐỘC LẬP với module ai/chatbot hiện tại.
 * Tất cả endpoint @Public để trang thử nghiệm /chatbot-v2 dùng được không cần auth.
 */
@ApiTags('RAG v2 (thử nghiệm)')
@Controller('rag-v2')
export class RagV2Controller {
  constructor(private readonly svc: RagV2Service) {}

  /** Tình trạng vector store + cấu hình. */
  @Public()
  @Get('status')
  status() {
    return this.svc.status();
  }

  /** Nạp / re-index tài liệu trong documemtRAG/. */
  @Public()
  @Post('ingest')
  ingest(@Body() dto: RagIngestDto) {
    return this.svc.ingest(dto.files);
  }

  /** Hỏi đáp RAG — trả về câu trả lời kèm trace pipeline. */
  @Public()
  @Post('ask')
  ask(@Body() dto: RagAskDto) {
    return this.svc.ask(dto.question, dto.draft as never, dto.history);
  }
}
