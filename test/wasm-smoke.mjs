import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/tm.wasm", import.meta.url)));
const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
const enc = new TextEncoder(), dec = new TextDecoder();
const writeBuf = (allocName, s) => { const b = enc.encode(s); const p = ex[allocName](b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
const setAll = (input, patterns, suggests) => { writeBuf("input_alloc", input); writeBuf("patterns_alloc", patterns.join("\n")); writeBuf("suggests_alloc", suggests.join("\n")); };
const select = () => { const len = ex.select_resolve(); const p = ex.out_ptr(); const s = dec.decode(new Uint8Array(ex.memory.buffer, Number(p), Number(len))); return s === "" ? [] : s.split("\n"); };
let ok = true; const ck = (c, m) => { if (!c) { console.error("FAIL " + m); ok = false; } };

const patterns = ["教えて", "おすすめ", "好き", "AI", "天気", "疲れた"];
const suggests = ["list-parody,face-value-with-stamp", "list-parody", "meta-ai-tease,list-parody", "meta-ai-tease", "direct", "callback-world-asset,direct"];

setAll("好きな AI のおすすめ教えて", patterns, suggests);
ck(ex.count_matching() === 4, "count 4");
ck(ex.has_suggestion() === 1, "has suggestion");
ck(select().join("|") === "list-parody|face-value-with-stamp|meta-ai-tease", "select dedup: " + select().join("|"));

setAll("疲れたなあ", patterns, suggests);
ck(select().join("|") === "callback-world-asset|direct", "single match");

setAll("こんにちは", patterns, suggests);
ck(ex.count_matching() === 0 && ex.has_suggestion() === 0, "no match");
ck(select().length === 0, "no suggestions");

// 多重読み: 同じ入力で select を複数回 + count を挟んでもバッファ健在 (almide#690)
setAll("天気おしえて", patterns, suggests);
const a = select().join("|"); ex.count_matching(); const b = select().join("|");
ck(a === "direct" && a === b, "multi-read select stable");

console.log(ok ? "wasm OK — trigger matching + suggestion priors match native" : "FAIL"); if (!ok) process.exit(1);
