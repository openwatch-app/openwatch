import { videos, user } from '~server/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { mapVideoToFrontend } from '~server/mappers';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '~server/db';

export const GET = async (req: NextRequest) => {
	try {
		const { searchParams } = new URL(req.url);
		const rawLimit = parseInt(searchParams.get('limit') || '5', 10);
		const limit = Number.isFinite(rawLimit) && !Number.isNaN(rawLimit) ? Math.max(1, Math.min(rawLimit, 100)) : 5;
		const excludeId = searchParams.get('exclude');

		const shorts = await db.query.videos.findMany({
			where: (videos, { eq, and, ne }) => {
				const conditions = [eq(videos.isShort, true), eq(videos.visibility, 'public'), eq(videos.status, 'ready')];
				if (excludeId) conditions.push(ne(videos.id, excludeId));
				return and(...conditions);
			},
			with: {
				user: true
			},
			limit: limit,
			orderBy: sql`RANDOM()`
		});

		const mapped = shorts.map(mapVideoToFrontend);

		return NextResponse.json(mapped);
	} catch (error) {
		console.error('Error fetching shorts:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
