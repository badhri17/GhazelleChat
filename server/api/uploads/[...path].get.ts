import { defineEventHandler } from 'h3'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  try {
    const filePath = getRouterParam(event, 'path')
    console.log('📁 File serving request:', filePath)
    
    if (!filePath) {
      console.log('❌ No file path provided')
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'File not found' 
      })
    }

    // Security: prevent directory traversal and normalize path
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '')
    
    if (normalizedPath.includes('..') || normalizedPath !== path.basename(normalizedPath)) {
      throw createError({ 
        statusCode: 403, 
        statusMessage: 'Invalid file path' 
      })
    }

    // Try multiple possible upload directories (dev vs production)
    const possibleDirs = [
      path.resolve(process.cwd(), 'public', 'uploads'),
      path.resolve(process.cwd(), '.output', 'public', 'uploads'),
      path.resolve(process.cwd(), 'dist', 'public', 'uploads')
    ]
    
    let fullPath: string | null = null
    
    console.log('🔍 Searching in directories:', possibleDirs)
    
    for (const dir of possibleDirs) {
      const testPath = path.join(dir, normalizedPath)
      console.log('🔍 Testing path:', testPath)
      try {
        await fs.access(testPath)
        console.log('✅ Found file at:', testPath)
        fullPath = testPath
        break
      } catch (error) {
        console.log('❌ File not found at:', testPath, 'Error:', (error as Error).message)
        continue
      }
    }
    
    if (!fullPath) {
      console.log('❌ File not found in any directory')
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'File not found' 
      })
    }

    // Read and serve the file
    const fileBuffer = await fs.readFile(fullPath)
    
    // Set appropriate headers based on file extension
    const ext = path.extname(normalizedPath).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.png':
        contentType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.pdf':
        contentType = 'application/pdf'
        break
    }

    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Cache-Control', 'public, max-age=604800') // 7 days

    return fileBuffer
  } catch (error: any) {
    console.error('Error serving uploaded file:', error)
    if (error.statusCode) {
      throw error
    }
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Failed to serve file' 
    })
  }
}) 