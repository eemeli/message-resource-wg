import { expect, test, vi } from 'vitest'
import { parseCST } from './cst-parser'

function parseOk(source: string) {
  const onError = vi.fn()
  const res = parseCST(source, onError)
  for (const [range, msg] of onError.mock.calls) {
    console.error(`${msg}: ${source.substring(range[0], range[1])}`)
  }
  expect(onError).not.toHaveBeenCalled()
  return res
}

test('empty string', () => {
  const res = parseOk('')
  expect(res).toMatchObject([{ type: 'empty-line', range: [0, 0] }])
})

test('single line terminator', () => {
  const res = parseOk('\r\n')
  expect(res).toMatchObject([{ type: 'empty-line', range: [0, 2] }])
})

test('comments and empty lines', () => {
  const res = parseOk('\n\n#[foo\\] \n## bar\n  \t\n')
  expect(res).toMatchObject([
    { type: 'empty-line', range: [0, 1] },
    { type: 'empty-line', range: [1, 2] },
    { type: 'comment', content: '[foo\\] ', range: [2, 11] },
    { type: 'comment', content: '# bar', range: [11, 18] },
    { type: 'empty-line', range: [18, 22] },
  ])
})

test('one-line entry', () => {
  const res = parseOk('foo = {bar}')
  expect(res).toMatchObject([
    {
      type: 'entry',
      id: [{ type: 'content', value: 'foo', range: [0, 3] }],
      equal: 4,
      value: [[{ type: 'content', value: '{bar}', range: [6, 11] }]],
      range: [0, 11],
    },
  ])
})

test('multi-line entry', () => {
  const res = parseOk('foo = \n  {\n    bar\n  }\n')
  expect(res).toMatchObject([
    {
      type: 'entry',
      id: [{ type: 'content', value: 'foo', range: [0, 3] }],
      equal: 4,
      value: [
        [],
        [{ type: 'content', value: '{', range: [9, 10] }],
        [{ type: 'content', value: 'bar', range: [15, 18] }],
        [{ type: 'content', value: '}', range: [21, 22] }],
      ],
      range: [0, 23],
    },
  ])
})

test('multi-line entry with CRLF terminators', () => {
  const res = parseOk('foo = \r\n  {\r\n    bar\r\n  }\r\n')
  expect(res).toMatchObject([
    {
      type: 'entry',
      id: [{ type: 'content', value: 'foo', range: [0, 3] }],
      equal: 4,
      value: [
        [],
        [{ type: 'content', value: '{', range: [10, 11] }],
        [{ type: 'content', value: 'bar', range: [17, 20] }],
        [{ type: 'content', value: '}', range: [24, 25] }],
      ],
      range: [0, 27],
    },
  ])
})

test('section-head with trailing whitespace', () => {
  const res = parseOk('[ foo . bar ] \t\n')
  expect(res).toMatchObject([
    {
      type: 'section-head',
      id: [
        { type: 'content', value: 'foo', range: [2, 5] },
        { type: 'dot', range: [6, 7] },
        { type: 'content', value: 'bar', range: [8, 11] },
      ],
      close: 12,
      range: [0, 16],
    },
  ])
})

test('escaped contents', () => {
  const res = parseOk(
    '[f\\xf6o\\ \t.b\\u00E4r\\]]\nlong\\tkey={msg\\|\\nlines}\n'
  )
  expect(res).toMatchObject([
    {
      type: 'section-head',
      id: [
        { type: 'content', value: 'f' },
        { type: 'escape', value: 'xf6' },
        { type: 'content', value: 'o' },
        { type: 'escape', value: ' ' },
        { type: 'dot' },
        { type: 'content', value: 'b' },
        { type: 'escape', value: 'u00E4' },
        { type: 'content', value: 'r' },
        { type: 'escape', value: ']' },
      ],
    },
    {
      type: 'entry',
      id: [
        { type: 'content', value: 'long' },
        { type: 'escape', value: 't' },
        { type: 'content', value: 'key' },
      ],
      value: [
        [
          { type: 'content', value: '{msg' },
          { type: 'escape', value: '|' },
          { type: 'escape', value: 'n' },
          { type: 'content', value: 'lines}' },
        ],
      ],
    },
  ])
})
