const PREFIX = '[usewagen]'

export const ErrorCodes = {
  NO_STORAGE: 0,
  PARSE_FAILED: 1,
  BUILTIN_PARSER_OVERRIDE: 2,
  WEB_STORAGE_UNAVAILABLE: 3,
  RESERVED_PARSER_NAME: 4,
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.NO_STORAGE]:
    'no storage instance found. Install it with `app.use(createWagenStorage())`, ' +
    'or pass `storage` explicitly.',
  [ErrorCodes.PARSE_FAILED]: 'Failed to parse the input:',
  [ErrorCodes.BUILTIN_PARSER_OVERRIDE]:
    'A built-in parser name cannot be overridden — registration ignored:',
  [ErrorCodes.WEB_STORAGE_UNAVAILABLE]:
    'The storage area is not accessible; falling back to in-memory storage. ' +
    'Values will not persist:',
  [ErrorCodes.RESERVED_PARSER_NAME]: 'Skipping a parser whose name is reserved by a built-in:',
}

export function getMessage(code: ErrorCode): string {
  return `${PREFIX} ${errorMessages[code]}`
}
