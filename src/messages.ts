const PREFIX = '[usewagen]'

export const ErrorCodes = {
  PARSE_FAILED: 0,
  UNKNOWN_PARSER_NAME: 1,
  WEB_STORAGE_UNAVAILABLE: 2,
  RESERVED_PARSER_NAME: 3,
  DUPLICATE_PARSER_NAME: 4,
  NO_INJECTION_CONTEXT: 5,
  NO_EFFECT_SCOPE: 6,
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.PARSE_FAILED]: 'Failed to parse the input:',
  [ErrorCodes.UNKNOWN_PARSER_NAME]:
    'No parser is registered under this name; falling back to `parseAsString`. ' +
    'Pass it to `createWagen({ parsers })`:',
  [ErrorCodes.WEB_STORAGE_UNAVAILABLE]:
    'The storage area is not accessible; falling back to in-memory storage. ' +
    'Values will not persist:',
  [ErrorCodes.RESERVED_PARSER_NAME]: 'Skipping a parser whose name is reserved by a built-in:',
  [ErrorCodes.DUPLICATE_PARSER_NAME]:
    'A parser with this name was already found in another file — the last one wins:',
  [ErrorCodes.NO_INJECTION_CONTEXT]:
    'Composables should be called inside `setup()` or a function that runs in an ' +
    'injection context; falling back to the active instance. Outside one, use ' +
    '`getActiveWagen()` or the `define*` APIs:',
  [ErrorCodes.NO_EFFECT_SCOPE]:
    'Composables should be called inside `setup()` or a running effect scope; ' +
    'outside one the effects they create are never released, which leaks:',
}

export function getMessage(code: ErrorCode): string {
  return `${PREFIX} ${errorMessages[code]}`
}

export function warn(code: ErrorCode, ...details: unknown[]): void {
  console.warn(getMessage(code), ...details)
}

export function warnDev(code: ErrorCode, ...details: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') warn(code, ...details)
}
