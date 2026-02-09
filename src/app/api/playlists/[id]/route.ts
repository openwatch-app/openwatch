import { mapVideoToFrontend, formatDuration } from '~server/mappers';
import { playlists, playlistItems } from '~server/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { auth } from '~server/auth';
import { db } from '~server/db';
import axios from 'axios';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		// Handle External Playlists
		if (id.startsWith('external:')) {
			const parts = id.split(':');
			// Format: external:host:uuid
			if (parts.length < 3) {
				return NextResponse.json({ error: 'Invalid external playlist ID' }, { status: 400 });
			}

			const host = parts[1];
			const uuid = parts.slice(2).join(':'); // Join back in case uuid has colons (unlikely but safe)

			// Validate host
			try {
				const url = new URL(`https://${host}`);
				if (url.protocol !== 'https:') throw new Error('Invalid protocol');
				// Block loopback and private ranges (basic string check)
				const h = url.hostname;
				if (
					h === 'localhost' ||
					h === '::1' ||
					h.startsWith('127.') ||
					h.startsWith('10.') ||
					h.startsWith('192.168.') ||
					h.startsWith('169.254.') ||
					(h.startsWith('172.') && parseInt(h.split('.')[1]) >= 16 && parseInt(h.split('.')[1]) <= 31)
				) {
					throw new Error('Private IP range blocked');
				}
			} catch (e) {
				return NextResponse.json({ error: 'Invalid or forbidden host' }, { status: 400 });
			}

			try {
				// Fetch playlist details
				const playlistUrl = `https://${host}/api/v1/video-playlists/${uuid}`;
				const { data: playlistData } = await axios.get(playlistUrl, { timeout: 5000, maxRedirects: 0 });

				// Fetch playlist videos
				// PeerTube uses /videos endpoint for playlist items
				const videosUrl = `https://${host}/api/v1/video-playlists/${uuid}/videos`;
				const { data: videosData } = await axios.get(videosUrl, {
					params: { count: 100 }, // Fetch reasonable amount
					timeout: 5000,
					maxRedirects: 0
				});

				const ownerHandle = `${playlistData.ownerAccount.name}@${playlistData.ownerAccount.host}`;
				const ownerName = playlistData.ownerAccount.displayName || playlistData.ownerAccount.name;

				// Map videos
				const mappedVideos = videosData.data.map((item: any, index: number) => {
					const v = item.video;
					const videoHost = v.account.host || host;
					const videoId = `external:${videoHost}:${v.uuid}`;

					return {
						id: videoId,
						title: v.name,
						thumbnail: v.thumbnailPath ? (v.thumbnailPath.startsWith('http') ? v.thumbnailPath : `https://${videoHost}${v.thumbnailPath}`) : '/images/no-thumbnail.jpg',
						videoUrl: `/watch/${videoId}`,
						duration: formatDuration(v.duration),
						durationInSeconds: v.duration,
						views: (v.views ?? 0).toString(),
						uploadedAt: v.publishedAt,
						description: v.description || '', // PeerTube videos might not have description in list view
						category: v.category?.label || 'General',
						type: 'video',
						isShort: v.duration < 60,
						status: 'ready',
						visibility: 'public',
						likes: v.likes?.toString() || '0',
						dislikes: '0',
						isExternal: true,

						// Playlist Item specific
						playlistItemId: `external-item-${item.id}`, // specific to playlist item
						order: index + 1,
						addedAt: new Date().toISOString(), // We don't have addedAt usually, or could use item.createdAt if available

						channel: {
							id: `external:${v.account.host || host}:${v.account.name}`,
							name: v.account.displayName || v.account.name,
							handle: `${v.account.name}@${v.account.host || host}`,
							avatar: v.account.avatar?.path ? `https://${v.account.host || host}${v.account.avatar.path}` : '',
							email: '',
							subscribers: '0',
							videosCount: '0',
							verified: false
						}
					};
				});

				return NextResponse.json({
					id: id,
					title: playlistData.displayName,
					description: playlistData.description,
					visibility: 'public', // External playlists are public by definition for us
					userId: `external:${host}:${playlistData.ownerAccount.name}`,
					createdAt: playlistData.createdAt,
					updatedAt: playlistData.updatedAt,
					user: {
						id: `external:${host}:${playlistData.ownerAccount.name}`,
						name: ownerName,
						handle: ownerHandle,
						avatar: playlistData.ownerAccount.avatar?.path ? `https://${host}${playlistData.ownerAccount.avatar.path}` : ''
					},
					videos: mappedVideos
				});
			} catch (err) {
				console.error('Error fetching external playlist:', err);
				return NextResponse.json({ error: 'Failed to fetch external playlist' }, { status: 502 });
			}
		}

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

		const videosMapped = items.map((item) => ({
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

		const [updatedPlaylist] = await db
			.update(playlists)
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
