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

dayjs.extend(duration);
dayjs.extend(relativeTime);

const VIEW_COOLDOWN_MINUTES = 15;

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!id) {
			return NextResponse.json({ error: 'Missing Video ID' }, { status: 400 });
		}

		// Fetch video with user details
		const videoData = await db.query.videos.findFirst({
			where: eq(videos.id, id),
			with: {
				user: true
			}
		});

		if (!videoData) {
			return NextResponse.json({ error: 'Video not found' }, { status: 404 });
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
			thumbnail: videoData.thumbnailUrl || '/placeholder.jpg',
			videoUrl: `/api/uploads/${videoData.filename}`, // Serve via API route
			duration: videoData.duration ? formattedDuration : '00:00',
			views: videoData.views.toString(),
			uploadedAt: dayjs(videoData.createdAt).fromNow(),
			description: videoData.description,
			category: 'General', // Default category
			type: 'video',
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
