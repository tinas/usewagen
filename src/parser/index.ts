/** Configuration for creating a parser with `defineParser`. */
export type ParserConfig<T> = {
  /** Converts a string value to `T`, or returns `null` if invalid. */
  get: (value: string) => T | null
  /** Converts `T` back to a string representation. */
  set: (value: T) => string
}

/** A default value, either a plain value or a factory function. */
export type DefaultValue<D> = D | (() => D)

/** A bidirectional parser that converts between strings and typed values. */
export type Parser<T> = ParserConfig<T> & {
  /** Returns a new parser with a default value attached. */
  default: <D extends T>(value: DefaultValue<D>) => ParserWithDefault<T, D>
}

/** A parser with a default value, guaranteeing a non-null result. */
export type ParserWithDefault<T, D extends T = T> = Parser<T> & {
  readonly defaultValue: DefaultValue<D>
}

/** Creates a type-safe parser from a `get`/`set` configuration. */
export function defineParser<T>(config: ParserConfig<T>): Parser<T> {
  return {
    get: config.get,
    set: config.set,

    default<D extends T>(value: DefaultValue<D>): ParserWithDefault<T, D> {
      const p = defineParser<T>(config) as ParserWithDefault<T, D>
      Object.defineProperty(p, 'defaultValue', { value, writable: false, enumerable: true })
      return p
    },
  }
}

/** Unwraps a `DefaultValue<T>` — calls the factory if it's a function, otherwise returns as-is. */
export function resolveDefault<T>(defaultValue: DefaultValue<T>): T {
  return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue
}

/** Parses any string as-is. */
export const parseAsString = defineParser<string>({
  get: v => v,
  set: String,
})

/** Parses an integer (base 10), truncates on serialize. */
export const parseAsInteger = defineParser<number>({
  get: v => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  },
  set: v => Math.trunc(v).toString(),
})

/** Parses a floating-point number. */
export const parseAsFloat = defineParser<number>({
  get: v => {
    const n = Number.parseFloat(v)
    return Number.isNaN(n) ? null : n
  },
  set: v => v.toString(),
})

/** Parses a 1-based index string to a 0-based number (and back). */
export const parseAsIndex = defineParser<number>({
  get: v => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n - 1
  },
  set: v => (Math.trunc(v) + 1).toString(),
})

/** Parses `"true"` / `"false"` strings to booleans. */
export const parseAsBoolean = defineParser<boolean>({
  get: v => (v === 'true' ? true : v === 'false' ? false : null),
  set: v => (v ? 'true' : 'false'),
})

/** Parses a string that must be one of the given literal values. */
export function parseAsStringLiteral<const T extends readonly string[]>(
  validValues: T,
): Parser<T[number]> {
  return defineParser<T[number]>({
    get: v => (validValues.includes(v) ? (v as T[number]) : null),
    set: v => v.toString(),
  })
}

/** Parses a number that must be one of the given literal values. */
export function parseAsNumberLiteral<const T extends readonly number[]>(
  validValues: T,
): Parser<T[number]> {
  return defineParser<T[number]>({
    get: v => {
      const n = Number.parseFloat(v)
      return validValues.includes(n) ? (n as T[number]) : null
    },
    set: v => v.toString(),
  })
}

/** Parses a string enum value. Prefer `parseAsStringLiteral` for const arrays. */
export function parseAsStringEnum<T extends string>(validValues: T[]): Parser<T> {
  return parseAsStringLiteral(validValues as unknown as readonly string[]) as unknown as Parser<T>
}

const dateConfig: ParserConfig<Date> = {
  get: v => {
    const d = new Date(v.includes('T') ? v : `${v}T00:00:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
  },
  set: v => v.toISOString().slice(0, 10),
}

const isoConfig: ParserConfig<Date> = {
  get: v => {
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  },
  set: v => v.toISOString(),
}

const timestampConfig: ParserConfig<Date> = {
  get: v => {
    const n = Number.parseInt(v, 10)
    if (Number.isNaN(n)) return null
    const d = new Date(n)
    return Number.isNaN(d.getTime()) ? null : d
  },
  set: v => v.getTime().toString(),
}

/**
 * Parses date strings (YYYY-MM-DD by default).
 * Use `.iso()` for full ISO 8601, `.timestamp()` for Unix ms.
 */
export const parseAsDate: Parser<Date> & {
  iso: () => Parser<Date>
  timestamp: () => Parser<Date>
} = Object.assign(defineParser(dateConfig), {
  iso: () => defineParser(isoConfig),
  timestamp: () => defineParser(timestampConfig),
})

/** Parses a separated list of values using the given item parser. */
export function parseAsArrayOf<T>(itemParser: Parser<T>, separator = ','): Parser<T[]> {
  return defineParser<T[]>({
    get: v => {
      if (v === '') return []
      const items = v.split(separator)
      const result: T[] = []
      for (const item of items) {
        const parsed = itemParser.get(item)
        if (parsed === null) return null
        result.push(parsed)
      }
      return result
    },
    set: v => v.map(item => itemParser.set(item)).join(separator),
  })
}

/** Parses a JSON string into `T`. */
export function parseAsJson<T>(): Parser<T> {
  return defineParser<T>({
    get: v => {
      try {
        return JSON.parse(v) as T
      } catch {
        return null
      }
    },
    set: v => JSON.stringify(v),
  })
}

/** Parses a serialized map (e.g. `"a:1;b:2"`) into a `Map<K, V>`. */
export function parseAsMap<K, V>(
  keyParser: Parser<K>,
  valueParser: Parser<V>,
  entrySeparator = ';',
  kvSeparator = ':',
): Parser<Map<K, V>> {
  return defineParser<Map<K, V>>({
    get: v => {
      if (v === '') return new Map()
      const entries = v.split(entrySeparator)
      const map = new Map<K, V>()
      for (const entry of entries) {
        const idx = entry.indexOf(kvSeparator)
        if (idx === -1) return null
        const k = keyParser.get(entry.slice(0, idx))
        const val = valueParser.get(entry.slice(idx + 1))
        if (k === null || val === null) return null
        map.set(k, val)
      }
      return map
    },
    set: v =>
      Array.from(v.entries())
        .map(([k, val]) => `${keyParser.set(k)}${kvSeparator}${valueParser.set(val)}`)
        .join(entrySeparator),
  })
}
