import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { RecommendationService } from '~server/services/recommendations';
import { mapVideoToFrontend } from '~server/mappers';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;
		const session = await auth.api.getSession({
			headers: req.headers
		});
		const userId = session?.user?.id;

		const { searchParams } = new URL(req.url);
		let limit = parseInt(searchParams.get('limit') || '10');
        if (isNaN(limit) || limit < 1) limit = 10;
        if (limit > 50) limit = 50;

		const videos = await RecommendationService.getRelatedVideos(id, userId, limit);
		const mappedVideos = videos.map(mapVideoToFrontend);

		return NextResponse.json(mappedVideos);
	} catch (error) {
		console.error('Error fetching related videos:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
