type LitValue = string | number | boolean | null | undefined;
type RequiredParamKeys<P> = {
    [K in keyof P]-?: Record<string, never> extends Pick<P, K> ? never : K;
}[keyof P];
export type LitFn<P = Record<string, LitValue>> = RequiredParamKeys<P> extends never ? (values?: P) => string : (values: P) => string;
interface LitNestBrand {
    readonly __litNest?: true;
}
type SlotRest<S extends string> = S extends `${string}?:${infer R}` ? R : S extends `${string}:${infer R}` ? R : never;
type SlotKey<S extends string> = S extends `${infer K}?:${string}` ? K : S extends `${infer K}:${string}` ? K : S extends `${string}:${string}` | `${string}?:${string}` | `${string}?` | `${string}=` ? never : S;
type SlotOptional<S extends string> = S extends `${string}?:${string}` ? true : false;
type SlotHasExplicitType<S extends string> = S extends `${string}:${string}` | `${string}?:${string}` ? true : false;
type SlotTypeName<S extends string> = SlotHasExplicitType<S> extends true ? SlotRest<S> extends `${infer T}=${string}` ? T : SlotRest<S> extends "" ? "string" : SlotRest<S> : "string";
type SlotValueType<T extends string> = T extends "string" ? string : T extends "number" ? number : T extends "boolean" ? boolean : never;
type ValidSlotSpec<S extends string> = S extends `${string}=${string}` ? S extends `${string}?:${string}=${string}` ? S : never : S extends `${string}?:${"string" | "number" | "boolean"}${string}` ? S : S extends `${string}?:` ? S : S extends `${string}:${"string" | "number" | "boolean"}` ? S : S extends `${string}:${string}` | `${string}?:${string}` | `${string}?` | `${string}=` ? never : S extends `${infer K}` ? K extends "" ? never : S : never;
type ParamFromSlot<S extends string> = SlotKey<S> extends infer K extends string ? SlotOptional<S> extends true ? {
    [P in K]?: SlotValueType<SlotTypeName<S>> | null;
} : {
    [P in K]: SlotValueType<SlotTypeName<S>>;
} : never;
type ParamOf<V> = V extends string ? ParamFromSlot<V> : V extends (values: infer P) => string ? P : V extends (values?: infer P) => string ? [P] extends [undefined] ? Record<never, never> : P : Record<never, never>;
type MergeParams<V extends readonly unknown[]> = V extends readonly [] ? Record<never, never> : V extends readonly [infer Head, ...infer Tail] ? Tail extends readonly [] ? ParamOf<Head> : ParamOf<Head> & MergeParams<Tail> : Record<never, never>;
type Simplify<T> = {
    [K in keyof T]: T[K];
};
type ValidateSlotElement<U> = U extends string ? ValidSlotSpec<U> : U extends LitNestBrand ? U : never;
type ValidateSlotTuple<V extends readonly unknown[]> = V extends readonly [
    infer Head,
    ...infer Tail
] ? readonly [ValidateSlotElement<Head>, ...ValidateSlotTuple<Tail>] : readonly [];
/**
 * Lit is a utility for template literals.
 *
 * ```ts
 * const template = lit`Hello ${"name:string"} are you ${"age?:number=18"} years old?`;
 * template({ name: "John" });
 * ```
 */
export declare function lit<const V extends ReadonlyArray<string | LitNestBrand>>(strings: TemplateStringsArray, ...values: V): LitFn<Simplify<MergeParams<ValidateSlotTuple<V>>>> & LitNestBrand;
export {};
