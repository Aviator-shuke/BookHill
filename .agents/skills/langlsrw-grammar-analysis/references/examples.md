# Review Cases

These cases illustrate the output contract and common failure modes. They are
not a claim that a provider or model has passed an evaluation.

## Internal modifier

Input: `The experienced engineer fixed the problem.`

```json
{
  "pattern": "主语 + 谓语 + 宾语",
  "nodes": [
    {"id": 1, "text": "The experienced engineer", "role": "主语", "parent": 0, "note": "动作执行者"},
    {"id": 2, "text": "experienced", "role": "定语", "parent": 1, "note": "修饰 engineer"},
    {"id": 3, "text": "fixed", "role": "谓语", "parent": 0, "note": "一般过去时"},
    {"id": 4, "text": "the problem.", "role": "宾语", "parent": 0, "note": "fixed 的宾语"}
  ],
  "explanation": ["experienced 是主语内部的定语。", "fixed 是谓语动词的过去式。"]
}
```

The internal adjective must not become a root alongside the whole subject.
The root texts cover the source exactly when separated by the original spaces.

## Clause function and internal structure

Input: `I know that she is ready.`

```json
{
  "pattern": "主语 + 谓语 + 宾语",
  "nodes": [
    {"id": 1, "text": "I", "role": "主语", "parent": 0, "note": ""},
    {"id": 2, "text": "know", "role": "谓语", "parent": 0, "note": ""},
    {"id": 3, "text": "that she is ready.", "role": "宾语", "type": "宾语从句", "parent": 0, "note": "作 know 的宾语"},
    {"id": 4, "text": "that", "role": "其他", "type": "从属连词", "parent": 3, "note": "引导宾语从句"},
    {"id": 5, "text": "she", "role": "主语", "parent": 3, "note": "从句主语"},
    {"id": 6, "text": "is", "role": "谓语", "parent": 3, "note": "系动词"},
    {"id": 7, "text": "ready.", "role": "表语", "parent": 3, "note": "说明 she 的状态"}
  ],
  "explanation": ["that 引导的从句作 know 的宾语。", "从句中的 is 与 ready 构成系表结构。"]
}
```

The pattern and role express the clause's outer function (宾语); type records
its structure (宾语从句). Do not duplicate its span as an additional sibling.
The clause's own subject, predicate, and predicative remain visible inside it.

## Passive predicate and nested prepositional phrases

Input: `Autonomous ride hailing is being treated as a repeat consumer service with recurring revenue.`

```json
{
  "pattern": "主语 + 谓语 + 补语",
  "nodes": [
    {"id": 1, "text": "Autonomous ride hailing", "role": "主语", "type": "名词短语", "parent": 0, "note": ""},
    {"id": 2, "text": "Autonomous", "role": "定语", "parent": 1, "note": "修饰 ride hailing"},
    {"id": 3, "text": "is being treated", "role": "谓语", "parent": 0, "note": "现在进行时的被动语态"},
    {"id": 4, "text": "as a repeat consumer service with recurring revenue.", "role": "补语", "type": "介词短语", "parent": 0, "note": "补充说明主语的类别"},
    {"id": 5, "text": "a repeat consumer service with recurring revenue.", "role": "宾语", "type": "名词短语", "parent": 4, "note": "as 的介词宾语"},
    {"id": 6, "text": "repeat", "role": "定语", "parent": 5, "note": "修饰 service"},
    {"id": 7, "text": "consumer", "role": "定语", "parent": 5, "note": "名词修饰 service"},
    {"id": 8, "text": "with recurring revenue.", "role": "定语", "type": "介词短语", "parent": 5, "note": "修饰 service"},
    {"id": 9, "text": "recurring revenue.", "role": "宾语", "type": "名词短语", "parent": 8, "note": "with 的介词宾语"},
    {"id": 10, "text": "recurring", "role": "定语", "parent": 9, "note": "修饰 revenue"}
  ],
  "explanation": [
    "is being treated 是完整谓语，表示现在进行时的被动语态。",
    "as 引出的补语说明主语被视作的类别；其内部名词短语是介词宾语。",
    "with recurring revenue 修饰 service，recurring 在该短语内部修饰 revenue。"
  ]
}
```

This example follows the skill's teaching convention for the as-complement.
The two prepositional phrases share a structural type but have different roles.
Keep the final full stop. Give the noun phrase inside as its own node when
representing its internal modifiers, and attach recurring to the represented
noun phrase containing revenue. Do not copy this interpretation to unrelated
uses of as or with.

## Further review inputs

| Input | What to check |
| --- | --- |
| They elected him president. / He was elected president. | Distinguish the object complement from the subject complement; do not relabel either as a predicative merely because it describes a person. |
| She is happy. / She is being helped. | Distinguish the predicative adjective from a passive predicate; do not classify every phrase after be as 表语. |
| Did she call you? | Preserve question order and all words. Do not fabricate a continuous Did call span. Explain the relation of the separated predicate parts. |
| The book that I bought yesterday is useful. | Attach the relative clause inside the subject phrase. Do not fabricate an object word after bought to fill the relative gap. |
| They say that that plan works. | Keep both occurrences of that; their positions and grammatical functions differ. |
| Close the door. | Do not invent a you node for the unexpressed imperative subject. |
| We're ready. | Keep the contraction intact; do not replace source text with We are. |
| She saw the man with a telescope. | State a genuine attachment ambiguity briefly instead of inventing context to claim a unique interpretation. |
| She worked very carefully. | The adverbial phrase modifies worked, while very modifies carefully inside that phrase. |
| I stayed home because it was raining. | Mark the reason clause as role=状语 and type=原因状语从句, preserving its internal subject and predicate where useful. |

For each output, check the allowed role set, required field types, unique IDs,
parent-before-child order, child containment, and sibling positions. Root spans
must cover the whole input apart from whitespace between nodes. Optional child
spans need not cover every word of their parent.

New analysis roles are 主语、谓语、宾语、表语、补语、定语、状语、同位语、其他.
The optional type must be a string when present. Test saved results without type
and old roles separately as compatibility cases, not as examples for new output.

An offline structural check cannot establish whether an AI model follows the
prompt or whether every linguistic interpretation is correct.
