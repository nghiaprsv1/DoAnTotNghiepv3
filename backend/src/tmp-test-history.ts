import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RagV2Service, type RagItinerarySuggestion } from './modules/ragv2/ragv2.service';

type Turn = { role: 'user' | 'assistant'; content: string };

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const svc = app.get(RagV2Service);
  const history: Turn[] = [];
  let draft: RagItinerarySuggestion | null = null;

  async function turn(q: string) {
    console.log(`\n${'='.repeat(64)}\n👤 ${q}\n${'='.repeat(64)}`);
    const r = await svc.ask(q, draft, history);
    console.log('🤖', r.answer.slice(0, 160));
    console.log('🗺️  suggestion:', r.suggestion ? `${r.suggestion.title} (${r.suggestion.destination})` : '— KHÔNG —');
    console.log('🃏 cards:', r.cards.map((c) => `${c.source}:${c.title}`).join(', ') || '—');
    console.log('🔧', r.trace.steps.map((s) => {
      const c = s.key === 'agent_tool' ? `(${(s.detail.calls as { name: string }[] ?? []).map((x) => x.name).join(',')})` : '';
      return s.key + c;
    }).join(' → '));
    history.push({ role: 'user', content: q });
    history.push({ role: 'assistant', content: r.answer });
    if (r.suggestion) draft = r.suggestion; // FE giữ draft khi có lộ trình
  }

  // Câu 1: tạo lộ trình Phú Quốc
  await turn('tạo cho tôi lộ trình đi Phú Quốc 3 ngày');
  // Câu 2: ĐỔI CHỦ ĐỀ hẳn — phải KHÔNG dính Phú Quốc
  await turn('Cao Bằng mùa nào đẹp?');
  // Câu 3: hỏi nối tiếp Cao Bằng
  await turn('ở đó có địa điểm nào nổi tiếng?');

  await app.close();
}
main().catch((e) => { console.error('LỖI:', (e as Error).message); process.exit(1); });
