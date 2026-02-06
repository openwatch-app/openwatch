import { db } from '~server/db';
import { playlists, playlistItems, videos } from '~server/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { generateId } from 'better-auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = req.nextUrl.searchParams;
		const containsVideoId = searchParams.get('containsVideoId');

		const userPlaylists = await db
			.select({
				id: playlists.id,
				title: playlists.title,
				description: playlists.description,
				visibility: playlists.visibility,
				createdAt: playlists.createdAt,
				updatedAt: playlists.updatedAt,
				videoCount: count(playlistItems.id),
				firstVideoThumbnail: sql<string>`(
					SELECT v.thumbnail_url 
					FROM ${playlistItems} pi
					JOIN ${videos} v ON v.id = pi.video_id
					WHERE pi.playlist_id = ${playlists.id}
					ORDER BY pi.added_at ASC
					LIMIT 1
				)`,
				hasVideo: containsVideoId
					? sql<boolean>`EXISTS (
					SELECT 1 FROM ${playlistItems} pi 
					WHERE pi.playlist_id = ${playlists.id} 
					AND pi.video_id = ${containsVideoId}
				)`
					: sql<boolean>`false`
			})
			.from(playlists)
			.leftJoin(playlistItems, eq(playlists.id, playlistItems.playlistId))
			.where(eq(playlists.userId, session.user.id))
			.groupBy(playlists.id)
			.orderBy(desc(playlists.updatedAt));

		return NextResponse.json(userPlaylists);
	} catch (error) {
		console.error('Error fetching playlists:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const POST = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { title, visibility = 'public', description } = await req.json();

		if (!title) {
			return NextResponse.json({ error: 'Title is required' }, { status: 400 });
		}

		// Validate visibility parameter
		if (!['public', 'private'].includes(visibility)) {
			return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
		}

		const [newPlaylist] = await db
			.insert(playlists)
			.values({
				id: generateId(),
				userId: session.user.id,
				title,
				description,
				visibility
			})
			.returning();

		return NextResponse.json(newPlaylist);
	} catch (error) {
		console.error('Error creating playlist:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
