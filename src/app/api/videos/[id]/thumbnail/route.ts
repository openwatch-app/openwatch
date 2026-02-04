import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~server/auth';
import { db } from '~server/db';
import { videos } from '~server/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
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

		const formData = await req.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
		}

		// Validate file type (basic check)
		if (!file.type.startsWith('image/')) {
			return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Directory path
		const outputDir = join(process.cwd(), '.storage', 'streams', id);
		
		// Ensure directory exists (in case it wasn't created yet or was deleted)
		if (!existsSync(outputDir)) {
			await mkdir(outputDir, { recursive: true });
		}

		// Save file as thumbnail.jpg (overwriting existing)
		const filePath = join(outputDir, 'thumbnail.jpg');
		await writeFile(filePath, buffer);

		// Update DB with new URL (if it wasn't already set to this standard path)
		// We append a timestamp to the returned URL for cache busting, but the DB stores the base path
		const dbThumbnailUrl = `/api/stream/${id}/thumbnail.jpg`;
		
		if (video.thumbnailUrl !== dbThumbnailUrl) {
			await db
				.update(videos)
				.set({
					thumbnailUrl: dbThumbnailUrl,
					updatedAt: new Date()
				})
				.where(eq(videos.id, id));
		}

		return NextResponse.json({ 
			success: true, 
			thumbnailUrl: `${dbThumbnailUrl}?t=${Date.now()}` 
		});

	} catch (error) {
		console.error('Error uploading thumbnail:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
