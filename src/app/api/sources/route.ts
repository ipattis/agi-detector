import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { crawlUrl } from '@/lib/crawler'

const prisma = new PrismaClient()

// Input validation schema
const sourceSchema = z.object({
  url: z.string().url(),
  contentHints: z.string().optional().nullable(),
  crawlSchedule: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url, contentHints, crawlSchedule } = sourceSchema.parse(body)

    const source = await prisma.source.create({
      data: {
        url,
        contentHints: contentHints || null,
        crawlSchedule: crawlSchedule || null,
        status: 'ACTIVE',
      },
    })

    // Trigger initial crawl
    await crawlUrl(source.id)

    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      include: {
        entries: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}
