import test from 'node:test'
import assert from 'node:assert/strict'

import { parsePromptWebInput } from '@/web/prompts'

test('parsePromptWebInput normalizes valid web prompt forms', () => {
  assert.deepEqual(parsePromptWebInput({
    type: 1,
    name: '  人物改图  ',
    text: '  保留人物主体  ',
  }), {
    type: 1,
    name: '人物改图',
    text: '保留人物主体',
  })
})

test('parsePromptWebInput rejects non-numeric prompt types', () => {
  assert.throws(
    () => parsePromptWebInput({ type: '1', name: '名称', text: '正文' }),
    /提示词 type 必须是 0 或 1/
  )
  assert.throws(
    () => parsePromptWebInput({ type: 2, name: '名称', text: '正文' }),
    /提示词 type 必须是 0 或 1/
  )
})

test('parsePromptWebInput rejects empty fields', () => {
  assert.throws(
    () => parsePromptWebInput({ type: 0, name: ' ', text: '正文' }),
    /提示词名称不能为空/
  )
  assert.throws(
    () => parsePromptWebInput({ type: 0, name: '名称', text: '' }),
    /提示词正文不能为空/
  )
})
