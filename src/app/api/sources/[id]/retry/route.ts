import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { crawlUrl } from '@/lib/crawler'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Reset source status
    await prisma.source.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'ACTIVE',
        lastError: null,
      },
    })

    // Trigger new crawl
    await crawlUrl(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error retrying source:', error)
    return NextResponse.json(
      { error: 'Failed to retry source' },
      { status: 500 }
    )
  }
}
