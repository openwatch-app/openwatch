import { RecommendationService } from '~server/services/recommendations';
import { NextRequest, NextResponse } from 'next/server';
import { mapVideoToFrontend, mapUserToChannel } from '~server/mappers';

export const GET = async (req: NextRequest) => {
	try {
		const { searchParams } = new URL(req.url);
		const query = searchParams.get('query');
		const limit = parseInt(searchParams.get('limit') || '20');
		const page = parseInt(searchParams.get('page') || '1');
		const offset = (page - 1) * limit;

		if (!query) {
			return NextResponse.json({ error: 'Query is required' }, { status: 400 });
		}

		const { videos, channels } = await RecommendationService.search(query, limit, offset);
		const mappedVideos = videos.map(mapVideoToFrontend);
		const mappedChannels = channels.map(mapUserToChannel);

		// Mix results: Channels first, then videos
		const mixedResults = [...mappedChannels, ...mappedVideos];

		return NextResponse.json(mixedResults);
	} catch (error) {
		console.error('Error searching videos:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
