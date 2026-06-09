// 캡처 + 주석(mark) 파이프라인
// 사용법: node capture.mjs <url> <out.png> [annotations.json]
// annotations.json: { title?: string, marks: [{ selector, label, color? }] }
import { chromium } from "playwright";
import fs from "node:fs";

const [, , url, out, annPath] = process.argv;
if (!url || !out) {
  console.error("usage: node capture.mjs <url> <out.png> [annotations.json]");
  process.exit(1);
}

const ann = annPath && fs.existsSync(annPath)
  ? JSON.parse(fs.readFileSync(annPath, "utf8"))
  : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 760 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

if (ann && Array.isArray(ann.marks)) {
  await page.evaluate((cfg) => {
    const palette = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#008080", "#9a6324", "#800000"];
    const layer = document.createElement("div");
    layer.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none;";
    document.body.appendChild(layer);
    cfg.marks.forEach((m, i) => {
      const el = document.querySelector(m.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const color = m.color || palette[i % palette.length];
      // 강조 박스
      const box = document.createElement("div");
      box.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:3px solid ${color};border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.6);`;
      layer.appendChild(box);
      // 번호 배지
      const badge = document.createElement("div");
      badge.textContent = String(i + 1);
      badge.style.cssText = `position:fixed;left:${r.left - 18}px;top:${r.top - 18}px;width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:bold 15px system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4);`;
      layer.appendChild(badge);
    });
    // 범례
    const legend = document.createElement("div");
    legend.style.cssText = "position:fixed;right:12px;bottom:12px;max-width:320px;background:rgba(20,20,28,.92);color:#fff;font:13px system-ui;border-radius:10px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.35);";
    const t = document.createElement("div");
    t.textContent = cfg.title || "주요 기능";
    t.style.cssText = "font-weight:700;margin-bottom:8px;font-size:14px;";
    legend.appendChild(t);
    cfg.marks.forEach((m, i) => {
      const color = m.color || palette[i % palette.length];
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:flex-start;gap:8px;margin:5px 0;line-height:1.35;";
      row.innerHTML = `<span style="flex:none;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font:bold 12px system-ui;display:inline-flex;align-items:center;justify-content:center;">${i + 1}</span><span>${m.label}</span>`;
      legend.appendChild(row);
    });
    document.body.appendChild(legend);
  }, ann);
  await page.waitForTimeout(300);
}

await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved:", out);
