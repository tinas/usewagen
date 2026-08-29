const DIVISION_PRECEDING = /[\w$)\]]/

export function stripNonCode(source: string): string {
  let output = ''
  let index = 0
  let previous = ''

  const push = (char: string) => {
    output += char
    if (!/\s/.test(char)) previous = char
  }

  while (index < source.length) {
    const char = source[index]!
    const next = source[index + 1]

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index++
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') output += '\n'
        index++
      }
      index += 2
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      index++
      while (index < source.length && source[index] !== char) {
        if (source[index] === '\\') index++
        index++
      }
      index++
      push(char)
      continue
    }

    if (char === '/' && !DIVISION_PRECEDING.test(previous)) {
      index++
      let inClass = false
      while (index < source.length && source[index] !== '\n') {
        const current = source[index]!
        if (current === '\\') {
          index += 2
          continue
        }
        if (current === '[') inClass = true
        else if (current === ']') inClass = false
        else if (current === '/' && !inClass) break
        index++
      }
      index++
      previous = '/'
      continue
    }

    push(char)
    index++
  }

  return output
}
