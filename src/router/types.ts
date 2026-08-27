import type { ParserInput } from '../parser/types'
import type { ResolvedParser } from '../parser/resolve'

export type RouteStateSource = 'params' | 'query'

export type HistoryMode = 'push' | 'replace'

export interface RouteStateOptions {
  key: string
  parser?: ParserInput
  urlKey?: string
  source?: RouteStateSource
  history?: HistoryMode
  clearOnDefault?: boolean
}

export type ResolvedRouteStateOptions = Omit<Required<RouteStateOptions>, 'parser'> & {
  parser: ResolvedParser<any>
}
