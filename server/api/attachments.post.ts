import { defineEventHandler, readMultipartFormData } from 'h3'
import { promises as fs } from 'fs'
import { nanoid } from 'nanoid'
import path from 'path'
import { validateAttachment } from '~/lib/attachmentRules'
import { DEFAULT_MODEL_ID } from '~/lib/models/registry'

export default defineEventHandler(async (event) => {
  try {
    const form = await readMultipartFormData(event)
    if (!form) {
      throw createError({ statusCode: 400, statusMessage: 'No form data found' })
    }

    const filePart = form.find(part => 'filename' in part && part.name === 'file') as { filename: string; data: Buffer; type: string } | undefined
    const modelPart = form.find(part => part.name === 'model' && !('filename' in part)) as { data: string | Buffer } | undefined

    if (!filePart) {
      throw createError({ statusCode: 400, statusMessage: 'Missing file field' })
    }

    const model = (typeof modelPart?.data === 'string' ? modelPart.data : (modelPart?.data ? modelPart.data.toString() : DEFAULT_MODEL_ID))
    const error = validateAttachment(model, { mimeType: filePart.type, size: filePart.data.length })
    if (error) {
      throw createError({ statusCode: 400, statusMessage: error })
    }

    const ext = path.extname(filePart.filename) || ''
    const fileId = nanoid()
    const newFileName = `${fileId}${ext}`

    // Handle cross-platform path differences (Windows vs WSL/Linux)
    // In production, we need to store files where Nitro can serve them
    const uploadDir = path.resolve(process.cwd(), 'public', 'uploads')
    
    try {
      // Ensure directory exists with proper permissions for WSL/Linux
      await fs.mkdir(uploadDir, { recursive: true, mode: 0o755 })
      const filePath = path.join(uploadDir, newFileName)
      
      // Write file with proper permissions for WSL/Linux
      await fs.writeFile(filePath, filePart.data, { mode: 0o644 })

      // Construct URLs - use API route for serving in dev mode to handle WSL issues
      const isDev = process.env.NODE_ENV === 'development'
      const relativeUrl = isDev ? `/api/uploads/${newFileName}` : `/uploads/${newFileName}`
      const protocol = (event.node.req.headers['x-forwarded-proto'] as string) || 'http'
      const host = event.node.req.headers.host || 'localhost:3000'
      const absoluteUrl = `${protocol}://${host}${relativeUrl}`

      // File uploaded successfully

      return {
        id: fileId,
        fileName: filePart.filename,
        mimeType: filePart.type,
        size: filePart.data.length,
        url: absoluteUrl,
        relativeUrl,
      }
    } catch (fsError) {
      console.error('File system error:', fsError)
      throw createError({ 
        statusCode: 500, 
        statusMessage: 'Failed to save file' 
      })
    }
  } catch (error: any) {
    console.error('Attachment upload error:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Internal server error during file upload' 
    })
  }
}) 