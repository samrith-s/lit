# Lit

Type-safe tagged template literals for TypeScript. Declare slot names and types inline, get compile-time checking and a small runtime renderer — no separate schema file.

```ts
import { lit } from "@samrith/lit";

const greet = lit`Hello, ${"name"}! You are ${"age?:number=18"} years old.`;

greet({ name: "Ada" });
// => "Hello, Ada! You are 18 years old."

greet({ name: "Ada", age: 42 });
// => "Hello, Ada! You are 42 years old."
```

## Install

```bash
bun add @samrith/lit
```

Or copy [`lit.js`](./dist/lit.js) into your project — the library is a single file with no runtime dependencies.

## Why Lit?

String templates often mix static text with dynamic values. Common approaches leave gaps:

- **Plain template literals** — no named parameters, no reuse, no validation.
- **Separate schemas** — types and defaults live far from the string they describe.
- **Untyped helpers** — easy to pass the wrong key or type at runtime.

Lit keeps the template and its contract in one place. Slot specs like `"name"` or `"name:string"` sit in the template literal; TypeScript infers the parameter object; optional slots and defaults are first-class.

## Quick start

```ts
import { lit } from "@samrith/lit";

// Required string slot (type omitted → string)
const title = lit`Issue #${"id:number"}: ${"title"}`;
title({ id: 42, title: "Fix the build" });
// => "Issue #42: Fix the build"

// Optional string slot (omitted → empty string)
const line = lit`Status: ${"status?:"}`;
line({});
// => "Status: "

// Optional slot with default
const meta = lit`Version ${"version?:=0.0.0"}`;
meta({});
// => "Version 0.0.0"
```

## Slot syntax

Place slot descriptors in `${...}` inside a `lit` tagged template. Each descriptor is a string with this shape:

| Form              | Meaning                               |
| ----------------- | ------------------------------------- |
| `name`            | Required string (type omitted)        |
| `name?:`          | Optional string (type omitted)        |
| `name?:=default`  | Optional string with default          |
| `name:string`     | Required string                       |
| `name:number`     | Required number                       |
| `name:boolean`    | Required boolean                      |
| `name?:string`    | Optional; `undefined` / `null` → `""` |
| `name?:number=42` | Optional with default when missing    |

**Rules:**

- Omit the type to default to `string` — use `name` or `name?:` instead of `name:string` / `name?:string`.
- When a type is given, it must be exactly `string`, `number`, or `boolean`.
- Defaults require the optional marker: `name?:=default` or `name?:type=default` (not `name:type=default`).
- Default literals are parsed at template definition time (`true` / `false` for booleans, numeric literals for numbers, raw text for strings).

Invalid specs throw when the template is created:

```ts
lit`${"name:object"}`; // Error: invalid type
lit`${"name:string=hi"}`; // Error: default without ?
lit`${"name?:number=hi"}`; // Error: invalid number default
```

## API

### `lit(strings, ...slots)`

Tagged template function. Returns a renderer function (and supports nesting — see below).

```ts
const template = lit`Hello ${"name"}!`;

// Call with parameters
template({ name: "World" }); // "Hello World!"
```

**Parameter typing:** If every slot is optional (or the template has no slots), the renderer accepts an optional argument. If any slot is required, the argument is required and TypeScript lists the exact keys.

Exported type for the return value:

```ts
import type { LitFn } from "@samrith/lit";

const fn: LitFn<{ name: string }> = lit`${"name"}`;
```

### Nested templates

Another `lit` template can be used as a slot value. Nested templates share the parent’s parameter object.

```ts
const emphasis = lit`<strong>${"text:string"}</strong>`;
const card = lit`<div>${emphasis} — ${"label:string"}</div>`;

card({ text: "Hi", label: "Note" });
// => "<div><strong>Hi</strong> — Note</div>"
```

Nested renderers receive the same `params` object as the outer template, so keys must not collide unless you intend to reuse a value.

## Behavior

### Rendering

1. Static string segments are concatenated in order.
2. Each slot is resolved from the params object:
   - **Required / present value** — coerced with `String(value)`.
   - **`undefined` or `null` on optional slot** — default if set, otherwise `""`.
3. Nested `lit` functions run with the same params.

### Type inference

Lit merges parameters from all slots in a template (and from nested templates) into one object type:

- Required keys must be supplied when calling the renderer.
- Optional keys may be omitted or set to `null`.
- Invalid slot strings are rejected at compile time via `ValidSlotSpec`.

### Errors (runtime)

Thrown when the template is **defined**, not when it is rendered:

| Situation                      | Message (summary)                                                             |
| ------------------------------ | ----------------------------------------------------------------------------- |
| Malformed slot string          | Expected `name`, `name?:`, `name:type`, `name?:type`, or `name?:type=default` |
| Default on required slot       | Defaults require `?`                                                          |
| Unknown type                   | Expected `string`, `number`, or `boolean`                                     |
| Invalid boolean/number default | Invalid default for type                                                      |

## Examples

### Email subject

```ts
const subject = lit`[${"project"}] ${"action"}: ${"item"}`;

subject({
  project: "lit",
  action: "PR",
  item: "README",
});
// => "[lit] PR: README"
```

### Conditional copy with optional segment

```ts
const banner = lit`Welcome${"name?:"}!`;

banner({}); // "Welcome!"
banner({ name: ", Ada" }); // "Welcome, Ada!"  (leading comma in value if desired)
```

### Composed SQL-style fragment (illustration only — use a proper query builder for production)

```ts
const whereId = lit`id = ${"id:number"}`;
const query = lit`SELECT * FROM users WHERE ${whereId}`;

query({ id: 1 });
// => "SELECT * FROM users WHERE id = 1"
```

## Development

```bash
# Install dev dependencies
bun install

# Type-check
bunx tsc --noEmit lit.ts
```

There is no build step: ship `lit.ts` as source or wire it into your bundler’s TypeScript pipeline.

## License

[MIT](./LICENSE) © Samrith Shankar
