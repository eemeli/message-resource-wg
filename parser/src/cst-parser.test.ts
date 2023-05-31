import { expect, test, vi } from 'vitest'
import { parseCST } from './cst-parser'

function parseOk(source: string) {
  const onError = vi.fn()
  const res = parseCST(source, onError)
  expect(onError).not.toHaveBeenCalled()
  return res
}

test('empty string', () => {
  const res = parseOk('')
  expect(res).toMatchObject([{ type: 'empty-line', range: [0, 0] }])
})
