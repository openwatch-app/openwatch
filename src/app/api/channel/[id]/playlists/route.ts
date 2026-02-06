import { db } from '~server/db';
import { playlists, playlistItems, videos, user } from '~server/db/schema';
import { eq, desc, count, sql, and, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		const { id } = await params;

		if (!id) {
			return NextResponse.json({ error: 'Missing ID or Handle' }, { status: 400 });
		}

		const decodedId = decodeURIComponent(id);

		// Find user by ID or Handle
		const channelUser = await db.query.user.findFirst({
			where: or(eq(user.id, decodedId), eq(user.handle, decodedId), eq(user.handle, decodedId.startsWith('@') ? decodedId : `@${decodedId}`))
		});

		if (!channelUser) {
			return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
		}

		const isOwner = session?.user?.id === channelUser.id;

		// Build where clause
		const whereClause = isOwner ? eq(playlists.userId, channelUser.id) : and(eq(playlists.userId, channelUser.id), eq(playlists.visibility, 'public'));

		const channelPlaylists = await db
			.select({
				id: playlists.id,
				title: playlists.title,
				visibility: playlists.visibility,
				updatedAt: playlists.updatedAt,
				videoCount: count(playlistItems.id),
				firstVideoThumbnail: sql<string>`(
					SELECT v.thumbnail_url 
					FROM ${playlistItems} pi
					JOIN ${videos} v ON v.id = pi.video_id
					WHERE pi.playlist_id = ${playlists.id}
					ORDER BY pi.added_at ASC
					LIMIT 1
				)`
			})
			.from(playlists)
			.leftJoin(playlistItems, eq(playlists.id, playlistItems.playlistId))
			.where(whereClause)
			.groupBy(playlists.id)
			.orderBy(desc(playlists.updatedAt));

		return NextResponse.json(channelPlaylists);
	} catch (error) {
		console.error('Error fetching channel playlists:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
