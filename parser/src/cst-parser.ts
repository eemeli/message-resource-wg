export type ResourceCST = Array<EmptyLine | Comment | SectionHead | Entry>

export type EmptyLine = { type: 'empty-line'; range: Range }
export type Comment = {
  type: 'comment'
  /** Does not include the `#` or the line terminator. */
  content: string
  range: Range
}
export type SectionHead = {
  type: 'section-head'
  id: IdPart[]
  /** The position of the `]`, or -1 if not found. */
  close: number
  /** `start` indicates the position of the `[`. */
  range: Range
}
export type Entry = {
  type: 'entry'
  id: IdPart[]
  /** The position of the `=`, or -1 if not found. */
  equal: number
  value: ValueLine[]
  range: Range
}

export type IdPart = Content | Escape | IdDot
export type IdDot = { type: 'dot'; range: Range }

export type ValueLine = Array<Content | Escape>
export type Content = { type: 'content'; value: string; range: Range }
export type Escape = {
  type: 'escape'
  /** Does not include the `\`. */
  value: string
  range: Range
}

/** `[start, end)` includes any trailing line terminator */
export type Range = [start: number, end: number]

/** GLOBAL STATE: Error handler */
let onError: (range: Range, msg: string) => void

/** GLOBAL STATE: Current parser position */
let pos: number

/** GLOBAL STATE: The full source being parsed */
let source: string

/**
 * Parse input into a MessageResource CST.
 * Should never throw an Error.
 *
 * @param source - The full source being parsed
 * @param onError - Error handler, may be called multiple times for bad input.
 */
export function parseCST(
  source: string,
  onError: (range: Range, msg: string) => void
): ResourceCST

// resource = line *(newline line)
// line = section-head / entry / comment / empty-line
export function parseCST(
  source_: string,
  onError_: (range: Range, msg: string) => void
): ResourceCST {
  if (!source_) return [{ type: 'empty-line', range: [0, 0] }]
  const res: ResourceCST = []
  onError = onError_
  pos = 0
  source = source_
  while (pos < source.length) {
    switch (source[pos]) {
      case '\n':
      case '\r':
      case '\t':
      case ' ':
        res.push(parseEmptyLine())
        break
      case '#':
        res.push(parseComment())
        break
      case '[':
        res.push(parseSectionHead())
        break
      default:
        res.push(parseEntry())
        break
    }
  }
  return res
}

// empty-line = [ws]
function parseEmptyLine(): EmptyLine {
  const type = 'empty-line'
  const start = pos
  parseWhitespace()
  parseLineEnd(type)
  return { type, range: [start, pos] }
}

// comment = "#" *(content / backslash)
function parseComment(): Comment {
  const start = pos
  pos += 1 // '#'
  let lf = source.indexOf('\n', pos)
  let content: string
  if (lf === -1) {
    content = source.substring(pos)
    pos = source.length
  } else {
    pos = lf + 1
    if (source[lf - 1] === '\r') lf -= 1
    content = source.substring(start + 1, lf)
  }
  return { type: 'comment', content, range: [start, pos] }
}

// section-head = "[" [ws] id [ws] "]" [ws]
function parseSectionHead(): SectionHead {
  const type = 'section-head'
  const start = pos
  pos += 1 // '['
  const id = parseId()
  const close = parseChar(']')
  parseWhitespace()
  parseLineEnd(type)
  return { type, id, close, range: [start, pos] }
}

/**
 * entry = id [ws] "=" [ws] value
 * value = value-line *(newline ws value-line)
 * value-line = [(value-start / value-escape) *(content / value-escape)]
 * value-start = %x21-5B / %x5D-7E / %x00A0-2027 / %x202A-D7FF / %xE000-10FFFF
 * content = SP / HTAB / value-start
 */
const contentRegExp =
  /[\t\x20-\x5B\x5D-\x7E\u{A0}-\u{2027}\u{202A}-\u{D7FF}\u{E000}-\u{10FFFF}]/u
function parseEntry(): Entry {
  const type = 'entry'
  const start = pos
  const id = parseId()
  const equal = parseChar('=')

  let range: Range | null = null
  const addContent = (line: ValueLine) => {
    if (range) {
      const value = source.substring(range[0], range[1])
      line.push({ type: 'content', value, range })
      range = null
    }
  }

  const value: ValueLine[] = []
  while (pos < source.length) {
    const ls = pos
    parseWhitespace()
    if (pos === ls && value.length > 0) break
    const line: ValueLine = []
    line: while (pos < source.length) {
      const ch = source[pos]
      switch (ch) {
        case '\n':
        case '\r':
          break line
        case '\\': {
          addContent(line)
          line.push(parseEscape('value'))
          break
        }
        default: {
          const next = pos + 1
          if (!contentRegExp.test(ch)) {
            onError([pos, next], 'Invalid content character')
          }
          if (range) range[1] = next
          else range = [pos, next]
          pos = next
        }
      }
    }
    addContent(line)
    value.push(line)
    parseLineEnd(type)
  }
  return { type, id, equal, value, range: [start, pos] }
}

/**
 * id = id-part *([ws] "." [ws] id-part)
 * id-part = 1*(id-char / id-escape)
 * id-char = ALPHA / DIGIT / "-" / "_"
 *         / %x00A1-1FFF / %x200C-200D / %x2030-205E / %x2070-2FEF
 *         / %x3001-D7FF / %xF900-FDCF / %xFDF0-FFFD / %x10000-EFFFF
 */
const idCharRegExp =
  /[-a-zA-Z0-9_\u{A1}-\u{1FFF}\u{200C}-\u{200D}\u{2030}-\u{205E}\u{2070}-\u{2FEF}\u{3001}-\u{D7FF}\u{F900}-\u{FDCF}\u{FDF0}-\u{FFFD}\u{10000}-\u{EFFFF}]/u
function parseId(): IdPart[] {
  const id: IdPart[] = []
  let range: Range | null = null
  const addContent = () => {
    if (range) {
      const value = source.substring(range[0], range[1])
      id.push({ type: 'content', value, range })
      range = null
    }
  }
  loop: while (pos < source.length) {
    const ch = source[pos]
    switch (ch) {
      case '\n':
      case '\r':
      case '=':
      case ']':
        break loop
      case '\\': {
        addContent()
        id.push(parseEscape('id'))
        break
      }
      case '.': {
        addContent()
        const range: Range = [pos, pos + 1]
        const prev = id.at(-1)
        if (!prev || prev.type === 'dot') {
          onError(range, 'Repeated dot in identifier')
        }
        id.push({ type: 'dot', range })
        pos += 1
        break
      }
      case '\t':
      case ' ':
        addContent()
        parseWhitespace()
        break
      default: {
        const next = pos + 1
        if (range) {
          range[1] = next
        } else {
          range = [pos, next]
          const prev = id.at(-1)
          if (prev?.type === 'content') {
            onError([prev.range[1], pos], 'Unexpected whitespace')
          }
        }
        if (!idCharRegExp.test(ch)) {
          onError([pos, next], 'Invalid identifier character')
        }
        pos = next
      }
    }
  }
  addContent()
  const last = id.at(-1)
  if (last?.type === 'dot') {
    onError(last.range, 'Trailing dot in identifier')
  }
  return id
}

/**
 * id-escape = backslash (escaped / symbols)
 * value-escape = backslash (escaped / "{" / "|" / "}")
 *
 * backslash = "\"
 * escaped = backslash
 *         / SP / HTAB
 *         / %s"n" / %s"r" / %s"t" ; represent LF, CR, HTAB
 *         / (%s"x" HEXDIG HEXDIG)
 *         / (%s"u" HEXDIG HEXDIG HEXDIG HEXDIG)
 *         / (%s"U" HEXDIG HEXDIG HEXDIG HEXDIG HEXDIG HEXDIG)
 * symbols = %x21-2F / %x3A-40 / %x5B-60 / %x7B-7E ; ASCII symbols and punctuation
 *         / %xA1-BF / %xD7 / %xF7 ; Latin-1 symbols and punctuation
 *         / %x2010-2027 / %x2030-205E / %x2190-2BFF ; General symbols and punctuation
 */
const escLength: Record<string, number | undefined> = { x: 2, u: 4, U: 6 }
const escCommonChars = '\\\t nrt'
const escIdRegExp =
  /[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E\xA1-\xBF\xD7\xF7\u2010-\u2027\u2030-\u205E\u2190-\u2BFF]/
const escValueChars = '{|}'
function parseEscape(context: 'id' | 'value'): Escape {
  const start = pos
  pos += 1 // '\'
  const ch = source[pos]
  pos += 1
  const hexLength = escLength[ch]
  if (hexLength) {
    parseHexDigits(hexLength)
  } else if (!escCommonChars.includes(ch)) {
    const ok =
      context === 'id' ? escIdRegExp.test(ch) : escValueChars.includes(ch)
    if (!ok) onError([start, pos], 'Unknown character escape')
  }
  const value = source.substring(start + 1, pos)
  return { type: 'escape', value, range: [start, pos] }
}

const hexDigits = '0123456789ABCDEFabcdef'
function parseHexDigits(limit: number) {
  let count = 0
  let ch = source[pos]
  while (count < limit && hexDigits.includes(ch)) {
    count += 1
    ch = source[pos + count]
  }
  if (count < limit) {
    onError([pos - 2, pos + count], 'Not enough digits in character escape')
  }
  pos += count
}

/** @returns `-1` on error */
function parseChar(char: string) {
  if (source[pos] === char) {
    pos += 1
    return pos - 1
  } else {
    onError([pos, pos + 1], `Expected a ${char} here`)
    return -1
  }
}

// newline = CRLF / LF
function parseLineEnd(type: string) {
  let count = 0
  let ch = source[pos]
  if (ch === '\r') {
    count = 1
    ch = source[pos + 1]
  }
  if (ch === '\n') {
    pos += count + 1
  } else if (pos < source.length) {
    let end = source.indexOf('\n', pos)
    if (end === -1) end = source.length
    const msg =
      type === 'empty-line'
        ? 'Content with unexpected indent'
        : 'Unexpected content at line end'
    onError([pos, end], msg)
  }
}

// ws = 1*(SP / HTAB)
function parseWhitespace() {
  let ch = source[pos]
  while (ch === ' ' || ch === '\t') {
    pos += 1
    ch = source[pos]
  }
}
