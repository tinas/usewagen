import type { LocationQueryRaw, RouteParamsRaw, Router } from 'vue-router'
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

interface Batch {
  changes: RouteChange[]
  histories: HistoryMode[]
  hash: string | null | undefined
  settled: Promise<void>
}

const batches = new WeakMap<Router, Batch>()

export function resolveBatchHistory(
  candidates: readonly HistoryMode[],
  override?: HistoryMode,
): HistoryMode {
  if (override) return override
  return candidates.includes('push') ? 'push' : 'replace'
}

export function enqueue(router: Router, write: RouteWrite): Promise<void> {
  let batch = batches.get(router)

  if (!batch) {
    const created: Batch = {
      changes: [],
      histories: [],
      hash: undefined,
      settled: Promise.resolve(),
    }
    created.settled = nextTick().then(() => flush(router, created))
    batches.set(router, created)
    batch = created
  }

  if (write.changes) batch.changes.push(...write.changes)
  if (write.hash !== undefined) batch.hash = write.hash
  batch.histories.push(write.history)

  return batch.settled
}

function flush(router: Router, batch: Batch): Promise<void> {
  if (batches.get(router) === batch) batches.delete(router)

  const route = router.currentRoute.value
  const params: RouteParamsRaw = { ...route.params }
  const query: LocationQueryRaw = { ...route.query }

  let changed = false

  for (const change of batch.changes) {
    const target = change.source === 'params' ? params : query
    const current = target[change.urlKey]

    if (Array.isArray(current)) changed = true
    else if (change.serialized === null) changed ||= current !== undefined
    else changed ||= current !== change.serialized

    target[change.urlKey] = change.serialized === null ? undefined : change.serialized
  }

  const hash = batch.hash === undefined ? route.hash : (batch.hash ?? '')
  changed ||= hash !== route.hash

  if (!changed) return Promise.resolve()

  return router[resolveBatchHistory(batch.histories)]({
    params,
    query,
    hash: hash === '' ? undefined : hash,
  }).then(
    () => {},
    () => {},
  )
}
