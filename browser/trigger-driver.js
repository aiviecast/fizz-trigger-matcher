// trigger-driver.js — kotodama analyzer / ブラウザのグルー例。
// 部分文字列マッチ + suggest 集約 = Almide(wasm)、triggers.json の読込・parse = host。
export async function loadTriggerMatcher(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
  const enc = new TextEncoder(), dec = new TextDecoder();
  const writeBuf = (allocName, s) => { const b = enc.encode(s); const p = ex[allocName](b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
  // rules = triggers.json の rules: [{pattern, suggest:[...]}]
  const setRules = (input, rules) => {
    writeBuf("input_alloc", input);
    writeBuf("patterns_alloc", rules.map((r) => r.pattern).join("\n"));
    writeBuf("suggests_alloc", rules.map((r) => r.suggest.join(",")).join("\n"));
  };
  return {
    // input にマッチしたルールの suggest を初出順・重複排除で返す(推奨 transform の prior)。
    select(input, rules) {
      setRules(input, rules);
      const len = ex.select_resolve(); const p = ex.out_ptr();
      const s = dec.decode(new Uint8Array(ex.memory.buffer, Number(p), Number(len)));
      return s === "" ? [] : s.split("\n");
    },
    countMatching(input, rules) { setRules(input, rules); return ex.count_matching(); },
    hasSuggestion(input, rules) { setRules(input, rules); return ex.has_suggestion() === 1; },
  };
}
