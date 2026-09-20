# Analysis Convention

Convention: `sieg2-cgel/1`. Data schema: `2`.

## Authority and scope

Primary reference: Huddleston, Pullum, and Reynolds, *A Student's Introduction to
English Grammar*, second edition. Consult CGEL for detailed treatment in the same
framework. Other frameworks may offer defensible analyses but are not silent
fallbacks when a label is inconvenient.

- [Authors' SIEG2 resource page](https://pullum.ppls.ed.ac.uk/SIEG/)
- [Huddleston's framework overview](https://pullum.ppls.ed.ac.uk/grammar/overview.html):
  sections 4-5 (phrases and functions), 6 (verbs), 7 (noun phrases), 10
  (prepositions), 13 (subordination), and 14 (coordination).
- [CGEL contents](https://www.cambridge.org/features/linguistics/cgel/contents.htm)

The Chinese labels and JSON representation below are project conventions, not
official translations or a complete machine encoding of the books. The overview
supports the broad distinctions; consult the books for unresolved constructions.
Do not attribute an unverified example or page reference to their authors.

## Function and category

`role` identifies function in the containing structure. `type` identifies category.
`note` explains attachment or subtype. Meaning alone is not a function test: a
subject may denote an agent, experiencer, or affected entity.

| role | Reference term | Project use |
| --- | --- | --- |
| 主语 | Subject | Determine by syntax, not an action-doer definition. |
| 谓语 | Predicate | The clause's VP, including dependents; not just a verb string. |
| 中心语 | Head / Predicator | Head of a phrase; note Predicator for a predicate VP's head verb. |
| 宾语 | Object | Use where supported; distinguish direct/indirect in the note. |
| 述语补足语 | Predicative Complement | Note whether subject- or object-oriented. |
| 补足语 | Complement | Broader function, including licensed PP/clausal dependents. |
| 修饰语 | Modifier | Identify the modified constituent. |
| 附加语 | Adjunct | Identify attachment; time/manner/etc. goes in the note. |
| 限定语 | Determiner | Function, distinct from the lexical category determinative. |
| 标记语 | Marker | E.g. a subordinator or coordinator marking a construction. |
| 并列项 | Coordinate | An item in a coordination. |
| 补充语 | Supplement | Distinguish from integrated modification. |
| 未定 | Unresolved | Serialization fallback, not a grammatical function; requires partial status. |

Illustrative types: 名词短语, 动词短语, 介词短语, 形容词短语,
副词短语, 名词性结构 (nominal), 内容分句, 关系分句, 非限定分句,
名词, 动词, 形容词, 副词, 介词, 限定词, 并列连词, 从属标记词.
Do not use 主语补语, 受事, 被动谓语, or 修饰service as a category.
Types are not frozen to this list; choose a reference-supported category.

## Boundaries and legacy differences

- Represent a canonical declarative as Subject + Predicate. In `Maya repaired the
  radio.`, the Predicate is `repaired the radio.`, containing its head and object.
  The old flat S + verb-string + object convention is legacy. `pattern` summarizes
  the outer structure; it may briefly describe the Predicate's internal pattern.
- In `Maya is calm.`, `calm` is a subject-oriented Predicative Complement.
  Object-oriented predication uses the same function with its orientation noted.
  The legacy 表语 versus narrow 补语 split is not the new classification.
- Use the head's licensing and construction to distinguish complement from
  adjunct. Optionality alone is insufficient: a complement can be optional.
  A PP is not automatically an adjunct; a following clause is not automatically
  an object. Declarative content clauses selected by verbs use Complement here.
- A PP has a preposition head and may have a complement. Use the broad label
  补足语 for that dependent, noting the governing preposition. Do not imply the
  legacy term 介词宾语 is an exact mapping across frameworks.
- Auxiliary chains require care: preserve the full Predicate's scope. Do not
  invent a head constituent `is being treated` excluding its dependents. Explain
  tense/voice and expand only supported internal structure. Category judgments
  for -ing forms and traditional conjunctions need syntactic evidence.
- Keep useful internal structure and intermediate groups wherever omission
  would change the asserted head, complement, or modifier relationship. A clause
  is a category, not a role. Distinguish content and relative clauses.
- For ambiguous attachment, show one supported tree and explain the alternative.
  Do not combine incompatible readings in one tree or silently invent context.

## Representation limits

Schema 2 retains the app's contiguous-text tree. Each node is an exact source
substring; siblings refer to disjoint occurrences. Roots in source order cover
the entire sentence, apart from original whitespace between nodes. Punctuation
stays with adjacent text for serialization, not as a grammatical category claim.

This cannot faithfully encode every discontinuous constituent. Do not reorder
words or call a fragment a complete Predicate. For `Did Maya repair it?`, use
`status=partial`, one full-sentence root with `role=未定, type=疑问分句`, and
supported continuous children. Explain inversion and the missing discontinuous
relation. Explicit span/link support belongs in a future schema, not an invented
field. Treat other representation/evidence limits the same way.

`complete` means coherent at the chosen granularity, not that every word has a
node. A complete tree for one acknowledged ambiguous reading can still use
`complete`; a partial result needs an explanation of its actual limitation.

## Version and integration

Required top-level fields: `schemaVersion`, `convention`, `status`, `pattern`,
`nodes`, `explanation`. Required node fields: `id`, `text`, `role`, `type`,
`parent`, `note`. The compact API contract is `grammar-prompt.txt`.

Store versions inside analysis JSON so cache/export preserve them. Missing
provenance stays legacy; unknown versions stay unknown. Read old roles and chunks
without reinterpretation, relabelling, deletion, or automatic paid reanalysis.
The version identifies the requested convention, not external certification.
Offline validation establishes structural consistency, not linguistic truth.
