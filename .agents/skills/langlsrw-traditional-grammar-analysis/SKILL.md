---
name: langlsrw-traditional-grammar-analysis
description: "使用传统英语教学语法分析英文句子，生成保留原文的层级 JSON。适用于 langLSRW 当前的句子成分分析、提示词维护和网页运行时生成；不用于 SIEG2/CGEL 分析、语义分块或文章生成。"
---

# langLSRW Traditional Grammar Analysis

Use traditional English teaching grammar as the active framework. Determine each
constituent's function first, then use `type` for its phrase, clause, word-form, or
other structural category. Where analyses differ, prefer the treatment more common
in English-learning materials and clearer to beginners, and apply it consistently.

`parent` records structural containment and display hierarchy only; it does not
encode government, dependency, complementation, or modification. `role` describes
the node's function in its containing structure. Clause kind, conjunction class,
part of speech, and inflection belong in `type`. Predicate
means the complete verb chain only; objects, predicatives, complements, and
adverbials are separate constituents rather than parts of the predicate node.
Use only the contract's role enumeration. Put direct/indirect object, object
complement, and prepositional object distinctions in `type`. A complete result must
cover every source word at `parent=0`, and child spans must be strictly smaller than
their parents. A noun phrase governed by a preposition is its object, not the head
of the entire preposition phrase.
Build `pattern` as a learner-facing summary of the main sentence structure, not a
mechanical copy of every `parent=0` role. It may identify important clause boundaries,
coordination, formal subjects, postposed subject clauses, and inversion. Do not infer
tense, modality, or voice from auxiliary shape alone; use the sentence context,
especially when distinguishing future-in-the-past from counterfactual
`would have + past participle`. Every child span must be fully contained in its
nearest enclosing parent span; preserve any intermediate phrase needed for that
containment. Analyze independent adjacent
premodifiers separately, while allowing a fixed expression or genuinely unified
compound modifier to remain one node.
In copular structures, keep the copular verb as the predicate and the predicative
as a separate sibling constituent. Prefer object analysis for infinitival or
gerund-participial structures that directly express a verb's content object;
reserve complement for descriptions of an object's identity, state, quality, or
result. Every child span must occur inside its direct parent span.

For sentence analysis, follow [the runtime contract](references/grammar-prompt.txt)
and return only its JSON object. English is authoritative; an optional reference
translation may assist understanding but cannot add or replace source content.

Do not mix SIEG2/CGEL functions or labels into a traditional analysis. Keep source
coverage, structural containment, learner-facing pattern, and explanations consistent.
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
