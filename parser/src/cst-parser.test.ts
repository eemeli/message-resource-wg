import { describe, expect, test, vi } from 'vitest'
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

function parseFail(source: string) {
  const onError = vi.fn()
  const res = parseCST(source, onError)
  expect(onError).toHaveBeenCalled()
  return [res, onError.mock.calls]
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
  const res = parseOk('\n\n#[foo\\] \n## bar\r\n  \t\n#')
  expect(res).toMatchObject([
    { type: 'empty-line', range: [0, 1] },
    { type: 'empty-line', range: [1, 2] },
    { type: 'comment', content: '[foo\\] ', range: [2, 11] },
    { type: 'comment', content: '# bar', range: [11, 19] },
    { type: 'empty-line', range: [19, 23] },
    { type: 'comment', content: '', range: [23, 24] },
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
  const res = parseOk('foo = \n  {\n    bar\n  }\nnext={value}')
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
    {
      type: 'entry',
      id: [{ type: 'content', value: 'next', range: [23, 27] }],
      equal: 27,
      value: [[{ type: 'content', value: '{value}', range: [28, 35] }]],
      range: [23, 35],
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

describe('errors', () => {
  test('invalid content', () => {
    const [res, calls] = parseFail('\vkey=foo\u2028bar')
    expect(res).toMatchObject([
      {
        type: 'entry',
        id: [{ type: 'content', value: '\vkey' }],
        value: [[{ type: 'content', value: 'foo\u2028bar' }]],
      },
    ])
    expect(calls).toMatchObject([
      [[0, 1], 'Invalid identifier character'],
      [[8, 9], 'Invalid entry content character'],
    ])
  })

  test('identifier dots', () => {
    const [res, calls] = parseFail('[..]')
    expect(res).toMatchObject([
      {
        type: 'section-head',
        id: [
          { type: 'dot', range: [1, 2] },
          { type: 'dot', range: [2, 3] },
        ],
      },
    ])
    expect(calls).toMatchObject([
      [[1, 2], 'Leading dot in identifier'],
      [[1, 3], 'Repeated dots in identifier'],
      [[2, 3], 'Trailing dot in identifier'],
    ])
  })

  test('identifier spaces', () => {
    const [res, calls] = parseFail('[a b]')
    expect(res).toMatchObject([
      {
        type: 'section-head',
        id: [
          { type: 'content', value: 'a', range: [1, 2] },
          { type: 'content', value: 'b', range: [3, 4] },
        ],
      },
    ])
    expect(calls).toMatchObject([
      [[2, 3], 'Unexpected whitespace in identifier'],
    ])
  })

  test('character escapes', () => {
    const [res, calls] = parseFail('\\\n\\!\\a=\\!\\x1\\u123\\U12345')
    expect(res).toMatchObject([
      {
        type: 'entry',
        id: [
          { type: 'escape', value: '\n', range: [0, 2] },
          { type: 'escape', value: '!', range: [2, 4] }, // valid in id
          { type: 'escape', value: 'a', range: [4, 6] },
        ],
        value: [
          [
            { type: 'escape', value: '!', range: [7, 9] },
            { type: 'escape', value: 'x1', range: [9, 12] },
            { type: 'escape', value: 'u123', range: [12, 17] },
            { type: 'escape', value: 'U12345', range: [17, 24] },
          ],
        ],
      },
    ])
    expect(calls).toMatchObject([
      [[0, 2], 'Unknown character escape'],
      [[4, 6], 'Unknown character escape'],
      [[7, 9], 'Unknown character escape'],
      [[9, 12], 'Not enough digits in character escape'],
      [[12, 17], 'Not enough digits in character escape'],
      [[17, 24], 'Not enough digits in character escape'],
    ])
  })

  test('missing characters', () => {
    const [res, calls] = parseFail('[a\nb c ] d')
    expect(res).toMatchObject([
      {
        type: 'section-head',
        id: [{ type: 'content', value: 'a', range: [1, 2] }],
        close: -1,
      },
      {
        type: 'entry',
        id: [
          { type: 'content', value: 'b', range: [3, 4] },
          { type: 'content', value: 'c', range: [5, 6] },
        ],
        equal: -1,
        value: [[{ type: 'content', value: '] d', range: [7, 10] }]],
      },
    ])
    expect(calls).toMatchObject([
      [[2, 3], 'Expected a ] character here'],
      [[4, 5], 'Unexpected whitespace in identifier'],
      [[7, 8], 'Expected a = character here'],
    ])
  })

  test('trailing content', () => {
    const [res, calls] = parseFail(' \t#c\n[a] #d')
    expect(res).toMatchObject([
      { type: 'empty-line', range: [0, 2] },
      { type: 'comment', content: 'c', range: [2, 5] },
      {
        type: 'section-head',
        id: [{ type: 'content', value: 'a', range: [6, 7] }],
        close: 7,
        range: [5, 9],
      },
      { type: 'comment', content: 'd', range: [9, 11] },
    ])
    expect(calls).toMatchObject([
      [[2, 4], 'Content with unexpected indent'],
      [[9, 11], 'Unexpected content at line end'],
    ])
  })
})
