import { RecommendationService } from '~server/services/recommendations';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { mapVideoToFrontend } from '~server/mappers';

export const GET = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		const userId = session?.user?.id;

		const { searchParams } = new URL(req.url);
		const limit = parseInt(searchParams.get('limit') || '20');
		const page = parseInt(searchParams.get('page') || '1');
		const filter = searchParams.get('filter') || 'all';
		const offset = (page - 1) * limit;

		const videos = await RecommendationService.getHomeFeed(userId, limit, offset, filter);
		const mappedVideos = videos.map(mapVideoToFrontend);

		return NextResponse.json(mappedVideos);
	} catch (error) {
		console.error('Error fetching feed:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
