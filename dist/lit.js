const slotPattern = /^([^?:]+)(\?)?:([^=]+)(?:=(.*))?$/;
function parseDefault(raw, type) {
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
function parseSlot(spec) {
    const match = slotPattern.exec(spec);
    if (!match) {
        throw new Error(`Invalid lit slot "${spec}". Expected "name:type", "name?:type", or "name?:type=default".`);
    }
    const [, key, optional, type, defaultRaw] = match;
    if (defaultRaw !== undefined && optional !== "?") {
        throw new Error(`Invalid lit slot "${spec}". Defaults require an optional slot ("name?:type=default").`);
    }
    if (type !== "string" && type !== "number" && type !== "boolean") {
        throw new Error(`Invalid lit slot type "${type}". Expected "string", "number", or "boolean".`);
    }
    return {
        key,
        defaultValue: defaultRaw === undefined ? undefined : parseDefault(defaultRaw, type),
    };
}
function resolveParsedSlot(parsed, params) {
    const value = params[parsed.key];
    if (value === undefined || value === null) {
        return parsed.defaultValue === undefined ? "" : String(parsed.defaultValue);
    }
    return String(value);
}
function resolveSlots(values) {
    return values.map((slot) => {
        if (typeof slot === "function") {
            return { kind: "fn", fn: slot };
        }
        return { kind: "slot", parsed: parseSlot(slot) };
    });
}
/**
 * Lit is a utility for template literals.
 *
 * ```ts
 * const template = lit`Hello ${"name:string"} are you ${"age?:number=18"} years old?`;
 * template({ name: "John" });
 * ```
 */
export function lit(strings, ...values) {
    const resolvedSlots = resolveSlots(values);
    const render = (params = {}) => {
        let result = strings[0] ?? "";
        for (let index = 0; index < resolvedSlots.length; index += 1) {
            const slot = resolvedSlots[index];
            const slotParams = params;
            result +=
                slot.kind === "fn" ? slot.fn(slotParams) : resolveParsedSlot(slot.parsed, slotParams);
            result += strings[index + 1] ?? "";
        }
        return result;
    };
    return Object.assign(render, { __litNest: true });
}
