// Склейка всех ES-модулей в один worker.js для вставки в веб-редактор Cloudflare.
// Запуск: node build-bundle.mjs  ->  dist/worker.bundle.js
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Порядок = порядок зависимостей (сначала то, на что ссылаются).
const ORDER = [
  "config.js", "content.js", "scheduling.js", "telegram.js",
  "reminders.js", "stats.js", "db.js", "engine.js", "handlers.js", "index.js",
];

const banner = `// АВТОСБОРКА: не редактируй тут — правь src/*.js и пересобирай (node build-bundle.mjs).
// Learning Bot для Cloudflare Workers — единый файл для веб-редактора.
`;

let out = banner + "\n";
for (const name of ORDER) {
  let code = readFileSync(new URL(`./src/${name}`, import.meta.url), "utf8");
  // Убрать все import-стейтменты (в т.ч. многострочные): до первой ';'.
  code = code.replace(/import\s+[^;]*?;/gs, "");
  // Снять 'export ', кроме 'export default' (в index.js).
  code = code.replace(/^export (?!default)/gm, "");
  // Снять неймспейс-префиксы вызовов (db./sched./rem./tg./stats.).
  code = code.replace(/\b(?:db|sched|rem|tg|stats)\./g, "");
  out += `\n// ===== ${name} =====\n` + code.trim() + "\n";
}

// Дедупликация коллизий имён проверяется отдельно (build:check).
mkdirSync(new URL("./dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("./dist/worker.bundle.js", import.meta.url), out);
console.log(`dist/worker.bundle.js готов — ${out.length} байт`);
