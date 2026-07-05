# verb

## Parent type

verbal.

## Description

Verb category subtype.

## Licensed features

| Feature | Expected value |
| --- | --- |
| SELECT | sign-or-none |
| XARG | sign-or-none |
| LID | list(frame) |
| VF | vform |
| IC | boolean |
| AUX | boolean |
| INV | boolean |

## Example JSON

```json
{
  "type": "verb",
  "features": [
    { "name": "VF", "value": { "kind": "atomic", "value": "fin" } },
    { "name": "AUX", "value": { "kind": "atomic", "value": "-" } }
  ]
}
```

## Notes

The editor obtains inherited category and verbal features from the type registry. `AUX` and `INV` are appropriate for `verb`, not for `noun`.
