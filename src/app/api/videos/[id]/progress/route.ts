import { watchHistory, videos } from '~server/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { eq } from 'drizzle-orm';
import { db } from '~server/db';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!id) {
			return NextResponse.json({ error: 'Missing Video ID' }, { status: 400 });
		}

		let body;
		const contentType = req.headers.get('content-type') || '';

		try {
			if (contentType.includes('application/json')) {
				body = await req.json();
			} else {
				// Fallback for text/plain (sendBeacon)
				const text = await req.text();
				if (text) {
					body = JSON.parse(text);
				} else {
					return NextResponse.json({ error: 'Empty body' }, { status: 400 });
				}
			}
		} catch (error) {
			return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
		}

		const { progress, completed } = body;

		if (typeof progress !== 'number') {
			return NextResponse.json({ error: 'Invalid progress value' }, { status: 400 });
		}

		// Check if video exists
		const video = await db.query.videos.findFirst({
			where: eq(videos.id, id)
		});

		if (!video) {
			return NextResponse.json({ error: 'Video not found' }, { status: 404 });
		}

		// Upsert watch history
		await db
			.insert(watchHistory)
			.values({
				userId: session.user.id,
				videoId: id,
				progress,
				lastViewedAt: new Date(),
				completed: completed || false
			})
			.onConflictDoUpdate({
				target: [watchHistory.userId, watchHistory.videoId],
				set: {
					progress,
					lastViewedAt: new Date(),
					completed: completed || false
				}
			});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error saving progress:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
