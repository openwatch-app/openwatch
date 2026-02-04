import { videos, videoViews, subscription, user, watchHistory } from '~server/db/schema';
import { desc, eq, and, not, sql, or, ilike, inArray } from 'drizzle-orm';
import { db } from '~server/db';

// Helper to calculate similarity score between two strings (titles)
function calculateTextSimilarity(text1: string | null, text2: string | null): number {
	if (!text1 || !text2) return 0;
	const words1 = new Set(
		text1
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 3)
	);
	const words2 = new Set(
		text2
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 3)
	);
	let intersection = 0;
	words1.forEach((w) => {
		if (words2.has(w)) intersection++;
	});
	return intersection; // Return number of matching words
}

export class RecommendationService {
	// Get personalized home feed
	static async getHomeFeed(userId?: string, limit: number = 20, offset: number = 0, filter?: string) {
		// Handle special filters
		if (filter === 'watched' && userId) {
			const history = await db.query.watchHistory.findMany({
				where: eq(watchHistory.userId, userId),
				orderBy: [desc(watchHistory.lastViewedAt)],
				limit,
				offset,
				with: {
					video: {
						with: { user: true }
					}
				}
			});
			// Filter out null videos (deleted) and deduplicate by videoId if needed
			// (simple approach: just map)
			return history
				.filter((h) => !!h.video)
				.map((h) => ({
					...h.video,
					savedProgress: h.progress
				}));
		}

		if (filter === 'recently-uploaded') {
			return db.query.videos.findMany({
				where: eq(videos.visibility, 'public'),
				orderBy: [desc(videos.createdAt)],
				limit,
				offset,
				with: { user: true }
			});
		}

		// Normal Smart Feed (for 'all' or specific category)

		// 1. If user is logged in, gather signals
		let subscribedChannelIds: string[] = [];
		let recentWatchedCategory: string | null = null;

		if (userId) {
			// Get subscriptions
			const subs = await db.query.subscription.findMany({
				where: eq(subscription.subscriberId, userId),
				columns: { subscribedToId: true }
			});
			subscribedChannelIds = subs.map((s) => s.subscribedToId);

			// Get last watched video to infer interest
			const lastView = await db.query.videoViews.findFirst({
				where: eq(videoViews.userId, userId),
				orderBy: [desc(videoViews.createdAt)],
				with: {
					video: true
				}
			});
			if (lastView?.video) {
				recentWatchedCategory = lastView.video.category;
			}
		}

		// 2. Fetch candidates (fetch more than limit to rank them)
		// We mix:
		// - Videos from subscriptions (if any)
		// - Recent videos
		// - Popular videos

		// For simplicity, we'll fetch a batch of recent videos and rank them in memory
		// In a real large-scale app, we'd push this logic to the DB or a search engine
		const candidates = await db.query.videos.findMany({
			where: eq(videos.visibility, 'public'),
			limit: 100, // Fetch pool of 100 candidates
			orderBy: [desc(videos.createdAt)], // Bias towards recent
			with: {
				user: true // For channel info
			}
		});

		// 3. Rank candidates
		const scoredCandidates = candidates.map((video) => {
			let score = 0;

			// Signal 1: Recency (decay over time)
			const daysOld = (Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60 * 24);
			score += Math.max(0, 10 - daysOld); // boost for fresh content

			// Signal 2: Subscriptions
			if (subscribedChannelIds.includes(video.userId)) {
				score += 20;
			}

			// Signal 3: Category match
			if (recentWatchedCategory && video.category === recentWatchedCategory) {
				score += 5;
			}

			// Signal 4: Popularity (views)
			score += Math.log10(video.views + 1) * 2;

			return { video, score };
		});

		// Sort by score
		scoredCandidates.sort((a, b) => b.score - a.score);

		let finalVideos = scoredCandidates.slice(offset, offset + limit).map((c) => c.video);

		// Populate watch progress if user is logged in
		if (userId && finalVideos.length > 0) {
			const videoIds = finalVideos.map((v) => v.id);
			const history = await db.query.watchHistory.findMany({
				where: and(eq(watchHistory.userId, userId), inArray(watchHistory.videoId, videoIds))
			});
			const historyMap = new Map(history.map((h) => [h.videoId, h.progress]));
			finalVideos = finalVideos.map((v) => ({
				...v,
				savedProgress: historyMap.get(v.id)
			}));
		}

		return finalVideos;
	}

	static async search(query: string, limit: number = 20, offset: number = 0, userId?: string) {
		let videoResults = await db.query.videos.findMany({
			where: and(eq(videos.visibility, 'public'), or(ilike(videos.title, `%${query}%`), ilike(videos.description, `%${query}%`))),
			limit,
			offset,
			orderBy: [desc(videos.views)], // Order by views for now
			with: {
				user: true
			}
		});

		// Populate watch progress if user is logged in
		if (userId && videoResults.length > 0) {
			const videoIds = videoResults.map((v) => v.id);
			const history = await db.query.watchHistory.findMany({
				where: and(eq(watchHistory.userId, userId), inArray(watchHistory.videoId, videoIds))
			});
			const historyMap = new Map(history.map((h) => [h.videoId, h.progress]));
			videoResults = videoResults.map((v) => ({
				...v,
				savedProgress: historyMap.get(v.id)
			}));
		}

		// Only search channels on the first page
		let channelResults: any[] = [];
		if (offset === 0) {
			channelResults = await db.query.user.findMany({
				where: or(ilike(user.name, `%${query}%`), ilike(user.handle, `%${query}%`)),
				limit: 3 // Limit to top 3 matching channels
			});
		}

		return { videos: videoResults, channels: channelResults };
	}

	// Get related videos for Watch Page
	static async getRelatedVideos(currentVideoId: string, userId?: string, limit: number = 10) {
		// 1. Get source video details
		const sourceVideo = await db.query.videos.findFirst({
			where: eq(videos.id, currentVideoId)
		});

		if (!sourceVideo) return [];

		// 2. Collaborative Filtering Signal (Users who watched this also watched...)
		// This is a simplified "People who watched X also watched Y" query
		// We find views by users who viewed the current video
		const collaborativeIds = await db.execute(sql`
      SELECT v.id, COUNT(*) as overlap_count
      FROM ${videoViews} vv1
      JOIN ${videoViews} vv2 ON vv1.user_id = vv2.user_id
      JOIN ${videos} v ON vv2.video_id = v.id
      WHERE vv1.video_id = ${currentVideoId}
      AND vv2.video_id != ${currentVideoId}
      AND v.visibility = 'public'
      GROUP BY v.id
      ORDER BY overlap_count DESC
      LIMIT 20
    `);

		// Create a map for quick lookup of collaborative scores
		const collabScoreMap = new Map<string, number>();
		collaborativeIds.forEach((row: any) => {
			collabScoreMap.set(row.id, Number(row.overlap_count));
		});

		// 3. Content-Based Candidates
		// Fetch videos with same category or same author
		const contentCandidates = await db.query.videos.findMany({
			where: and(
				eq(videos.visibility, 'public'),
				not(eq(videos.id, currentVideoId)),
				or(
					eq(videos.userId, sourceVideo.userId), // Same author
					eq(videos.category, sourceVideo.category) // Same category
				)
			),
			limit: 50,
			with: {
				user: true
			}
		});

		// 4. Merge and Rank
		// We combine collaborative candidates (if not already in content candidates) and content candidates
		const allCandidatesMap = new Map<string, any>();

		// Add content candidates
		contentCandidates.forEach((v) => allCandidatesMap.set(v.id, v));

		// If we need more candidates, we could fetch random ones, but let's stick to these for now.
		// (Note: collaborativeIds only gave us IDs, we need to fetch full objects if they aren't in contentCandidates.
		// For simplicity, we'll only rank the ones we fully fetched or fetch missing ones if needed.
		// To save DB calls, let's just use the contentCandidates + maybe fetch specific IDs from collab if vital.
		// For this implementation, we'll assume contentCandidates cover most relevant ones due to category overlap.)

		const scored = Array.from(allCandidatesMap.values()).map((video) => {
			let score = 0;

			// 1. Collaborative Score (High weight)
			const collabCount = collabScoreMap.get(video.id) || 0;
			score += collabCount * 10;

			// 2. Content Similarity
			if (video.userId === sourceVideo.userId) score += 30; // Same author
			if (video.category === sourceVideo.category) score += 15; // Same category

			// Title Similarity
			const titleSim = calculateTextSimilarity(sourceVideo.title, video.title);
			score += titleSim * 5;

			// Tag Similarity (if tags exist)
			if (sourceVideo.tags && video.tags) {
				const intersection = sourceVideo.tags.filter((t) => video.tags!.includes(t!));
				score += intersection.length * 8;
			}

			// Base popularity
			score += (video.views || 0) * 0.001;

			return { video, score };
		});

		// Sort
		scored.sort((a, b) => b.score - a.score);

		let finalRelatedVideos = scored.slice(0, limit).map((s) => s.video);

		// Populate watch progress if user is logged in
		if (userId && finalRelatedVideos.length > 0) {
			const videoIds = finalRelatedVideos.map((v) => v.id);
			const history = await db.query.watchHistory.findMany({
				where: and(eq(watchHistory.userId, userId), inArray(watchHistory.videoId, videoIds))
			});
			const historyMap = new Map(history.map((h) => [h.videoId, h.progress]));
			finalRelatedVideos = finalRelatedVideos.map((v) => ({
				...v,
				savedProgress: historyMap.get(v.id)
			}));
		}

		return finalRelatedVideos;
	}
}
