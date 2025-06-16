import { defineEventHandler, readMultipartFormData } from 'h3'
import { promises as fs } from 'fs'
import { nanoid } from 'nanoid'
import path from 'path'
import { validateAttachment } from '~/lib/attachmentRules'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'No form data found' })
  }

  const filePart = form.find(part => 'filename' in part && part.name === 'file') as { filename: string; data: Buffer; type: string } | undefined
  const modelPart = form.find(part => part.name === 'model' && !('filename' in part)) as { data: string | Buffer } | undefined

  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
  }

  const model = (typeof modelPart?.data === 'string' ? modelPart.data : (modelPart?.data ? modelPart.data.toString() : 'gpt-4o-mini'))
  const error = validateAttachment(model, { mimeType: filePart.type, size: filePart.data.length })
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error })
  }

  const uploadDir = path.resolve(process.cwd(), 'public/uploads')
  await fs.mkdir(uploadDir, { recursive: true })

  const ext = path.extname(filePart.filename) || ''
  const fileId = nanoid()
  const newFileName = `${fileId}${ext}`
  const filePath = path.join(uploadDir, newFileName)
  await fs.writeFile(filePath, filePart.data)

  const url = `/uploads/${newFileName}`
  // Construct absolute URL so the client can directly preview the file
  const protocol = (event.node.req.headers['x-forwarded-proto'] as string) || 'http'
  const host = event.node.req.headers.host || 'localhost:3000'
  const absoluteUrl = `${protocol}://${host}${url}`

  return {
    id: fileId,
    fileName: filePart.filename,
    mimeType: filePart.type,
    size: filePart.data.length,
    url: absoluteUrl,
    relativeUrl: url,
  }
}) 