declare module 'virtual:usewagen/parsers' {
  import type { Parser } from 'usewagen'

  export const parsers: Record<string, Parser<any>>
}
