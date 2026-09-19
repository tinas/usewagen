import type {
  LocationQueryRaw,
  RouteLocationNormalizedLoaded,
  RouteParamsRaw,
  Router,
} from 'vue-router'
import type { HistoryMode, RouteStateSource } from './types'

import { nextTick } from 'vue'

export interface RouteChange {
  urlKey: string
  source: RouteStateSource
  serialized: string | null
}

export interface RouteWrite {
  history: HistoryMode
  changes?: readonly RouteChange[]
  hash?: string | null
}

export interface RouteTarget {
  params: RouteParamsRaw
  query: LocationQueryRaw
  hash: string
}

export interface RouteQueue {
  enqueue: (write: RouteWrite) => Promise<void>
}

interface Batch {
  changes: RouteChange[]
  histories: HistoryMode[]
  hash: string | null | undefined
  settled: Promise<void>
}

interface Navigation extends RouteTarget {
  from: RouteLocationNormalizedLoaded
  history: HistoryMode
  settled: Promise<void>
  successor: Navigation | null
}

const queues = new WeakMap<Router, RouteQueue>()

export function getRouteQueue(router: Router): RouteQueue {
  let queue = queues.get(router)

  if (!queue) {
    queue = createRouteQueue(router)
    queues.set(router, queue)
  }

  return queue
}

export function resolveBatchHistory(
  candidates: readonly HistoryMode[],
  override?: HistoryMode,
): HistoryMode {
  if (override) return override
  return candidates.includes('push') ? 'push' : 'replace'
}

export function applyChanges(
  base: RouteTarget,
  changes: readonly RouteChange[],
  hash: string | null | undefined,
): { target: RouteTarget; changed: boolean } {
  const params: RouteParamsRaw = { ...base.params }
  const query: LocationQueryRaw = { ...base.query }

  let changed = false

  for (const change of changes) {
    const target = change.source === 'params' ? params : query
    const current = target[change.urlKey]

    if (Array.isArray(current)) changed = true
    else if (change.serialized === null) changed ||= current !== undefined
    else changed ||= current !== change.serialized

    target[change.urlKey] = change.serialized === null ? undefined : change.serialized
  }

  const nextHash = hash === undefined ? base.hash : (hash ?? '')
  changed ||= nextHash !== base.hash

  return { target: { params, query, hash: nextHash }, changed }
}

function createRouteQueue(router: Router): RouteQueue {
  let batch: Batch | null = null
  let pending: Navigation | null = null

  function open(): Batch {
    const created: Batch = {
      changes: [],
      histories: [],
      hash: undefined,
      settled: nextTick().then(() => flush(created)),
    }

    return created
  }

  function flush(current: Batch): Promise<void> {
    if (batch === current) batch = null

    const route = router.currentRoute.value
    const ahead = pending && pending.from === route ? pending : null
    const { target, changed } = applyChanges(ahead ?? route, current.changes, current.hash)

    if (!changed) return ahead ? ahead.settled : Promise.resolve()

    const history = resolveBatchHistory(
      ahead ? [ahead.history, ...current.histories] : current.histories,
    )

    const navigation: Navigation = {
      ...target,
      from: route,
      history,
      successor: null,
      settled: router[history]({
        params: target.params,
        query: target.query,
        hash: target.hash === '' ? undefined : target.hash,
      }).then(settle, settle),
    }

    if (ahead) ahead.successor = navigation
    pending = navigation

    return navigation.settled

    function settle() {
      if (pending === navigation) pending = null
      return navigation.successor?.settled
    }
  }

  function enqueue(write: RouteWrite): Promise<void> {
    batch ??= open()

    if (write.changes) batch.changes.push(...write.changes)
    if (write.hash !== undefined) batch.hash = write.hash
    batch.histories.push(write.history)

    return batch.settled
  }

  return { enqueue }
}
