import { videos, videoViews, subscription, user, watchHistory, playlists, playlistItems } from '~server/db/schema';
import { desc, eq, and, not, sql, or, ilike, inArray, isNull, gte, lte } from 'drizzle-orm';
import { db } from '~server/db';
import axios from 'axios';

// Helper to calculate similarity score between two strings (titles)
const calculateTextSimilarity = (text1: string | null, text2: string | null): number => {
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
};

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
			// Filter out null videos (deleted)
			return history
				.filter((h) => !!h.video)
				.map((h) => ({
					...h.video,
					savedProgress: h.progress
				}));
		}

		if (filter === 'recently-uploaded') {
			return db.query.videos.findMany({
				where: and(eq(videos.visibility, 'public'), eq(videos.isShort, false)),
				orderBy: [desc(videos.createdAt)],
				limit,
				offset,
				with: { user: true }
			});
		}

		// --- Smart Feed Logic ---

		// 1. Gather User Context
		let subscribedChannelIds: string[] = [];
		let topCategories: string[] = [];
		let watchedVideoIds = new Set<string>();

		if (userId) {
			// A. Subscriptions
			const subs = await db.query.subscription.findMany({
				where: eq(subscription.subscriberId, userId),
				columns: { subscribedToId: true }
			});
			subscribedChannelIds = subs.map((s) => s.subscribedToId);

			// B. Watched Video IDs (to avoid recommending recently watched stuff too aggressively)
			const history = await db.query.watchHistory.findMany({
				where: eq(watchHistory.userId, userId),
				columns: { videoId: true },
				orderBy: [desc(watchHistory.lastViewedAt)],
				limit: 100
			});
			history.forEach((h) => watchedVideoIds.add(h.videoId));

			// C. Top Categories (Interests)
			// Aggregate categories from last 50 watched videos
			const recentHistory = await db.query.watchHistory.findMany({
				where: eq(watchHistory.userId, userId),
				limit: 50,
				orderBy: [desc(watchHistory.lastViewedAt)],
				with: {
					video: { columns: { category: true } }
				}
			});

			const categoryCounts: Record<string, number> = {};
			recentHistory.forEach((h) => {
				if (h.video?.category) {
					categoryCounts[h.video.category] = (categoryCounts[h.video.category] || 0) + 1;
				}
			});

			topCategories = Object.entries(categoryCounts)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 3) // Top 3 categories
				.map(([cat]) => cat);
		}

		// 2. Fetch Candidates from Multiple Sources
		// We fetch more than needed to rank them effectively
		const candidateLimit = 40;
		const queries = [];

		// Source A: Recent (Freshness)
		queries.push(
			db.query.videos.findMany({
				where: and(eq(videos.visibility, 'public'), eq(videos.isShort, false)),
				orderBy: [desc(videos.createdAt)],
				limit: candidateLimit,
				with: { user: true }
			})
		);

		// Source B: Popular (Views - Trends)
		// We look for videos with high views from the last 30 days
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		queries.push(
			db.query.videos.findMany({
				where: and(eq(videos.visibility, 'public'), eq(videos.isShort, false), gte(videos.createdAt, thirtyDaysAgo)),
				orderBy: [desc(videos.views)],
				limit: candidateLimit,
				with: { user: true }
			})
		);

		// Source C: Subscriptions (if logged in)
		if (subscribedChannelIds.length > 0) {
			queries.push(
				db.query.videos.findMany({
					where: and(eq(videos.visibility, 'public'), eq(videos.isShort, false), inArray(videos.userId, subscribedChannelIds)),
					orderBy: [desc(videos.createdAt)], // Recent from subs
					limit: candidateLimit,
					with: { user: true }
				})
			);
		}

		// Source D: Interest-based (if logged in and has history)
		if (topCategories.length > 0) {
			queries.push(
				db.query.videos.findMany({
					where: and(eq(videos.visibility, 'public'), eq(videos.isShort, false), inArray(videos.category, topCategories)),
					orderBy: [desc(videos.createdAt)], // Recent in topics
					limit: candidateLimit,
					with: { user: true }
				})
			);
		}

		const results = await Promise.all(queries);
		const allCandidates = results.flat();

		// 3. Deduplicate & Score
		const scoredCandidates = new Map<string, { video: any; score: number }>();

		allCandidates.forEach((video) => {
			if (scoredCandidates.has(video.id)) return; // Already processed

			let score = 0;
			const isWatched = watchedVideoIds.has(video.id);

			// --- Scoring Factors ---

			// 1. Recency (0-20 points)
			// Linear decay over 14 days
			const daysOld = (Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60 * 24);
			const recencyScore = Math.max(0, 20 - daysOld * 1.5);
			score += recencyScore;

			// 2. Popularity (0-20 points)
			// Logarithmic scale for views
			const popularityScore = Math.min(20, Math.log10(video.views + 1) * 4);
			score += popularityScore;

			// 3. Subscription Boost (30 points)
			// We want to prioritize subs highly
			if (subscribedChannelIds.includes(video.userId)) {
				score += 30;
			}

			// 4. Interest/Category Match (15 points)
			if (topCategories.includes(video.category)) {
				score += 15;
			}

			// 5. Engagement Quality (Likes ratio) (0-10 points)
			const totalReactions = video.likes + video.dislikes;
			if (totalReactions > 5) {
				const likeRatio = video.likes / totalReactions;
				score += likeRatio * 10;
			}

			// 6. Penalty for Watched (-50 points)
			// We generally want to hide watched videos from Home, or push them to bottom.
			if (isWatched) {
				score -= 50;
			}

			scoredCandidates.set(video.id, { video, score });
		});

		// 4. Sort & Slice
		const sorted = Array.from(scoredCandidates.values())
			.sort((a, b) => b.score - a.score)
			.map((item) => item.video);

		let finalVideos = sorted.slice(offset, offset + limit);

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

	// Search Federated Content (Sepia Search)
	static async searchRemote(query: string, limit: number = 20, offset: number = 0) {
		try {
			const { data } = await axios.get('https://sepiasearch.org/api/v1/search/videos', {
				params: {
					search: query,
					count: limit,
					start: offset,
					sort: '-createdAt'
				}
			});

			return data.data.map((item: any) => {
				const resolveAvatar = (ch: any) => {
					if (ch.avatar?.path) return 'https://' + ch.host + ch.avatar.path;
					if (ch.avatars && Array.isArray(ch.avatars) && ch.avatars.length > 0) {
						const sorted = [...ch.avatars].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
						return 'https://' + ch.host + sorted[0].path;
					}
					return null;
				};

				return {
					id: 'external:' + item.channel.host + ':' + item.uuid,
					title: item.name,
					description: item.description,
					thumbnailUrl: item.thumbnailUrl,
					videoUrl: item.url, // External Page URL
					views: item.views,
					duration: item.duration,
					createdAt: new Date(item.publishedAt),
					isExternal: true,
					category: 'General', // Default
					visibility: 'public',
					status: 'ready',
					isShort: false,
					user: {
						id: `external:${item.channel.host}:${item.channel.name}`,
						name: item.channel.displayName,
						handle: item.channel.name + '@' + item.channel.host,
						email: '',
						image: resolveAvatar(item.channel),
						host: item.channel.host,
						verified: false,
						isExternal: true
					}
				};
			});
		} catch (error) {
			console.error('Sepia Search failed:', error);
			return [];
		}
	}

	// Search Federated Playlists (Sepia Search)
	static async searchRemotePlaylists(query: string, limit: number = 20, offset: number = 0) {
		try {
			const { data } = await axios.get('https://sepiasearch.org/api/v1/search/video-playlists', {
				params: {
					search: query,
					count: limit,
					start: offset
				}
			});

			return data.data.map((item: any) => ({
				id: 'external:' + item.ownerAccount.host + ':' + item.uuid,
				title: item.displayName,
				visibility: 'public',
				updatedAt: new Date(item.updatedAt),
				videoCount: item.videosLength,
				firstVideoThumbnail: item.thumbnailUrl || (item.thumbnailPath ? `https://${item.ownerAccount.host}${item.thumbnailPath}` : null),
				isExternal: true,
				host: item.ownerAccount.host,
				owner: {
					name: item.ownerAccount.displayName,
					handle: item.ownerAccount.name + '@' + item.ownerAccount.host
				}
			}));
		} catch (error) {
			console.error('Sepia Search Playlists failed:', error);
			return [];
		}
	}

	// Resolve external identity via WebFinger
	static async resolveExternalIdentity(query: string) {
		try {
			// Remove leading @ if present and split
			const handle = query.trim().startsWith('@') ? query.trim().substring(1) : query.trim();
			const parts = handle.split('@');

			// Must be username@host format
			if (parts.length !== 2) return null;

			const [username, host] = parts;
			// Basic validation
			if (!username || !host || host.includes('/') || !host.includes('.')) return null;

			console.log(`Resolving external identity: ${username}@${host}`);

			// 1. WebFinger Lookup
			const webfingerUrl = `https://${host}/.well-known/webfinger?resource=acct:${username}@${host}`;
			const { data: webfinger } = await axios.get(webfingerUrl, { timeout: 5000 });

			const selfLink = webfinger.links?.find((l: any) => l.rel === 'self' && (l.type === 'application/activity+json' || l.type === 'application/ld+json'));

			if (!selfLink?.href) return null;

			// 2. Fetch Actor
			const { data: actor } = await axios.get(selfLink.href, {
				headers: { Accept: 'application/activity+json' },
				timeout: 5000
			});

			// 3. Resolve Stats (Subscribers & Videos)
			let subscribersCount = actor.followersCount || actor.stats?.followersCount;
			let videosCount = actor.videosCount || actor.stats?.videosCount;

			// If stats are missing, try fetching the collections
			const statPromises = [];
			if (subscribersCount === undefined && actor.followers) {
				statPromises.push(
					axios
						.get(actor.followers, { headers: { Accept: 'application/activity+json' }, timeout: 5000 })
						.then((res) => {
							subscribersCount = res.data.totalItems;
						})
						.catch(() => {
							subscribersCount = 0;
						})
				);
			}
			if (videosCount === undefined && actor.outbox) {
				statPromises.push(
					axios
						.get(actor.outbox, { headers: { Accept: 'application/activity+json' }, timeout: 5000 })
						.then((res) => {
							videosCount = res.data.totalItems;
						})
						.catch(() => {
							videosCount = 0;
						})
				);
			}

			if (statPromises.length > 0) {
				await Promise.allSettled(statPromises);
			}

			// 4. Resolve Images (Avatar & Banner)
			// Helper to get largest image from array or object
			const getImage = (img: any) => {
				if (!img) return null;
				if (typeof img === 'string') return img;
				if (Array.isArray(img)) {
					// Prefer largest, or just first if no width
					const sorted = [...img].sort((a, b) => (b.width || 0) - (a.width || 0));
					return sorted[0]?.url || null;
				}
				return img.url || null;
			};

			const avatarUrl = getImage(actor.icon);
			const bannerUrl = getImage(actor.image) || getImage(actor.header); // PeerTube uses image for banner, Mastodon uses header

			return {
				id: `external:${host}:${username}`,
				name: actor.name || actor.preferredUsername || username,
				email: '', // No email for external
				image: avatarUrl,
				banner: bannerUrl,
				handle: `${actor.preferredUsername || username}@${host}`,
				description: actor.summary || '',
				verified: false,
				host: host,
				isExternal: true,
				subscribers: (subscribersCount || 0).toString(),
				videosCount: (videosCount || 0).toString()
			};
		} catch (error) {
			console.error('Failed to resolve external identity:', error);
			return null;
		}
	}

	// Fetch videos from external channel (PeerTube API)
	static async getRemoteChannelVideos(host: string, username: string, limit: number = 20, offset: number = 0) {
		try {
			let data;

			// Try PeerTube API accounts endpoint first
			try {
				const response = await axios.get(`https://${host}/api/v1/accounts/${username}/videos`, {
					params: {
						count: limit,
						start: offset,
						sort: '-createdAt'
					},
					timeout: 5000
				});
				data = response.data;
			} catch (error: any) {
				// If 404, try video-channels endpoint
				if (error.response?.status === 404) {
					const response = await axios.get(`https://${host}/api/v1/video-channels/${username}/videos`, {
						params: {
							count: limit,
							start: offset,
							sort: '-createdAt'
						},
						timeout: 5000
					});
					data = response.data;
				} else {
					throw error;
				}
			}

			if (!data?.data) return [];

			return data.data.map((item: any) => {
				// Determine avatar path (account or channel, support both object and array formats)
				let avatarPath = null;
				// Prefer channel avatar if we are looking at a channel, but fallback to account
				const sourceObj = item.channel?.name === username ? item.channel : item.account;

				if (sourceObj?.avatar?.path) {
					avatarPath = sourceObj.avatar.path;
				} else if (sourceObj?.avatars && Array.isArray(sourceObj.avatars) && sourceObj.avatars.length > 0) {
					// Prefer largest avatar usually, or just the first one
					avatarPath = sourceObj.avatars[0].path;
				} else if (item.account?.avatar?.path) {
					avatarPath = item.account.avatar.path;
				} else if (item.account?.avatars?.length > 0) {
					avatarPath = item.account.avatars[0].path;
				}

				return {
					id: 'external:' + host + ':' + item.uuid,
					title: item.name,
					description: item.description,
					thumbnailUrl: item.thumbnailPath ? `https://${host}${item.thumbnailPath}` : null,
					videoUrl: item.url || `https://${host}${item.watchPath}`, // Use URL or watch path
					views: item.views,
					duration: item.duration,
					createdAt: new Date(item.publishedAt),
					isExternal: true,
					category: 'General',
					visibility: 'public',
					status: 'ready',
					isShort: false,
					user: {
						id: `external:${host}:${username}`,
						name: item.channel?.displayName || item.account?.displayName || username,
						handle: `${username}@${host}`,
						email: '',
						image: avatarPath ? `https://${host}${avatarPath}` : null,
						host: host,
						verified: false,
						isExternal: true
					}
				};
			});
		} catch (error) {
			console.error(`Failed to fetch remote videos from ${username}@${host}:`, error);
			return [];
		}
	}

	// Search videos
	static async search(
		query: string,
		limit: number = 20,
		offset: number = 0,
		userId?: string,
		source: 'local' | 'network' = 'local',
		type: 'all' | 'video' | 'channel' | 'playlist' | 'short' = 'all'
	) {
		let videoResults: any[] = [];
		let channelResults: any[] = [];
		let playlistResults: any[] = [];

		const shouldFetchVideos = ['all', 'video', 'short'].includes(type);
		const shouldFetchChannels = ['all', 'channel'].includes(type);
		const shouldFetchPlaylists = ['all', 'playlist'].includes(type);

		// Local Search - Videos
		if (shouldFetchVideos) {
			const conditions = [eq(videos.visibility, 'public'), or(ilike(videos.title, `%${query}%`), ilike(videos.description, `%${query}%`))];

			if (source === 'local') {
				conditions.push(isNull(user.host));
			}

			if (type === 'short') conditions.push(eq(videos.isShort, true));
			if (type === 'video') conditions.push(eq(videos.isShort, false));

			const localQuery = db
				.select({
					video: videos,
					user: user
				})
				.from(videos)
				.innerJoin(user, eq(videos.userId, user.id))
				.where(and(...conditions))
				.limit(limit)
				.offset(offset)
				.orderBy(desc(videos.views));

			const results = await localQuery;
			videoResults = results.map((r) => ({ ...r.video, user: r.user }));
		}

		// Local Playlist Search
		if (shouldFetchPlaylists) {
			const localPlaylists = await db
				.select({
					id: playlists.id,
					title: playlists.title,
					visibility: playlists.visibility,
					updatedAt: playlists.updatedAt,
					videoCount: sql<number>`(SELECT COUNT(*) FROM ${playlistItems} WHERE ${playlistItems.playlistId} = playlists.id)`.mapWith(Number),
					firstVideoThumbnail: sql<string>`(
						SELECT ${videos.thumbnailUrl} 
						FROM ${playlistItems} 
						JOIN ${videos} ON ${playlistItems.videoId} = videos.id 
						WHERE ${playlistItems.playlistId} = playlists.id 
						ORDER BY ${playlistItems.order} ASC 
						LIMIT 1
					)`
				})
				.from(playlists)
				.where(and(eq(playlists.visibility, 'public'), or(ilike(playlists.title, `%${query}%`), ilike(playlists.description, `%${query}%`))))
				.limit(limit)
				.offset(offset);

			playlistResults = [...localPlaylists];
		}

		// Network Search (if requested)
		if (source === 'network' && process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true') {
			// Fetch remote videos
			if (shouldFetchVideos) {
				const remoteVideos = await RecommendationService.searchRemote(query, limit, offset);

				// Basic filtering for shorts based on duration if explicit type requested
				let filteredRemoteVideos = remoteVideos;
				if (type === 'short') {
					filteredRemoteVideos = remoteVideos.filter((v: any) => v.duration <= 60);
					// Mark as short
					filteredRemoteVideos.forEach((v: any) => (v.isShort = true));
				} else if (type === 'video') {
					filteredRemoteVideos = remoteVideos.filter((v: any) => v.duration > 60);
				}

				videoResults = [...videoResults, ...filteredRemoteVideos];
			}

			// Fetch remote playlists
			if (shouldFetchPlaylists) {
				const remotePlaylists = await RecommendationService.searchRemotePlaylists(query, limit, offset);
				playlistResults = [...playlistResults, ...remotePlaylists];
			}
		}

		// Search Channels (Local only for now, unless we want to search remote channels too)
		if (shouldFetchChannels) {
			const isExplicitChannelSearch = type === 'channel';

			if (offset === 0 || isExplicitChannelSearch) {
				const channelConditions = [or(ilike(user.name, `%${query}%`), ilike(user.handle, `%${query}%`))];
				if (source === 'local') {
					channelConditions.push(isNull(user.host));
				}

				channelResults = await db.query.user.findMany({
					where: and(...channelConditions),
					limit: isExplicitChannelSearch ? limit : 3 // Limit to top 3 matching channels if mixed
				});

				// Resolve external channel if query looks like a handle and federation is enabled
				if (process.env.NEXT_PUBLIC_ENABLE_FEDERATION === 'true' && (query.includes('@') || source === 'network')) {
					const externalChannel = await RecommendationService.resolveExternalIdentity(query);
					if (externalChannel) {
						// Check if already found in local results (by handle) to avoid duplicates
						const exists = channelResults.some((c) => c.handle === externalChannel.handle);
						if (!exists) {
							channelResults.unshift(externalChannel);
						}
					}
				}
			}
		}

		return { videos: videoResults, channels: channelResults, playlists: playlistResults };
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

	// Fetch playlists from external channel (PeerTube API)
	static async getRemoteChannelPlaylists(host: string, username: string, limit: number = 20, offset: number = 0) {
		try {
			let data;
			// Try PeerTube API accounts endpoint first
			try {
				const response = await axios.get(`https://${host}/api/v1/accounts/${username}/video-playlists`, {
					params: { count: limit, start: offset, sort: '-createdAt' },
					timeout: 5000
				});
				data = response.data;
			} catch (error: any) {
				// If 404, try video-channels endpoint
				if (error.response?.status === 404) {
					const response = await axios.get(`https://${host}/api/v1/video-channels/${username}/video-playlists`, {
						params: { count: limit, start: offset, sort: '-createdAt' },
						timeout: 5000
					});
					data = response.data;
				} else {
					throw error;
				}
			}

			if (!data?.data) return [];

			return data.data.map((item: any) => ({
				id: 'external:' + host + ':' + item.uuid,
				name: item.displayName,
				description: item.description,
				thumbnailUrl: item.thumbnailPath ? `https://${host}${item.thumbnailPath}` : null,
				createdAt: new Date(item.createdAt),
				updatedAt: new Date(item.updatedAt),
				isExternal: true,
				visibility: 'public',
				userId: `external:${host}:${username}`,
				videosCount: item.videosLength || 0,
				// We don't have full video list here usually, but that's fine for listing playlists
				videos: []
			}));
		} catch (error) {
			console.error(`Failed to fetch remote playlists from ${username}@${host}:`, error);
			return [];
		}
	}
}
