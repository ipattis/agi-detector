import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const source = await prisma.source.findUnique({
      where: {
        id: params.id,
      },
      include: {
        entries: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!source) {
      return new NextResponse('Source not found', { status: 404 })
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Error fetching source:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
