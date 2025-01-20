import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearData() {
  try {
    // Delete all entries first due to foreign key constraints
    console.log('Deleting all entries...')
    await prisma.entry.deleteMany()
    
    // Then delete all sources
    console.log('Deleting all sources...')
    await prisma.source.deleteMany()
    
    console.log('All data cleared successfully!')
  } catch (error) {
    console.error('Error clearing data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearData()
