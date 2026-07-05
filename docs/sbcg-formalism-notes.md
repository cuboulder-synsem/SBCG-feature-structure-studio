# SBCG Formalism Notes For Inference

These notes summarize the parts of Sag (2012), *Sign-Based Construction Grammar: An Informal Synopsis*, used by Feature Structure Studio's first SBCG-aware inference layer.

The goal is not to make the app guess lexical content. The app should infer the formal scaffolding that follows from a typed feature-structure signature: appropriate features, inherited feature domains, and expected value shapes. In implementation terms, Sag's grammar signature is the schema layer consulted by the editor.

## Core Modeling Commitments

Sag treats the grammar signature as the place where the ontology of the grammar is declared. A type declaration associates a feature-structure type with a domain of features and assigns each feature an appropriate value type. This is the central design pattern for the inference layer: type names determine feature suggestions.

SBCG distinguishes:

- **Signs**: linguistic objects such as words and phrases.
- **Constructs**: local mother-daughter trees licensed by combinatoric constructions.
- **Listemes and constructions**: grammar-side descriptions that license classes of signs or constructs.

The app therefore separates three things:

- the user's structured JSON feature structure
- the SBCG schema that suggests appropriate features
- the LaTeX exporter that renders the result

## Sign Geometry

Sag's sign synthesis gives the core sign features:

- `PHON : phon-obj`
- `FORM : morph-obj`
- `SYN : syn-obj`
- `SEM : sem-obj`
- `CNTXT : context-obj`

For the app, the Section 3 `sign` schema fills these five features, with values left underspecified or structurally shaped. `PHON` and `FORM` are represented as empty lists in the MVP because Sag treats their internal details as mostly outside the chapter's focus.

## Lexical Signs, Words, Lexemes, And Phrases

Sag's hierarchy makes `lex-sign` a subtype of `sign` with:

- `ARG-ST : list(expression)`

`word` inherits both expression properties and lexical-sign properties. So typing `word` and invoking inference fills the sign features plus `ARG-ST`. `phrase` inherits sign/expression properties but does not add `ARG-ST`.

The app does not fill `ARG-ST` with `NP` values automatically. Sag uses examples such as intransitive, transitive, and ditransitive verbal lexeme classes, but those are lexical-class constraints and must be selected or supplied by the user or a future lexical-class preset.

## Syntax Object Geometry

Sag defines `SYN` as a `syn-obj`. Section 3 introduces three core features for the initial scaffold:

- `CAT : category`
- `VAL : list(expression)`
- `MRKG : mark`

So typing `SYN` or `SYNTAX` into a blank feature row infers a nested `syn-obj` AVM with those features. `GAP`, `WH`, and `REL` are also licensed sibling features of `syn-obj`, but they remain optional Add Feature choices so the default view stays compact.

## Category Geometry

Sag treats `CAT` values as feature structures of type `category` and gives category subtypes such as `verbal`, `verb`, `complementizer`, `nonverbal`, `nominal`, `noun`, `prep`, `adj`, and `adv`.

The app currently models:

- `category`: `SELECT`, `XARG`, `LID`
- `verbal`: inherits `category`, adds `VF`, `IC`
- `verb`: inherits `verbal`, adds `AUX`, `INV`
- `noun`: inherits `nominal`, adds `CASE`

This lets users type `verb` or `noun` directly as the type of the `CAT` value. The type label in the upper-left of that feature structure is the head/category subtype; the app does not add a separate `HEAD` feature for this. Retargeting a CAT value prunes stale schema-known features that are no longer appropriate, so changing `verb` to `noun` keeps `SELECT`, `XARG`, `LID`, and `CASE`, but removes `VF`, `IC`, `AUX`, and `INV`. User-created custom feature names that are not part of the schema are preserved.

## Semantics Geometry

Sag's `SEM` object is flat rather than recursively embedded in the ordinary semantic-composition sense. Section 3 gives:

- `INDEX : index`
- `LTOP : label`
- `FRAMES : list(frame)`

So typing `SEM` or `SEMANTICS` into a blank feature row infers a nested `sem-obj` with those features. `FRAMES` remains an empty list until the user supplies frame information. The shorter `IND` spelling appears in examples and appendices, so the app accepts it as an alias of `INDEX`.

## Context Geometry

Sag's Section 3 context object includes:

- `C-INDS : contextual-index`
- `BCKGRND : list(proposition)`

`C-INDS` expands to:

- `SPKR : index`
- `ADDR : index`
- `UTT-LOC : index`

## Constructs

Sag models constructs as local trees:

- `MTR : sign`
- `DTRS : nelist(sign)`
- `CXT-CONTENT : list(frame)`

The app can suggest these fields for a `construct`. It currently represents `DTRS` as an empty list placeholder, even though the formal value type is nonempty, because creating actual daughter signs would be contentful and should be user-driven.

## MVP Inference Boundary

The inference layer may add:

- missing features appropriate to a type
- inherited features from supertypes
- nested AVMs for known feature value types
- empty lists or underspecified placeholders for expected list/set/value positions

The editor always permits a custom feature as an escape hatch. Custom features are not treated as licensed by Sag's signature, but they are useful for exploratory analysis, local extensions, and future schema growth.

The inference layer must not guess:

- concrete argument values such as `NP`
- lexical identifiers or frames
- actual `PHON` or `FORM` content
- semantic indices, labels, or role fillers
- construction-specific daughter configurations

This boundary keeps the app useful without quietly pretending to know lexical or constructional commitments that Sag's formalism leaves to listemes, lexical-class constructions, and combinatoric constructions.
