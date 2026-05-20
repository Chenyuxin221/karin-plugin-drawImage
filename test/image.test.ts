import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'

import { resolveApiImageInputs } from '../src/utils/image'

test('resolveApiImageInputs keeps original inputs in default mode', async () => {
  const input = ['https://cdn.example.com/input.png']
  const output = await resolveApiImageInputs(input, {
    imageUploadMode: 'default',
    imageUploadUrl: '',
    imageUploadToken: '',
    requestTimeoutSeconds: 3,
    outputFormat: 'png',
  })

  assert.deepEqual(output, input)
})

test('resolveApiImageInputs converts local file to data url in base64 mode', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'draw-image-input-'))
  const filePath = path.join(tempDir, 'input.png')
  await fs.writeFile(filePath, Buffer.from('fake-image-content'))

  const output = await resolveApiImageInputs([filePath], {
    imageUploadMode: 'base64',
    imageUploadUrl: '',
    imageUploadToken: '',
    requestTimeoutSeconds: 3,
    outputFormat: 'png',
  })

  assert.equal(output.length, 1)
  assert.match(output[0], /^data:image\/png;base64,/)
})

test('resolveApiImageInputs uses configured output format as fallback mime in base64 mode', async () => {
  const output = await resolveApiImageInputs(['base64://ZmFrZS1pbWFnZS1jb250ZW50'], {
    imageUploadMode: 'base64',
    imageUploadUrl: '',
    imageUploadToken: '',
    requestTimeoutSeconds: 3,
    outputFormat: 'jpeg',
  })

  assert.equal(output.length, 1)
  assert.match(output[0], /^data:image\/jpeg;base64,/)
})

test('resolveApiImageInputs uploads image and returns custom host url', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/source.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(Buffer.from('fake-image-content'))
      return
    }

    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    }

    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      assert.match(req.headers['content-type'] ?? '', /multipart\/form-data/)
      assert.equal(req.headers.authorization, 'Bearer upload-token')
      assert.match(body, /name="file"/)
      assert.match(body, /filename="source\.png"/)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        data: {
          url: 'https://upload.example.com/files/input.png',
        },
      }))
    })
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo

  try {
    const output = await resolveApiImageInputs([`http://127.0.0.1:${address.port}/source.png`], {
      imageUploadMode: 'custom',
      imageUploadUrl: `http://127.0.0.1:${address.port}/upload`,
      imageUploadToken: 'upload-token',
      requestTimeoutSeconds: 3,
      outputFormat: 'webp',
    })

    assert.deepEqual(output, ['https://upload.example.com/files/input.png'])
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('resolveApiImageInputs uses configured output format as fallback upload filename', async () => {
  const server = http.createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(405)
      res.end()
      return
    }

    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      assert.match(req.headers['content-type'] ?? '', /multipart\/form-data/)
      assert.equal(req.headers.authorization, 'Bearer upload-token')
      assert.match(body, /filename="image\.webp"/)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        data: {
          url: 'https://upload.example.com/files/image.webp',
        },
      }))
    })
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo

  try {
    const output = await resolveApiImageInputs(['base64://ZmFrZS1pbWFnZS1jb250ZW50'], {
      imageUploadMode: 'custom',
      imageUploadUrl: `http://127.0.0.1:${address.port}/upload`,
      imageUploadToken: 'upload-token',
      requestTimeoutSeconds: 3,
      outputFormat: 'webp',
    })

    assert.deepEqual(output, ['https://upload.example.com/files/image.webp'])
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
