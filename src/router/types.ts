import type { InferParserValue, KnownParsers, ParserInput } from '../parser/types'
import type { Parser, ParserWithDefault } from '../parser/parsers'
import type { ResolvedParser } from '../parser/resolve'

export type RouteStateSource = 'params' | 'query'

export type HistoryMode = 'push' | 'replace'

export interface RouteStateOptions<P extends ParserInput = ParserInput> {
  key: string
  parser?: P
  urlKey?: string
  source?: RouteStateSource
  history?: HistoryMode
  clearOnDefault?: boolean
}

export type ResolvedRouteStateOptions = Omit<Required<RouteStateOptions>, 'parser'> & {
  parser: ResolvedParser<any>
}

export type InferRouteStateValue<P> = [P] extends [undefined]
  ? string | null
  : P extends ParserWithDefault<infer T>
    ? T
    : P extends Parser<infer T>
      ? T | null
      : P extends { name: infer K; defaultValue: any }
        ? K extends keyof KnownParsers
          ? InferParserValue<KnownParsers[K]>
          : string
        : P extends { name: infer K }
          ? K extends keyof KnownParsers
            ? InferParserValue<KnownParsers[K]> | null
            : string | null
          : string | null

export type InferRouteStateInput<P> = InferRouteStateValue<P> | null | undefined
