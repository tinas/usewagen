import type { Parser, ParserWithDefault } from './parser'

/** Augmentable registry mapping parser names to their types. */
export interface ParserRegistry {}

/** Extracts the parsed type `T` from a `Parser<T>`. */
export type InferParserType<P> = P extends Parser<infer T> ? T : never

/** A direct parser instance or a name-based reference that resolves to one. */
export type ParserLike = Parser<any> | { name: string; defaultValue?: any }

/** Infers the value type that a composable will produce from a given parser input. */
export type ResolvedParserType<P> =
  P extends ParserWithDefault<infer T, any>
    ? T
    : P extends Parser<infer T>
      ? T | null
      : P extends { name: infer K; defaultValue: any }
        ? K extends keyof ParserRegistry
          ? InferParserType<ParserRegistry[K]>
          : string
        : P extends { name: infer K }
          ? K extends keyof ParserRegistry
            ? InferParserType<ParserRegistry[K]> | null
            : string | null
          : string | null
