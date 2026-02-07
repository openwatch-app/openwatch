import { RecommendationService } from '~server/services/recommendations';
import { mapVideoToFrontend, mapUserToChannel } from '~server/mappers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		const userId = session?.user?.id;

		const { searchParams } = new URL(req.url);
		const query = searchParams.get('query');
		const limit = parseInt(searchParams.get('limit') || '20');
		const page = parseInt(searchParams.get('page') || '1');

		const rawSource = searchParams.get('source');
		const source = (rawSource && ['local', 'network'].includes(rawSource) ? rawSource : 'local') as 'local' | 'network';

		const rawType = searchParams.get('type');
		const type = (rawType && ['all', 'video', 'channel', 'playlist', 'short'].includes(rawType) ? rawType : 'all') as 'all' | 'video' | 'channel' | 'playlist' | 'short';

		const offset = (page - 1) * limit;

		if (!query) {
			return NextResponse.json({ error: 'Query is required' }, { status: 400 });
		}

		const { videos, channels, playlists } = await RecommendationService.search(query, limit, offset, userId, source, type);
		const mappedVideos = videos.map(mapVideoToFrontend);
		const mappedChannels = channels.map(mapUserToChannel);
		const mappedPlaylists = playlists.map((p) => ({
			...p,
			type: 'playlist'
		}));

		let mixedResults: any[] = [];

		if (type === 'all') {
			// Mix results: Interleave them to be "a bit mixed"
			// Strategy: 1 Channel, 1 Playlist, 3 Videos, repeat
			const maxLen = Math.max(mappedChannels.length, mappedPlaylists.length, mappedVideos.length);
			let cIdx = 0,
				pIdx = 0,
				vIdx = 0;

			while (cIdx < mappedChannels.length || pIdx < mappedPlaylists.length || vIdx < mappedVideos.length) {
				// Add 1 Channel
				if (cIdx < mappedChannels.length) {
					mixedResults.push(mappedChannels[cIdx++]);
				}
				// Add 1 Playlist
				if (pIdx < mappedPlaylists.length) {
					mixedResults.push(mappedPlaylists[pIdx++]);
				}
				// Add up to 3 Videos
				for (let i = 0; i < 3 && vIdx < mappedVideos.length; i++) {
					mixedResults.push(mappedVideos[vIdx++]);
				}
			}
		} else {
			// For specific types, just concat (others will be empty)
			mixedResults = [...mappedChannels, ...mappedPlaylists, ...mappedVideos];
		}

		return NextResponse.json(mixedResults);
	} catch (error) {
		console.error('Error searching videos:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
