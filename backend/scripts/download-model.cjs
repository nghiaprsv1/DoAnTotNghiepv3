/**
 * Tải model GGUF cho LLM local (node-llama-cpp). Chạy 1 lần:
 *   npm run model:download
 *
 * Mặc định: Qwen2.5-3B-Instruct Q4_K_M (~2GB) — hợp RTX 2050 4GB VRAM.
 * Đổi model qua env LLM_MODEL_URL + LLM_MODEL_FILE nếu muốn bản khác
 * (vd Qwen2.5-1.5B cho máy yếu hơn).
 *
 * File lưu tại backend/models/. Hoàn toàn offline sau khi tải xong.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, '..', 'models');

const MODEL_URL =
  process.env.LLM_MODEL_URL ||
  'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf';
const MODEL_FILE = process.env.LLM_MODEL_FILE || 'qwen2.5-3b-instruct-q4_k_m.gguf';

const dest = path.join(MODELS_DIR, MODEL_FILE);

function download(url, file, redirects = 0) {
  if (redirects > 5) {
    console.error('Quá nhiều redirect, dừng.');
    process.exit(1);
  }
  https
    .get(url, (res) => {
      // Theo redirect (HuggingFace trả 302 sang CDN).
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(res.headers.location, file, redirects + 1);
      }
      if (res.statusCode !== 200) {
        console.error(`HTTP ${res.statusCode} khi tải model.`);
        process.exit(1);
      }
      const total = Number(res.headers['content-length'] || 0);
      let received = 0;
      let lastPct = -1;
      const out = fs.createWriteStream(file);
      res.on('data', (chunk) => {
        received += chunk.length;
        if (total) {
          const pct = Math.floor((received / total) * 100);
          if (pct !== lastPct && pct % 2 === 0) {
            lastPct = pct;
            const mb = (received / 1048576).toFixed(0);
            const totalMb = (total / 1048576).toFixed(0);
            process.stdout.write(`\rĐang tải: ${pct}% (${mb}/${totalMb} MB)`);
          }
        }
      });
      res.pipe(out);
      out.on('finish', () => {
        out.close();
        process.stdout.write('\n');
        console.log(`✓ Đã tải xong: ${file}`);
      });
    })
    .on('error', (err) => {
      console.error('Lỗi tải:', err.message);
      fs.unlink(file, () => undefined);
      process.exit(1);
    });
}

if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

if (fs.existsSync(dest)) {
  const sizeMb = (fs.statSync(dest).size / 1048576).toFixed(0);
  console.log(`Model đã có sẵn (${sizeMb} MB): ${dest}`);
  console.log('Xoá file này nếu muốn tải lại.');
  process.exit(0);
}

console.log(`Tải model về: ${dest}`);
console.log(`Nguồn: ${MODEL_URL}`);
download(MODEL_URL, dest);
