# syn-obj

## Parent type

object.

## Description

Syntax object containing category, valence, marking, and optional nonlocal information.
`CAT`, `VAL`, `MRKG`, `GAP`, `WH`, and `REL` are parallel features of the syntax object. The initial scaffold shows `CAT`, `VAL`, and `MRKG`; `GAP`, `WH`, and `REL` remain licensed Add Feature options.

## Licensed features

| Feature | Expected value |
| --- | --- |
| CAT | category |
| VAL | list(expression) |
| MRKG | mark |
| GAP | list(expression) |
| WH | set(expression) |
| REL | set(expression) |

## Example JSON

```json
{
  "type": "syn-obj",
  "features": [
    { "name": "CAT", "value": { "kind": "feature-structure", "structure": { "type": "category", "features": [] } } }
  ]
}
```

## Notes

Selecting `CAT` automatically creates a typed category value. The category subtype is represented by the nested object's type label, such as `verb` or `noun`; no separate `HEAD` feature is needed. `GAP`, `WH`, and `REL` are optional nonlocal syntax features.
