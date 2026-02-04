import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';

export const GET = async (req: NextRequest, { params }: { params: Promise<{ filename: string }> }) => {
	const { filename } = await params;

    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

	// Construct file path
	const baseDir = join(process.cwd(), '.storage', 'videos');
    const filePath = join(baseDir, filename);

    // Verify path is within base directory
    const resolvedPath = await import('path').then(p => p.resolve(filePath));
    if (!resolvedPath.startsWith(baseDir)) {
         return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

	if (!existsSync(filePath)) {
		return NextResponse.json({ error: 'File not found' }, { status: 404 });
	}

	try {
		const fileStat = await stat(filePath);
		const fileSize = fileStat.size;
		const range = req.headers.get('range');

		if (range) {
			const parts = range.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunksize = end - start + 1;

			// Using native Response with stream is better for video
			const { createReadStream } = require('fs');
			const stream = createReadStream(filePath, { start, end });

			const headers = new Headers();
			headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
			headers.set('Accept-Ranges', 'bytes');
			headers.set('Content-Length', chunksize.toString());
			headers.set('Content-Type', 'video/mp4');

			return new NextResponse(stream as any, {
				status: 206,
				headers
			});
		} else {
			const { createReadStream } = require('fs');
			const stream = createReadStream(filePath);
			
			const headers = new Headers();
			headers.set('Content-Length', fileSize.toString());
			headers.set('Content-Type', 'video/mp4');
			
			return new NextResponse(stream as any, {
				headers
			});
		}
	} catch (error) {
		console.error('Error serving file:', error);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
