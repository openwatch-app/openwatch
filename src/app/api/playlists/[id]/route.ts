
import { db } from '~server/db';
import { playlists, playlistItems, videos, user } from '~server/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { mapVideoToFrontend } from '~server/mappers';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		const playlist = await db.query.playlists.findFirst({
			where: eq(playlists.id, id),
			with: {
				user: true
			}
		});

		if (!playlist) {
			return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
		}

		// Check visibility
		if (playlist.visibility === 'private' && playlist.userId !== session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
		}

		// Fetch videos in playlist
		const items = await db.query.playlistItems.findMany({
			where: eq(playlistItems.playlistId, id),
			orderBy: [asc(playlistItems.order)],
			with: {
				video: {
					with: {
						user: true
					}
				}
			}
		});

		const videosMapped = items.map(item => ({
			...mapVideoToFrontend(item.video),
			playlistItemId: item.id,
			order: item.order,
			addedAt: item.addedAt
		}));

		return NextResponse.json({
			...playlist,
			videos: videosMapped
		});
	} catch (error) {
		console.error('Error fetching playlist:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const PUT = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

		const { title, description, visibility } = await req.json();

		const [updatedPlaylist] = await db.update(playlists)
			.set({
				title: title || playlist.title,
				description: description !== undefined ? description : playlist.description,
				visibility: visibility || playlist.visibility,
				updatedAt: new Date()
			})
			.where(eq(playlists.id, id))
			.returning();

		return NextResponse.json(updatedPlaylist);
	} catch (error) {
		console.error('Error updating playlist:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

		await db.delete(playlists).where(eq(playlists.id, id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting playlist:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
