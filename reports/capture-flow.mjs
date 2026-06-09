// 액션 시퀀스 실행 후 캡처 + 주석(mark)
// 사용법: node capture-flow.mjs <flow.json>
// flow.json: {
//   url, out,
//   actions: [ {type:'click'|'dblclick'|'fill'|'hover'|'wait', selector?, value?, ms?} ],
//   annotations?: { title, marks:[{selector,label,color?}] }
// }
import { chromium } from "playwright";
import fs from "node:fs";

const cfgPath = process.argv[2];
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 760 }, deviceScaleFactor: 2 });
await page.goto(cfg.url, { waitUntil: "networkidle" });
await page.waitForTimeout(400);

for (const a of cfg.actions || []) {
  if (a.type === "wait") { await page.waitForTimeout(a.ms || 300); continue; }
  const el = page.locator(a.selector).first();
  if (a.type === "click") await el.click();
  else if (a.type === "dblclick") await el.dblclick();
  else if (a.type === "fill") await el.fill(a.value);
  else if (a.type === "hover") await el.hover();
  await page.waitForTimeout(a.ms || 250);
}

const ann = cfg.annotations;
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
      const box = document.createElement("div");
      box.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;border:3px solid ${color};border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.6);`;
      layer.appendChild(box);
      const badge = document.createElement("div");
      badge.textContent = String(i + 1);
      badge.style.cssText = `position:fixed;left:${r.left - 18}px;top:${r.top - 18}px;width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:bold 15px system-ui;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.4);`;
      layer.appendChild(badge);
    });
    const legend = document.createElement("div");
    legend.style.cssText = "position:fixed;right:12px;bottom:12px;max-width:330px;background:rgba(20,20,28,.92);color:#fff;font:13px system-ui;border-radius:10px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.35);";
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

await page.screenshot({ path: cfg.out, fullPage: true });
await browser.close();
console.log("saved:", cfg.out);
