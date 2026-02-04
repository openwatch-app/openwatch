import { transcodeVideo } from '~server/services/transcoding';
import { videos, systemSettings } from '~server/db/schema';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { generateId } from 'better-auth';
import { auth } from '~server/auth';
import { eq } from 'drizzle-orm';
import { db } from '~server/db';
import { join } from 'path';

export const POST = async (req: NextRequest) => {
	try {
		const session = await auth.api.getSession({
			headers: req.headers
		});

		if (!session) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check user permission
		if ((session.user as any).allowedToUpload === false) {
			return NextResponse.json({ error: 'Upload restricted for this account' }, { status: 403 });
		}

		// Check global permission
		const settings = await db.select().from(systemSettings).where(eq(systemSettings.key, 'upload_enabled'));
		const globalUploadEnabled = settings.length > 0 ? settings[0].value !== 'false' : true;

		if (!globalUploadEnabled && (session.user as any).role !== 'admin') {
			return NextResponse.json({ error: 'Uploads are currently disabled' }, { status: 403 });
		}

		const formData = await req.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
		}

        const title = (formData.get('title') as string) || file.name;

        // Validate video file type
        const validVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
        const validExtensions = ['mp4', 'mov', 'webm', 'mkv'];
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (!validVideoTypes.some(type => file.type.startsWith('video/')) || !ext || !validExtensions.includes(ext)) {
            return NextResponse.json({ error: 'Invalid video file type' }, { status: 415 });
        }

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Ensure upload directory exists
		const uploadDir = join(process.cwd(), '.storage', 'videos');
		try {
			await mkdir(uploadDir, { recursive: true });
		} catch (err) {
			// Ignore if directory already exists
		}

		// Create a unique filename
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const extension = file.name.split('.').pop();
		const filename = `${uniqueSuffix}.${extension}`;
		const path = join(uploadDir, filename);

		await writeFile(path, buffer);

		const videoId = generateId();

		// Create DB entry
		await db.insert(videos).values({
			id: videoId,
			userId: session.user.id,
			title: title,
			filename: filename,
			originalPath: path,
			status: 'processing',
			thumbnailUrl: `/api/uploads/${filename}` // Temporary thumbnail, ideally we extract one from video
		});

		// Start transcoding in background
		const outputDir = join(process.cwd(), '.storage', 'streams', videoId);

		// Fire and forget transcoding
		transcodeVideo(path, outputDir, videoId)
			.then(async () => {
				console.log(`Transcoding finished for video ${videoId}`);
				await db
					.update(videos)
					.set({
						status: 'ready',
						thumbnailUrl: `/api/stream/${videoId}/thumbnail.jpg`
					})
					.where(eq(videos.id, videoId));
			})
			.catch(async (err) => {
				console.error(`Transcoding failed for video ${videoId}:`, err);
				await db.update(videos).set({ status: 'failed' }).where(eq(videos.id, videoId));
			});

		return NextResponse.json({
			videoId,
			message: 'Upload successful, processing started'
		});
	} catch (error) {
		console.error('Error uploading file:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
