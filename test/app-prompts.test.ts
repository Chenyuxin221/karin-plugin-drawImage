import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatPromptDetail,
  formatPromptList,
  handleAddPromptMessage,
  handleEditPromptMessage,
  handlePromptDetailMessage,
  handlePromptListMessage,
  handleRemovePromptMessage,
} from '../src/apps/prompts'
import type { PromptRecord } from '../src/utils/prompts'

function createPrompt (overrides: Partial<PromptRecord> = {}): PromptRecord {
  return {
    id: 'p001',
    type: 0,
    name: '日系头像',
    text: '柔和光线',
    ...overrides,
  }
}

test('prompt list and detail formatters include type and content', () => {
  const prompt = createPrompt({ type: 1 })

  assert.equal(formatPromptList([prompt]), '提示词列表：\np001 [1] 日系头像')
  assert.match(formatPromptDetail(prompt), /类型：1（需要图片）/)
  assert.match(formatPromptDetail(prompt), /柔和光线/)
})

test('handlePromptListMessage replies saved prompts', async () => {
  const replies: unknown[] = []

  await handlePromptListMessage({
    msg: '#提示词',
    reply: async message => replies.push(message),
  }, {
    list: () => [createPrompt()],
  })

  assert.equal(replies[0], '提示词列表：\np001 [0] 日系头像')
})

test('handlePromptDetailMessage reports missing ids', async () => {
  const replies: unknown[] = []

  await handlePromptDetailMessage({
    msg: '#提示词 p999',
    reply: async message => replies.push(message),
  }, {
    get: () => undefined,
  })

  assert.equal(replies[0], '未找到提示词：p999')
})

test('handleAddPromptMessage accepts inline text without a third required argument', async () => {
  const replies: unknown[] = []
  let input: { type: 0 | 1, name: string, text: string } | undefined

  await handleAddPromptMessage({
    msg: '#新增提示词 1 人物改图 保留人物主体',
    hasPermission: () => true,
    reply: async message => replies.push(message),
  }, {
    add: value => {
      input = value
      return createPrompt({ id: 'p002', ...value })
    },
  })

  assert.deepEqual(input, {
    type: 1,
    name: '人物改图',
    text: '保留人物主体',
  })
  assert.equal(replies[0], '提示词已新增：p002 人物改图')
})

test('handleAddPromptMessage reads quoted text when inline text is absent', async () => {
  const replies: unknown[] = []
  let savedText = ''

  await handleAddPromptMessage({
    msg: '#新增提示词 0 纯文本',
    hasPermission: () => true,
    reply: async message => replies.push(message),
    replyId: 'quoted-message',
    contact: { scene: 'group', peer: '10000', name: 'test-group' },
    bot: {
      getMsg: async () => ({ elements: [{ type: 'text', text: '来自引用消息的正文' }] }),
    },
  }, {
    add: value => {
      savedText = value.text
      return createPrompt({ ...value })
    },
  })

  assert.equal(savedText, '来自引用消息的正文')
  assert.equal(replies[0], '提示词已新增：p001 纯文本')
})

test('prompt management commands require group admin permission', async () => {
  const replies: unknown[] = []
  let addCalled = false

  await handleAddPromptMessage({
    msg: '#新增提示词 0 文本 正文',
    hasPermission: () => false,
    reply: async message => replies.push(message),
  }, {
    add: value => {
      addCalled = true
      return createPrompt(value)
    },
  })

  assert.equal(addCalled, false)
  assert.equal(replies[0], '只有管理员或群主可以管理提示词')
})

test('handleEditPromptMessage and handleRemovePromptMessage use ids', async () => {
  const replies: unknown[] = []
  let edited: { id: string, type: 0 | 1, name: string, text: string } | undefined
  let removed = ''

  await handleEditPromptMessage({
    msg: '#编辑提示词 p001 0 新名称 新正文',
    hasPermission: () => true,
    reply: async message => replies.push(message),
  }, {
    update: (id, value) => {
      edited = { id, ...value }
      return createPrompt({ id, ...value })
    },
  })
  await handleRemovePromptMessage({
    msg: '#删除提示词 p001',
    hasPermission: () => true,
    reply: async message => replies.push(message),
  }, {
    remove: id => {
      removed = id
      return createPrompt({ id })
    },
  })

  assert.deepEqual(edited, {
    id: 'p001',
    type: 0,
    name: '新名称',
    text: '新正文',
  })
  assert.equal(removed, 'p001')
  assert.equal(replies[0], '提示词已更新：p001 新名称')
  assert.equal(replies[1], '提示词已删除：p001 日系头像')
})
