type LitValue = string | number | boolean | null | undefined;

type RequiredParamKeys<P> = {
  [K in keyof P]-?: Record<string, never> extends Pick<P, K> ? never : K;
}[keyof P];

export type LitFn<P = Record<string, LitValue>> =
  RequiredParamKeys<P> extends never ? (values?: P) => string : (values: P) => string;

interface LitNestBrand {
  readonly __litNest?: true;
}

type LitNestSlot = LitNestBrand & ((values?: Record<string, LitValue>) => string);

type SlotRest<S extends string> = S extends `${string}?:${infer R}`
  ? R
  : S extends `${string}:${infer R}`
    ? R
    : never;

type SlotKey<S extends string> = S extends `${infer K}?:${string}`
  ? K
  : S extends `${infer K}:${string}`
    ? K
    : never;

type SlotOptional<S extends string> = S extends `${string}?:${string}` ? true : false;

type SlotTypeName<S extends string> = SlotRest<S> extends `${infer T}=${string}` ? T : SlotRest<S>;

type SlotValueType<T extends string> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : T extends "boolean"
      ? boolean
      : never;

type ValidSlotSpec<S extends string> = S extends `${string}=${string}`
  ? S extends `${string}?:${string}=${string}`
    ? S
    : never
  : S extends `${string}?:${"string" | "number" | "boolean"}${string}`
    ? S
    : S extends `${string}:${"string" | "number" | "boolean"}`
      ? S
      : never;

type ParamFromSlot<S extends string> =
  SlotKey<S> extends infer K extends string
    ? SlotOptional<S> extends true
      ? { [P in K]?: SlotValueType<SlotTypeName<S>> | null }
      : { [P in K]: SlotValueType<SlotTypeName<S>> }
    : never;

type ParamOf<V> = V extends string
  ? ParamFromSlot<V>
  : V extends (values: infer P) => string
    ? P
    : V extends (values?: infer P) => string
      ? [P] extends [undefined]
        ? Record<never, never>
        : P
      : Record<never, never>;

type MergeParams<V extends readonly unknown[]> = V extends readonly []
  ? Record<never, never>
  : V extends readonly [infer Head, ...infer Tail]
    ? Tail extends readonly []
      ? ParamOf<Head>
      : ParamOf<Head> & MergeParams<Tail>
    : Record<never, never>;

type Simplify<T> = { [K in keyof T]: T[K] };

interface ParsedSlot {
  defaultValue?: LitValue;
  key: string;
}

type ResolvedSlot = { kind: "fn"; fn: LitNestSlot } | { kind: "slot"; parsed: ParsedSlot };

const slotPattern = /^([^?:]+)(\?)?:([^=]+)(?:=(.*))?$/;

function parseDefault(raw: string, type: string): LitValue {
  if (type === "number") {
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error(`Invalid lit default "${raw}" for type "number".`);
    }

    return value;
  }

  if (type === "boolean") {
    if (raw === "true") {
      return true;
    }

    if (raw === "false") {
      return false;
    }

    throw new Error(`Invalid lit default "${raw}" for type "boolean".`);
  }

  if (type === "string") {
    return raw;
  }

  throw new Error(`Invalid lit slot type "${type}". Expected "string", "number", or "boolean".`);
}

function parseSlot(spec: string): ParsedSlot {
  const match = slotPattern.exec(spec);
  if (!match) {
    throw new Error(
      `Invalid lit slot "${spec}". Expected "name:type", "name?:type", or "name?:type=default".`
    );
  }

  const [, key, optional, type, defaultRaw] = match;

  if (defaultRaw !== undefined && optional !== "?") {
    throw new Error(
      `Invalid lit slot "${spec}". Defaults require an optional slot ("name?:type=default").`
    );
  }

  if (type !== "string" && type !== "number" && type !== "boolean") {
    throw new Error(`Invalid lit slot type "${type}". Expected "string", "number", or "boolean".`);
  }

  return {
    key,
    defaultValue: defaultRaw === undefined ? undefined : parseDefault(defaultRaw, type),
  };
}

function resolveParsedSlot(parsed: ParsedSlot, params: Record<string, LitValue>): string {
  const value = params[parsed.key];

  if (value === undefined || value === null) {
    return parsed.defaultValue === undefined ? "" : String(parsed.defaultValue);
  }

  return String(value);
}

function resolveSlots(values: ReadonlyArray<string | LitNestBrand>): ResolvedSlot[] {
  return values.map((slot) => {
    if (typeof slot === "function") {
      return { kind: "fn", fn: slot as LitNestSlot };
    }

    return { kind: "slot", parsed: parseSlot(slot as string) };
  });
}

type ValidateSlotElement<U> = U extends string
  ? ValidSlotSpec<U>
  : U extends LitNestBrand
    ? U
    : never;

type ValidateSlotTuple<V extends readonly unknown[]> = V extends readonly [
  infer Head,
  ...infer Tail,
]
  ? readonly [ValidateSlotElement<Head>, ...ValidateSlotTuple<Tail>]
  : readonly [];

/**
 * Lit is a utility for template literals.
 *
 * ```ts
 * const template = lit`Hello ${"name:string"} are you ${"age?:number=18"} years old?`;
 * template({ name: "John" });
 * ```
 */
export function lit<const V extends ReadonlyArray<string | LitNestBrand>>(
  strings: TemplateStringsArray,
  ...values: V
): LitFn<Simplify<MergeParams<ValidateSlotTuple<V>>>> & LitNestBrand {
  type Params = Simplify<MergeParams<ValidateSlotTuple<V>>>;
  const resolvedSlots = resolveSlots(values);

  const render = (params: Params = {} as Params): string => {
    let result = strings[0] ?? "";

    for (let index = 0; index < resolvedSlots.length; index += 1) {
      const slot = resolvedSlots[index];
      const slotParams = params as Record<string, LitValue>;
      result +=
        slot.kind === "fn" ? slot.fn(slotParams) : resolveParsedSlot(slot.parsed, slotParams);
      result += strings[index + 1] ?? "";
    }

    return result;
  };

  return Object.assign(render, { __litNest: true as const }) as LitFn<
    Simplify<MergeParams<ValidateSlotTuple<V>>>
  > &
    LitNestBrand;
}
