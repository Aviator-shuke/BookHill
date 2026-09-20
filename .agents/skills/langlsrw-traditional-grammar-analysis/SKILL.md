---
name: langlsrw-traditional-grammar-analysis
description: "使用传统英语教学语法分析英文句子，生成保留原文的层级 JSON。适用于 langLSRW 当前的句子成分分析、提示词维护和网页运行时生成；不用于 SIEG2/CGEL 分析、语义分块或文章生成。"
---

# langLSRW Traditional Grammar Analysis

Use traditional English teaching grammar as the active framework. Determine each
constituent's function first, then use `type` for its phrase, clause, word-form, or
other structural category. Where analyses differ, prefer the treatment more common
in English-learning materials and clearer to beginners, and apply it consistently.

For sentence analysis, follow [the runtime contract](references/grammar-prompt.txt)
and return only its JSON object. English is authoritative; an optional reference
translation may assist understanding but cannot add or replace source content.

Do not mix SIEG2/CGEL functions or labels into a traditional analysis. Keep source
coverage, parent-child containment, outer pattern, and explanations consistent.
Use `status=partial` when the continuous-span representation cannot express a
structure faithfully.

For maintenance requests, normal prose is allowed. Keep the browser prompt in the
reference file and regenerate the web artifact instead of duplicating prompt text
inside application code:

```sh
node .agents/skills/langlsrw-traditional-grammar-analysis/scripts/build-web-prompt.js
node .agents/skills/langlsrw-traditional-grammar-analysis/scripts/build-web-prompt.js --check
```

The generated browser artifact is the only grammar prompt enabled in the current
langLSRW app. Generating it does not authorize deployment or an AI API call.
