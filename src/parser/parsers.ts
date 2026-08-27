import { ErrorCodes, getMessage } from '../messages'

export type ParserOptions<T> = {
  parse: (raw: string) => T | null
  serialize?: (value: T) => string
}

export type DefaultValue<T> = T | (() => T)

export type Parser<T> = {
  parse: (raw: string) => T | null
  serialize: (value: T) => string
  withDefault: (value: DefaultValue<T>) => ParserWithDefault<T>
}

export type ParserWithDefault<T> = Parser<T> & {
  readonly defaultValue: DefaultValue<T>
}

export function tryParse<I, R>(fn: (input: I) => R, input: I): R | null {
  try {
    return fn(input)
  } catch (error) {
    console.warn(getMessage(ErrorCodes.PARSE_FAILED), input, error)
    return null
  }
}

export function defineParser<T>(options: ParserOptions<T>): Parser<T> {
  const parse = options.parse
  const serialize = options.serialize ?? (String as (value: T) => string)
  return {
    parse,
    serialize,
    withDefault(value) {
      const parser = defineParser<T>({ parse, serialize }) as ParserWithDefault<T>
      Object.defineProperty(parser, 'defaultValue', { value, enumerable: true })
      return parser
    },
  }
}

export function unwrapDefault<T>(value: DefaultValue<T>): T {
  return typeof value === 'function' ? (value as () => T)() : value
}

export const parseAsString = defineParser<string>({
  parse: v => v,
  serialize: String,
})

export const parseAsInteger = defineParser<number>({
  parse: v => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  },
  serialize: v => Math.trunc(v).toString(),
})

export const parseAsFloat = defineParser<number>({
  parse: v => {
    const n = Number.parseFloat(v)
    return Number.isNaN(n) ? null : n
  },
  serialize: v => v.toString(),
})

export const parseAsIndex = defineParser<number>({
  parse: v => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n - 1
  },
  serialize: v => (Math.trunc(v) + 1).toString(),
})

export const parseAsBoolean = defineParser<boolean>({
  parse: v => (v === 'true' ? true : v === 'false' ? false : null),
  serialize: v => (v ? 'true' : 'false'),
})

export function parseAsStringLiteral<const T extends readonly string[]>(
  values: T,
): Parser<T[number]> {
  return defineParser<T[number]>({
    parse: v => (values.includes(v) ? (v as T[number]) : null),
    serialize: v => v.toString(),
  })
}

export function parseAsNumberLiteral<const T extends readonly number[]>(
  values: T,
): Parser<T[number]> {
  return defineParser<T[number]>({
    parse: v => {
      const n = Number.parseFloat(v)
      return values.includes(n) ? (n as T[number]) : null
    },
    serialize: v => v.toString(),
  })
}

export function parseAsStringEnum<T extends string>(values: T[]): Parser<T> {
  return parseAsStringLiteral(values as readonly T[])
}

export const parseAsDate: Parser<Date> & {
  iso: () => Parser<Date>
  timestamp: () => Parser<Date>
} = Object.assign(
  defineParser<Date>({
    parse: v => {
      const d = new Date(v.includes('T') ? v : `${v}T00:00:00.000Z`)
      return Number.isNaN(d.getTime()) ? null : d
    },
    serialize: v => v.toISOString().slice(0, 10),
  }),
  {
    iso: () =>
      defineParser<Date>({
        parse: v => {
          const d = new Date(v)
          return Number.isNaN(d.getTime()) ? null : d
        },
        serialize: v => v.toISOString(),
      }),
    timestamp: () =>
      defineParser<Date>({
        parse: v => {
          const n = Number.parseInt(v, 10)
          if (Number.isNaN(n)) return null
          const d = new Date(n)
          return Number.isNaN(d.getTime()) ? null : d
        },
        serialize: v => v.getTime().toString(),
      }),
  },
)

export function parseAsArrayOf<T>(itemParser: Parser<T>, separator = ','): Parser<T[]> {
  const encodedSeparator = encodeURIComponent(separator)

  return defineParser<T[]>({
    parse: raw => {
      if (raw === '') return []
      return raw
        .split(separator)
        .map(item => tryParse(itemParser.parse, item.replaceAll(encodedSeparator, separator)))
        .filter(value => value !== null) as T[]
    },
    serialize: values =>
      values
        .map(value => itemParser.serialize(value).replaceAll(separator, encodedSeparator))
        .join(separator),
  })
}

export function parseAsJson<T>(): Parser<T> {
  return defineParser<T>({
    parse: v => {
      try {
        return JSON.parse(v) as T
      } catch {
        return null
      }
    },
    serialize: v => JSON.stringify(v),
  })
}
