import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  addPrompt,
  extractPromptTextFromElements,
  readPromptLibrary,
  resolvePromptInput,
  resolvePromptTextFromEvent,
} from '../src/utils/prompts'

async function createTempFile (name: string, content: string): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draw-prompts-'))
  const filePath = path.join(tempDir, name)
  await fs.writeFile(filePath, content, 'utf8')
  return filePath
}

test('prompt library writes versioned JSON and generates stable ids', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draw-prompt-library-'))
  const filePath = path.join(tempDir, 'prompts.json')

  const first = addPrompt({ type: 0, name: '日系头像', text: '柔和光线' }, filePath)
  const second = addPrompt({ type: 1, name: '人物改图', text: '保留人物主体' }, filePath)

  assert.equal(first.id, 'p001')
  assert.equal(second.id, 'p002')
  assert.deepEqual(readPromptLibrary(filePath), [first, second])

  const content = await fs.readFile(filePath, 'utf8')
  assert.match(content, /"version": 1/)
  assert.match(content, /"prompts"/)
})

test('resolvePromptInput resolves a saved id and appends extra text', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draw-prompt-resolve-'))
  const filePath = path.join(tempDir, 'prompts.json')
  addPrompt({ type: 1, name: '人物改图', text: '保留人物主体' }, filePath)

  assert.deepEqual(resolvePromptInput('p001 加一顶帽子', filePath), {
    text: '保留人物主体\n加一顶帽子',
    type: 1,
    id: 'p001',
  })
  assert.deepEqual(resolvePromptInput('prompt:p001', filePath), {
    text: '保留人物主体',
    type: 1,
    id: 'p001',
  })
  assert.throws(() => resolvePromptInput('p999', filePath), /未找到提示词：p999/)
  assert.deepEqual(resolvePromptInput('一只猫', filePath), { text: '一只猫' })
})

test('resolvePromptTextFromEvent reads quoted text messages', async () => {
  const content = await resolvePromptTextFromEvent({
    msg: '#新增提示词 0 纯文本',
    replyId: 'message-1',
    contact: { scene: 'group', peer: '10000', name: 'test-group' },
    bot: {
      getMsg: async () => ({
        elements: [
          { type: 'text', text: '第一行' },
          { type: 'text', text: '\n第二行' },
        ],
      }),
    },
  })

  assert.equal(content, '第一行\n第二行')
})

test('resolvePromptTextFromEvent reads quoted txt and md files', async () => {
  const txtPath = await createTempFile('source.txt', '\uFEFFtxt prompt\n')
  const mdPath = await createTempFile('source.md', '# Markdown prompt\n\n保留标题')

  const txtContent = await resolvePromptTextFromEvent({
    msg: '#新增提示词 0 文本',
    replyId: 'txt-message',
    contact: { scene: 'group', peer: '10000', name: 'test-group' },
    bot: {
      getMsg: async () => ({
        elements: [{ type: 'file', name: 'source.txt', file: txtPath }],
      }),
    },
  })
  const mdContent = await resolvePromptTextFromEvent({
    msg: '#新增提示词 0 Markdown',
    replyId: 'md-message',
    contact: { scene: 'group', peer: '10000', name: 'test-group' },
    bot: {
      getMsg: async () => ({
        elements: [{ type: 'file', name: 'source.md', file: mdPath }],
      }),
    },
  })

  assert.equal(txtContent, 'txt prompt')
  assert.equal(mdContent, '# Markdown prompt\n\n保留标题')
})

test('resolvePromptTextFromEvent prefers inline text and current file', async () => {
  const filePath = await createTempFile('current.md', 'file prompt')

  assert.equal(await resolvePromptTextFromEvent({
    msg: '#新增提示词 0 文本',
    elements: [{ type: 'file', name: 'current.md', file: filePath }],
    replyId: 'message-1',
    contact: { scene: 'group', peer: '10000', name: 'test-group' },
    bot: {
      getMsg: async () => ({ elements: [{ type: 'text', text: 'quoted prompt' }] }),
    },
  }, 'inline prompt'), 'inline prompt')

  assert.equal(await resolvePromptTextFromEvent({
    msg: '#新增提示词 0 文本',
    elements: [{ type: 'file', name: 'current.md', file: filePath }],
  }), 'file prompt')
})

test('prompt text extraction supports text and markdown elements', () => {
  assert.equal(extractPromptTextFromElements([
    { type: 'text', text: 'text' },
    { type: 'markdown', markdown: '**markdown**' },
  ]), 'text**markdown**')
})

test('resolvePromptTextFromEvent rejects unsupported file extensions without inline text', async () => {
  await assert.rejects(
    resolvePromptTextFromEvent({
      msg: '#新增提示词 0 文本',
      elements: [{ type: 'file', name: 'source.pdf', file: '/tmp/source.pdf' }],
    }),
    /只支持读取 \.txt 或 \.md/
  )
})
