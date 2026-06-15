# fizz-trigger-matcher

kotodama の **入力パターン → 推奨 transform(prior)選択エンジン**。Almide 1 コアを native + wasm へ。
openaituber `kotodama/personae/*/triggers.json` の照合ロジックを切り出した単一責任部品(§10)。

入力文に対して persona の triggers(`pattern → suggest[]`)を**部分文字列マッチ**で照合し、
発火したルールの suggest を**初出順・重複排除**で集めて返す。triggers.json の comment 仕様
「pattern は単純な部分文字列マッチで照合」に忠実。

ルールは**ペルソナ別データ**なので埋め込まず、`patterns` / `suggests` の並行リストで受け取る
(= 再利用可能なエンジン)。

## API

| 関数 | 説明 |
|---|---|
| `matches(input, pattern)` | 部分文字列マッチ(1 ルールの照合) |
| `count_matching(input, patterns)` | マッチしたパターン数 |
| `matching_indices(input, patterns)` | マッチしたパターンの index 列 |
| `select(input, patterns, suggests)` | 発火ルールの suggest を初出順・重複排除で返す(推奨 transform) |
| `has_suggestion(input, patterns)` | 推奨が 1 つでもあるか |

`suggests[i]` は `"a,b,c"` のカンマ区切りで `patterns[i]` と対応。

## wasm 境界

host が 3 バッファに書く: 入力文 / パターン(改行区切り)/ suggest(改行区切り・各行カンマ区切り)。
各バッファは `from_list(to_list)` コピー経由で文字列化(almide#690 回避)。結果は `out_ptr` で読む。
例: [`browser/trigger-driver.js`](browser/trigger-driver.js)。

下流の [fizz-response-transformer](https://github.com/Aid-On/fizz-response-transformer) が、この出力(候補)から
weight で実際に適用する transform を選ぶ。

## ビルド / テスト

```sh
almide test spec/trigger_matcher_test.almd
almide build src/main.almd -o build/fizz-trigger-matcher
almide build src/bridge.almd --target wasm -o build/tm.wasm
node test/wasm-smoke.mjs
```

Almide v0.27.7 で native / wasm とも green。
