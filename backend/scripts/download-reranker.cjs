/**
 * Tải sẵn model CROSS-ENCODER rerank (mặc định Xenova/bge-reranker-base) về cache
 * dự án để lần chấm điểm đầu tiên không phải chờ tải weight ONNX qua mạng.
 *
 * Chạy: `npm run rerank:download` (trong backend/).
 * Cache vào thư mục `models/transformers` (đổi qua RAGV2_RERANK_CACHE_DIR).
 *
 * Lưu ý: @xenova/transformers là ESM-only nên file này dùng import() động.
 */
(async () => {
  const path = require('path');
  const modelId = process.env.RAGV2_RERANK_MODEL || 'Xenova/bge-reranker-base';
  const cacheDir =
    process.env.RAGV2_RERANK_CACHE_DIR || path.resolve(process.cwd(), 'models', 'transformers');

  console.log(`[rerank:download] Model: ${modelId}`);
  console.log(`[rerank:download] Cache : ${cacheDir}`);

  const tf = await import('@xenova/transformers');
  tf.env.cacheDir = cacheDir;
  tf.env.allowLocalModels = true;
  tf.env.allowRemoteModels = true;

  const t0 = Date.now();
  console.log('[rerank:download] Đang tải tokenizer…');
  const tokenizer = await tf.AutoTokenizer.from_pretrained(modelId);
  console.log('[rerank:download] Đang tải model (ONNX, quantized)…');
  const model = await tf.AutoModelForSequenceClassification.from_pretrained(modelId, {
    quantized: process.env.RAGV2_RERANK_QUANTIZED !== 'false',
  });

  // Chấm thử 1 cặp để chắc chắn model chạy được.
  const inputs = tokenizer(['Đà Nẵng có gì chơi?'], {
    text_pair: ['Bà Nà Hills là khu du lịch nổi tiếng ở Đà Nẵng với Cầu Vàng.'],
    padding: true,
    truncation: true,
    max_length: 512,
  });
  const out = await model(inputs);
  const score = Number((out.logits.data || [])[0]);
  console.log(
    `[rerank:download] OK sau ${((Date.now() - t0) / 1000).toFixed(1)}s — logit thử nghiệm = ${score.toFixed(3)}`,
  );
  process.exit(0);
})().catch((err) => {
  console.error('[rerank:download] LỖI:', err);
  process.exit(1);
});
