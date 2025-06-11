import { db } from './index'
import { users, conversations, messages } from './schema'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // Create demo user
    const demoUserId = nanoid()
    const hashedPassword = await bcrypt.hash('demo123', 12)
    
    await db.insert(users).values({
      id: demoUserId,
      email: 'demo@local.test',
      fullName: 'Demo User',
      hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing()

    console.log('✅ Demo user created')

    // Create sample conversation
    const conversationId = nanoid()
    await db.insert(conversations).values({
      id: conversationId,
      userId: demoUserId,
      title: 'Welcome to GhazelleChat!',
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoNothing()

    // Create sample messages
    const userMessageId = nanoid()
    const assistantMessageId = nanoid()

    await db.insert(messages).values([
      {
        id: userMessageId,
        conversationId,
        role: 'user',
        content: 'Hello! How does GhazelleChat work?',
        createdAt: new Date()
      },
      {
        id: assistantMessageId,
        conversationId,
        role: 'assistant',
        content: `Hello! Welcome to GhazelleChat! 🚀

I'm your AI assistant, and here's how we work together:

**🔄 Real-time Streaming**: I respond token-by-token in real-time, so you see my thoughts as they form.

**🤖 Multiple Models**: You can switch between different AI models:
- OpenAI GPT-4o and GPT-4o Mini
- Anthropic Claude 3.5 Sonnet  
- Groq Llama 3.1 70B

**💾 Persistent History**: All our conversations are saved and synced across your devices.

**⚡ Gazelle Speed**: Built for speed - optimized for edge deployment with <400ms first token latency.

**🌙 Dark Mode**: Toggle between light and dark themes using the button in the header.

Feel free to ask me anything - I can help with information, creative tasks, problem-solving, coding, and much more!

What would you like to explore today?`,
        model: 'gpt-4o-mini',
        createdAt: new Date()
      }
    ]).onConflictDoNothing()

    console.log('✅ Sample conversation created')
    console.log('🎉 Database seeded successfully!')
    console.log('\n📧 Demo credentials:')
    console.log('   Email: demo@local.test')
    console.log('   Password: demo123')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed() 