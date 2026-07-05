# noun

## Parent type

nominal.

## Description

Noun category subtype with English case.

## Licensed features

| Feature | Expected value |
| --- | --- |
| SELECT | sign-or-none |
| XARG | sign-or-none |
| LID | list(frame) |
| CASE | case |

## Example JSON

```json
{
  "type": "noun",
  "features": [
    { "name": "CASE", "value": { "kind": "atomic", "value": "nom" } }
  ]
}
```

## Notes

`CASE` is an atomic dropdown value supplied by the registry. Noun CAT values do not license verbal features such as `VF`, `IC`, `AUX`, or `INV`.
