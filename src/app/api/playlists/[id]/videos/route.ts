
import { db } from '~server/db';
import { playlists, playlistItems } from '~server/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { generateId } from 'better-auth';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { videoId } = await req.json();

		if (!videoId) {
			return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
		}

		const playlist = await db.query.playlists.findFirst({
			where: eq(playlists.id, id)
		});

		if (!playlist) {
			return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
		}

		if (playlist.userId !== session.user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Check if already in playlist
		const existingItem = await db.query.playlistItems.findFirst({
			where: and(eq(playlistItems.playlistId, id), eq(playlistItems.videoId, videoId))
		});

		if (existingItem) {
			return NextResponse.json({ error: 'Video already in playlist' }, { status: 409 });
		}

		// Get max order and insert in transaction to avoid race conditions
		const [newItem] = await db.transaction(async (tx) => {
			const maxOrderResult = await tx.select({ maxOrder: sql<number>`MAX("order")` })
				.from(playlistItems)
				.where(eq(playlistItems.playlistId, id));
			
			const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

			return await tx.insert(playlistItems).values({
				id: generateId(),
				playlistId: id,
				videoId,
				order: nextOrder
			}).returning();
		});

		return NextResponse.json(newItem);
	} catch (error) {
		console.error('Error adding video to playlist:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const searchParams = req.nextUrl.searchParams;
		const videoId = searchParams.get('videoId');

		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!videoId) {
			return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
		}

		const playlist = await db.query.playlists.findFirst({
			where: eq(playlists.id, id)
		});

		if (!playlist) {
			return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
		}

		if (playlist.userId !== session.user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.delete(playlistItems)
			.where(and(eq(playlistItems.playlistId, id), eq(playlistItems.videoId, videoId)));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error removing video from playlist:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
