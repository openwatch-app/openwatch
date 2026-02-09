import { videos, user, subscription, videoReactions, videoViews, watchHistory, notifications } from '~server/db/schema';
import { eq, count, and, gt, or, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import { unlink, rm } from 'fs/promises';
import { auth } from '~server/auth';
import { db } from '~server/db';
import { existsSync } from 'fs';
import { join } from 'path';
import dayjs from 'dayjs';
import axios from 'axios';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const VIEW_COOLDOWN_MINUTES = 15;

// Helper to resolve avatar path from PeerTube channel/account object
const resolvePeerTubeAvatar = (channel: any, account: any) => {
	// 1. Try Channel Avatar (object)
	if (channel?.avatar?.path) return channel.avatar.path;

	// 2. Try Channel Avatars (array) - prefer largest
	if (channel?.avatars && Array.isArray(channel.avatars) && channel.avatars.length > 0) {
		const sorted = [...channel.avatars].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
		return sorted[0].path;
	}

	// 3. Try Account Avatar (object)
	if (account?.avatar?.path) return account.avatar.path;

	// 4. Try Account Avatars (array)
	if (account?.avatars && Array.isArray(account.avatars) && account.avatars.length > 0) {
		const sorted = [...account.avatars].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
		return sorted[0].path;
	}

	return null;
};

// Helper to map remote video to internal Video interface
const mapRemoteVideoToResponse = (remoteVideo: any, host: string, uuid: string, videoUrl: string) => {
	return {
		id: `external:${host}:${uuid}`,
		title: remoteVideo.name,
		description: remoteVideo.description,
		thumbnailUrl: remoteVideo.thumbnailPath ? `https://${host}${remoteVideo.thumbnailPath}` : null,
		videoUrl: videoUrl,
		views: remoteVideo.views,
		duration: remoteVideo.duration,
		createdAt: new Date(remoteVideo.publishedAt),
		isExternal: true,
		visibility: 'public',
		status: 'ready',
		likes: remoteVideo.likes?.toString() || '0',
		dislikes: remoteVideo.dislikes?.toString() || '0',
		channel: {
			id: `external:${host}:${remoteVideo.channel.name}`,
			name: remoteVideo.channel.displayName,
			handle: `${remoteVideo.channel.name}@${host}`,
			avatar: resolvePeerTubeAvatar(remoteVideo.channel, remoteVideo.account) ? `https://${host}${resolvePeerTubeAvatar(remoteVideo.channel, remoteVideo.account)}` : null,
			subscribers: remoteVideo.channel.followersCount?.toString() || '0',
			verified: false,
			isSubscribed: false
		},
		userReaction: null
	};
};

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id: rawId } = await params;
		const id = decodeURIComponent(rawId);
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!id) {
			return NextResponse.json({ error: 'Missing Video ID' }, { status: 400 });
		}

		// Handle legacy "sepia-" IDs (backward compatibility)
		if (id.startsWith('sepia-')) {
			if (process.env.NEXT_PUBLIC_ENABLE_FEDERATION !== 'true') {
				return NextResponse.json({ error: 'Federation is disabled' }, { status: 403 });
			}
			try {
				const uuid = id.replace('sepia-', '');
				console.log(`Resolving legacy ID: ${id} -> UUID: ${uuid}`);

				// Resolve host via Sepia Search
				const { data } = await axios.get('https://sepiasearch.org/api/v1/search/videos', {
					params: { 'ids[]': uuid }
				});

				if (data.data && data.data.length > 0) {
					const item = data.data[0];
					const host = item.channel.host;
					console.log(`Resolved legacy ID to host: ${host}`);

					// Redirect to the new ID format logic by mutating 'id' and recursively calling or just jumping to logic?
					// Simpler: Just set the variables needed for the external logic and fall through?
					// Actually, better to just call the external logic here.

					// We'll reconstruct the ID as an external ID and let the next block handle it
					// But we can't easily jump. So let's duplicate the fetch logic or wrap it in a helper function?
					// Duplication is safer for a quick patch.

					// Fetch video details from external PeerTube instance
					console.log(`Fetching external video (legacy path): host=${host}, uuid=${uuid}`);
					const { data: remoteVideo } = await axios.get(`https://${host}/api/v1/videos/${uuid}`, {
						timeout: 5000
					});

					// Find best video URL (HLS preferred, then mp4)
					let videoUrl = '';
					if (remoteVideo.streamingPlaylists && remoteVideo.streamingPlaylists.length > 0) {
						videoUrl = remoteVideo.streamingPlaylists[0].playlistUrl;
					} else if (remoteVideo.files && remoteVideo.files.length > 0) {
						const files = [...remoteVideo.files].sort((a: any, b: any) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
						videoUrl = files[0].fileUrl;
					}

					if (!videoUrl) {
						return NextResponse.json({ error: 'No playable video found on remote server' }, { status: 404 });
					}

					const mappedVideo = mapRemoteVideoToResponse(remoteVideo, host, uuid, videoUrl);
					return NextResponse.json(mappedVideo);
				} else {
					return NextResponse.json({ error: `Could not resolve legacy ID: ${id}` }, { status: 404 });
				}
			} catch (error: any) {
				console.error('Failed to resolve legacy ID:', error.message);
				// Continue to normal DB check if failed, or return error?
				// If it was explicitly a sepia ID, we should probably fail here.
				return NextResponse.json({ error: `Failed to resolve legacy ID: ${error.message}` }, { status: 502 });
			}
		}

		// Check if it's an external video
		if (id.startsWith('external:')) {
			if (process.env.NEXT_PUBLIC_ENABLE_FEDERATION !== 'true') {
				return NextResponse.json({ error: 'Federation is disabled' }, { status: 403 });
			}
			try {
				const parts = id.split(':');
				// external:host:uuid
				if (parts.length < 3) throw new Error('Invalid external ID format');
				const host = parts[1];
				// Join the rest in case UUID has colons, though standard UUIDs don't
				const uuid = parts.slice(2).join(':');

				if (!host || host === 'undefined') {
					throw new Error('Missing host in external ID');
				}

				// Fetch video details from external PeerTube instance
				// Use the video API endpoint: /api/v1/videos/{id}
				console.log(`Fetching external video: host=${host}, uuid=${uuid}`);
				const { data: remoteVideo } = await axios.get(`https://${host}/api/v1/videos/${uuid}`, {
					timeout: 5000 // Add timeout to prevent long hangs
				});

				// Find best video URL (HLS preferred, then mp4)
				let videoUrl = '';
				if (remoteVideo.streamingPlaylists && remoteVideo.streamingPlaylists.length > 0) {
					videoUrl = remoteVideo.streamingPlaylists[0].playlistUrl;
				} else if (remoteVideo.files && remoteVideo.files.length > 0) {
					// Sort by resolution desc
					const files = [...remoteVideo.files].sort((a: any, b: any) => (b.resolution?.id || 0) - (a.resolution?.id || 0));
					videoUrl = files[0].fileUrl;
				}

				if (!videoUrl) {
					return NextResponse.json({ error: 'No playable video found on remote server' }, { status: 404 });
				}

				const channelId = `external:${host}:${remoteVideo.channel.name}`;
				const channelHandle = `${remoteVideo.channel.name}@${host}`;
				const channelEmail = `${remoteVideo.channel.name}@${host}.invalid`; // Fake email for external user

				// Upsert External User (Channel)
				await db
					.insert(user)
					.values({
						id: channelId,
						name: remoteVideo.channel.displayName || remoteVideo.channel.name,
						email: channelEmail,
						handle: channelHandle,
						host: host,
						image: resolvePeerTubeAvatar(remoteVideo.channel, remoteVideo.account) ? `https://${host}${resolvePeerTubeAvatar(remoteVideo.channel, remoteVideo.account)}` : null,
						verified: false,
						description: remoteVideo.channel.description,
						createdAt: new Date(remoteVideo.publishedAt), // Use video date as proxy or current date
						updatedAt: new Date()
					})
					.onConflictDoUpdate({
						target: user.id,
						set: {
							name: remoteVideo.channel.displayName || remoteVideo.channel.name,
							image: resolvePeerTubeAvatar(remoteVideo.channel, remoteVideo.account) ? `https://${host}${resolvePeerTubeAvatar(remoteVideo.channel, remoteVideo.account)}` : null,
							updatedAt: new Date()
						}
					});

				// Upsert External Video
				await db
					.insert(videos)
					.values({
						id: id,
						userId: channelId,
						title: remoteVideo.name,
						description: remoteVideo.description,
						duration: remoteVideo.duration,
						thumbnailUrl: remoteVideo.thumbnailPath ? `https://${host}${remoteVideo.thumbnailPath}` : null,
						views: remoteVideo.views,
						likes: remoteVideo.likes,
						dislikes: remoteVideo.dislikes,
						uploadDate: new Date(remoteVideo.publishedAt),
						isShort: remoteVideo.duration <= 60, // Auto-detect short
						host: host,
						externalUrl: videoUrl,
						status: 'ready',
						visibility: 'public',
						category: 'General', // Default
						updatedAt: new Date()
					})
					.onConflictDoUpdate({
						target: videos.id,
						set: {
							title: remoteVideo.name,
							description: remoteVideo.description,
							thumbnailUrl: remoteVideo.thumbnailPath ? `https://${host}${remoteVideo.thumbnailPath}` : null,
							views: remoteVideo.views,
							likes: remoteVideo.likes,
							dislikes: remoteVideo.dislikes,
							externalUrl: videoUrl,
							updatedAt: new Date()
						}
					});

				// Map to our Video structure
				const mappedVideo = mapRemoteVideoToResponse(remoteVideo, host, uuid, videoUrl);

				return NextResponse.json(mappedVideo);
			} catch (error: any) {
				console.error('Failed to fetch external video:', error.message);
				return NextResponse.json({ error: `Failed to load external video: ${error.message}` }, { status: 502 });
			}
		}

		// Fetch video with user details
		const videoData = await db.query.videos.findFirst({
			where: eq(videos.id, id),
			with: {
				user: true
			}
		});

		if (!videoData) {
			return NextResponse.json({ error: `Video not found (ID: ${id})` }, { status: 404 });
		}

		// Check visibility
		if (videoData.visibility === 'private' && videoData.userId !== session?.user?.id) {
			return NextResponse.json({ error: 'This video is private' }, { status: 403 });
		}

		// Record view (Server-side logic)
		const ipAddress = (req.headers.get('x-forwarded-for') ?? '127.0.0.1').split(',')[0].trim();
		const userId = session?.user?.id;

		let shouldRecord = true;
		if (userId) {
			const userRecord = await db.query.user.findFirst({
				where: eq(user.id, userId),
				columns: { isHistoryPaused: true }
			});
			if (userRecord?.isHistoryPaused) {
				shouldRecord = false;
			}
		}

		if (shouldRecord) {
			const cooldownTime = new Date(Date.now() - VIEW_COOLDOWN_MINUTES * 60 * 1000);

			// Check for recent views from this user or IP
			const recentView = await db.query.videoViews.findFirst({
				where: and(eq(videoViews.videoId, id), gt(videoViews.createdAt, cooldownTime), or(userId ? eq(videoViews.userId, userId) : undefined, eq(videoViews.ipAddress, ipAddress)))
			});

			if (!recentView) {
				// Record new view
				await db.transaction(async (tx) => {
					await tx.insert(videoViews).values({
						videoId: id,
						userId: userId || null,
						ipAddress: ipAddress
					});

					// Increment video view count
					await tx
						.update(videos)
						.set({ views: sql`${videos.views} + 1` })
						.where(eq(videos.id, id));
				});
				// Update local video data view count for response
				videoData.views += 1;
			}
		}

		// Get subscriber count for the channel owner
		const subscriberCountResult = await db.select({ value: count() }).from(subscription).where(eq(subscription.subscribedToId, videoData.userId));
		const subscriberCount = subscriberCountResult[0]?.value || 0;

		// Get likes count
		const likesCountResult = await db
			.select({ value: count() })
			.from(videoReactions)
			.where(and(eq(videoReactions.videoId, videoData.id), eq(videoReactions.type, 'LIKE')));
		const likesCount = likesCountResult[0]?.value || 0;

		// Get dislikes count
		const dislikesCountResult = await db
			.select({ value: count() })
			.from(videoReactions)
			.where(and(eq(videoReactions.videoId, videoData.id), eq(videoReactions.type, 'DISLIKE')));
		const dislikesCount = dislikesCountResult[0]?.value || 0;

		// Check if current user is subscribed and their reaction
		let isSubscribed = false;
		let notify = false;
		let userReaction: string | null = null;
		let savedProgress = 0;

		if (session?.user) {
			const sub = await db.query.subscription.findFirst({
				where: and(eq(subscription.subscriberId, session.user.id), eq(subscription.subscribedToId, videoData.userId))
			});
			if (sub) {
				isSubscribed = true;
				notify = sub.notify;
			}

			const reaction = await db.query.videoReactions.findFirst({
				where: and(eq(videoReactions.videoId, videoData.id), eq(videoReactions.userId, session.user.id))
			});
			if (reaction) {
				userReaction = reaction.type;
			}

			const history = await db.query.watchHistory.findFirst({
				where: and(eq(watchHistory.userId, session.user.id), eq(watchHistory.videoId, videoData.id))
			});
			if (history) {
				savedProgress = history.progress;
			}
		}

		const d = dayjs.duration(videoData.duration || 0, 'seconds');
		const formattedDuration = `${Math.floor(d.asMinutes())}:${d.seconds().toString().padStart(2, '0')}`;

		// Map to Video interface
		const responseData = {
			id: videoData.id,
			title: videoData.title || 'Untitled',
			thumbnail: videoData.thumbnailUrl || '/no-thumbnail.jpg',
			videoUrl: videoData.filename ? `/api/uploads/${videoData.filename}` : videoData.externalUrl || '', // Serve via API route
			duration: videoData.duration ? formattedDuration : '00:00',
			views: videoData.views.toString(),
			uploadedAt: videoData.createdAt.toISOString(),
			description: videoData.description,
			category: 'General', // Default category
			type: videoData.isShort ? 'short' : 'video',
			isShort: videoData.isShort,
			likes: likesCount.toString(),
			dislikes: dislikesCount.toString(),
			userReaction,
			savedProgress,
			status: videoData.status,
			visibility: videoData.visibility,
			restrictions: videoData.restrictions,
			channel: {
				id: videoData.user.id,
				name: videoData.user.name,
				avatar: videoData.user.image || '',
				handle: videoData.user.handle || '',
				subscribers: subscriberCount.toString(),
				videosCount: '0', // Not fetching count here for performance
				verified: videoData.user.verified,
				isSubscribed,
				notify
			}
		};

		return NextResponse.json(responseData);
	} catch (error) {
		console.error('Error fetching video:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

		const body = await req.json();
		const { title, description, visibility } = body;

		// Verify ownership
		const video = await db.query.videos.findFirst({
			where: eq(videos.id, id)
		});

		if (!video) {
			return NextResponse.json({ error: 'Video not found' }, { status: 404 });
		}

		if (video.userId !== session.user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Update video
		const updateData: any = {};
		if (title !== undefined) updateData.title = title;
		if (description !== undefined) updateData.description = description;
		if (visibility !== undefined) updateData.visibility = visibility;

		if (Object.keys(updateData).length > 0) {
			updateData.updatedAt = new Date();
			await db.update(videos).set(updateData).where(eq(videos.id, id));

			// Check for notification trigger: transitioning from non-public to public
			if (visibility === 'public' && video.visibility !== 'public') {
				try {
					// Fetch subscribers who want notifications
					const subscribersToNotify = await db.query.subscription.findMany({
						where: and(eq(subscription.subscribedToId, video.userId), eq(subscription.notify, true))
					});

					if (subscribersToNotify.length > 0) {
						const notificationsToInsert = subscribersToNotify.map((sub) => ({
							recipientId: sub.subscriberId,
							senderId: video.userId,
							type: 'VIDEO_UPLOAD' as const,
							resourceId: video.id,
							read: false
						}));

						// Insert notifications
						await db.insert(notifications).values(notificationsToInsert);
					}
				} catch (notificationError) {
					console.error('Error creating notifications:', notificationError);
				}
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error updating video:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

		// Verify ownership
		const video = await db.query.videos.findFirst({
			where: eq(videos.id, id)
		});

		if (!video) {
			return NextResponse.json({ error: 'Video not found' }, { status: 404 });
		}

		if (video.userId !== session.user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Delete files from storage
		try {
			// 1. Delete original upload
			if (video.filename) {
				const originalPath = join(process.cwd(), '.storage', 'videos', video.filename);
				if (existsSync(originalPath)) {
					await unlink(originalPath);
				}
			}

			// 2. Delete HLS streams and thumbnails directory
			const streamDir = join(process.cwd(), '.storage', 'streams', id);
			if (existsSync(streamDir)) {
				await rm(streamDir, { recursive: true, force: true });
			}
		} catch (fsError) {
			console.error('Error deleting files:', fsError);
			// Continue to delete from DB even if file deletion fails
		}

		// Delete video from DB
		await db.delete(videos).where(eq(videos.id, id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting video:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
