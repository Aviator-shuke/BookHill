# Review Cases

[analysis-cases.json](analysis-cases.json) contains the runnable examples and their
source sentences. Each example carries schema and convention versions. These are
original project fixtures, not textbook quotations or claims of model performance.

## What each case checks

| Case | Linguistic review |
| --- | --- |
| predicate-and-np | Predicate contains verb and object; an NP retains the nominal layer for its internal modifier. |
| content-clause | A selected declarative content clause is a Complement, with its own subject, predicate, and predicative complement. |
| subject-predication / object-predication | Predicative Complement has the same role in both; the note identifies its orientation. |
| licensed-pp | The preposition phrase is licensed by rely; its internal NP complements on. |
| repeated-occurrences | Identical names must map to their own source positions. |
| noncontiguous-limit | Partial status explicitly records a limitation; no invented continuous Did repair constituent. |

## Additional linguistic review

- `Autonomous ride hailing is being treated as a repeat consumer service with recurring revenue.`:
  the Predicate covers `is being treated as a repeat consumer service with recurring revenue.`.
  Check auxiliary complementation and attachment, rather than asserting that the
  three-word verb string alone is the Predicate. The as-phrase complements the
  treatment construction; the with-phrase can modify service. Verify disputed
  details instead of inheriting the old JSON's labels.
- `Maya spoke quietly.`: quietly is an adjunct in the VP; being optional alone
  would not establish that relation.
- `The letter was delivered.`: the subject is not the action's agent. A passive
  participle is not automatically an adjective or a predicative complement.
- `I left before Maya arrived.`: the reference framework treats before as a
  preposition taking a clausal complement; do not mechanically reproduce the old
  subordinating-conjunction analysis.
- `She saw the man with a telescope.`: distinguish NP modification from a VP
  adjunct. State an alternative reading without assigning both parents at once.
- `The claim that Maya left surprised us.` versus
  `The book that Maya read surprised us.`: content-clause complementation and
  relative modification differ; that does not make both clauses the same category.
- `Close the window.`: no fabricated you node.
- `We're ready.`: retain the contraction; use partial status if its source spans
  cannot be represented faithfully, rather than rewriting it as We are.
- Coordination, supplements, displaced dependents, fused functions, and fragmentary
  input need case-specific evidence. Do not claim this fixture set covers all English.

## Validation

From the skill folder run:

```sh
node --test scripts/check-skill.test.js
```

The tests check schema, source coverage, ordered non-overlapping occurrences,
parent validity, and generated prompt round trips. They also exercise invalid
variants to verify that the validator rejects them. Passing these tests is not a
linguistic evaluation of an API model. Do not make paid evaluation calls implicitly.
