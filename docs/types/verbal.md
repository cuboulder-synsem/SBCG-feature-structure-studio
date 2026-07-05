# verbal

## Parent type

category.

## Description

Verbal category supertype.

## Licensed features

| Feature | Expected value |
| --- | --- |
| SELECT | sign-or-none |
| XARG | sign-or-none |
| LID | list(frame) |
| VF | vform |
| IC | boolean |

## Example JSON

```json
{
  "type": "verbal",
  "features": [
    { "name": "VF", "value": { "kind": "atomic", "value": "fin" } }
  ]
}
```

## Notes

`VF` and `IC` are atomic values rendered from registry-defined dropdowns. Verbal CAT values inherit `SELECT`, `XARG`, and `LID` from `category`.
