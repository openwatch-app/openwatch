import { videos } from '~server/db/schema';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import { existsSync } from 'fs';
import { eq } from 'drizzle-orm';
import { db } from '~server/db';
import fs from 'fs/promises';
import path from 'path';

let correctFfmpegPath = ffmpegPath;

// Fix for Next.js bundling weirdness with ffmpeg-static
if (correctFfmpegPath) {
	// If path looks like a virtual path from webpack/next
	if (correctFfmpegPath.includes('ROOT') || !existsSync(correctFfmpegPath)) {
		const possiblePaths = [path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'), path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg')];

		for (const p of possiblePaths) {
			if (existsSync(p)) {
				correctFfmpegPath = p;
				break;
			}
		}
	}
}

if (correctFfmpegPath) {
	console.log(`Using ffmpeg path: ${correctFfmpegPath}`);
	ffmpeg.setFfmpegPath(correctFfmpegPath);
} else {
	console.error('ffmpeg binary not found!');
}

type QualityPreset = {
	resolution: string;
	bitrate: string;
	audioBitrate: string;
};

export const qualityPresets: Record<string, QualityPreset> = {
	'2160p': { resolution: '3840x2160', bitrate: '15000k', audioBitrate: '192k' },
	'1440p': { resolution: '2560x1440', bitrate: '8000k', audioBitrate: '192k' },
	'1080p': { resolution: '1920x1080', bitrate: '5000k', audioBitrate: '192k' },
	'720p': { resolution: '1280x720', bitrate: '2800k', audioBitrate: '128k' },
	'480p': { resolution: '854x480', bitrate: '1400k', audioBitrate: '128k' },
	'360p': { resolution: '640x360', bitrate: '800k', audioBitrate: '96k' },
	'240p': { resolution: '426x240', bitrate: '400k', audioBitrate: '64k' }
};

export const transcodeVideo = async (inputPath: string, outputDir: string, videoId: string) => {
	// Ensure output directory exists
	try {
		await fs.mkdir(outputDir, { recursive: true });
	} catch (e) {
		// ignore
	}

	// Detect input resolution
	let inputWidth = 0;
	let inputHeight = 0;

	try {
		const metadata = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
			ffmpeg.ffprobe(inputPath, (err, metadata) => {
				if (err) reject(err);
				else resolve(metadata);
			});
		});

		// Extract and save duration
		if (metadata.format && metadata.format.duration) {
			const duration = Math.round(metadata.format.duration);
			await db.update(videos).set({ duration }).where(eq(videos.id, videoId));
		}

		const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
		if (videoStream && videoStream.width && videoStream.height) {
			inputWidth = videoStream.width;
			inputHeight = videoStream.height;
			console.log(`Input resolution: ${inputWidth}x${inputHeight}`);
		}
	} catch (e) {
		console.error('Error probing video:', e);
		// Fallback: process all if probe fails? Or maybe default to 1080p?
		// Let's assume 4k if we can't detect, to be safe, or 1080p.
		// For now, let's proceed with all if probe fails, but it shouldn't if installed correctly.
	}

	const qualities = Object.entries(qualityPresets).filter(([_, preset]) => {
		if (inputHeight === 0) return true; // Could not detect, generate all

		const [w, h] = preset.resolution.split('x').map(Number);
		// Generate this quality if it's smaller or equal to input height
		// Allow a small margin of error (e.g. 1920x1080 input should generate 1080p)
		return h <= inputHeight + 10;
	});

	// If no qualities match (e.g. very low res input), at least generate the lowest one or the original?
	// If input is 100x100, and lowest is 240p (426x240), we might want to upscale or just copy?
	// Standard behavior: don't upscale. But for HLS we need variants.
	// If input is lower than 240p, we should probably just generate 240p (upscaled) or keep original.
	// The filter above will return nothing if input is < 240p.
	// Let's ensure at least one quality is generated.
	if (qualities.length === 0) {
		// Find the closest quality or just use the lowest
		qualities.push(['240p', qualityPresets['240p']]);
	}

	// Process sequentially to avoid CPU overload
	for (const [quality, preset] of qualities) {
		const qualityDir = path.join(outputDir, quality);
		try {
			await fs.mkdir(qualityDir, { recursive: true });
		} catch (e) {
			// ignore
		}

		const playlistPath = path.join(qualityDir, 'playlist.m3u8');

		await new Promise<void>((resolve, reject) => {
			console.log(`Starting transcoding for ${quality}...`);
			ffmpeg(inputPath)
				.outputOptions([
					`-c:v libx264`,
					`-b:v ${preset.bitrate}`,
					`-c:a aac`,
					`-b:a ${preset.audioBitrate}`,
					`-vf scale=${preset.resolution}`,
					`-f hls`,
					`-hls_time 6`,
					`-hls_list_size 0`,
					`-hls_segment_filename ${path.join(qualityDir, 'segment_%03d.ts')}`
				])
				.output(playlistPath)
				.on('end', () => {
					console.log(`Finished transcoding for ${quality}`);
					resolve();
				})
				.on('error', (err) => {
					console.error(`Error transcoding ${quality}:`, err);
					// Don't reject, just skip this quality if it fails (e.g. resolution too high for input)
					resolve();
				})
				.run();
		});
	}

	// Create master playlist
	const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
	let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n';

	for (const [quality, preset] of qualities) {
		const qualityDir = path.join(outputDir, quality);
		// Check if playlist exists (in case it failed)
		try {
			await fs.access(path.join(qualityDir, 'playlist.m3u8'));
			const bandwidth = parseInt(preset.bitrate) * 1000;
			masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${preset.resolution}\n`;
			masterContent += `${quality}/playlist.m3u8\n`;
		} catch (e) {
			continue;
		}
	}

	await fs.writeFile(masterPlaylistPath, masterContent);
	console.log('Transcoding complete, master playlist created.');

	// Generate Thumbnail
	try {
		console.log('Generating thumbnail...');
		await new Promise<void>((resolve, reject) => {
			ffmpeg(inputPath)
				.screenshots({
					timestamps: ['1'], // Take screenshot at 1 second mark
					filename: 'thumbnail.jpg',
					folder: outputDir,
					size: '1280x720' // Standard thumbnail size
				})
				.on('end', () => {
					console.log('Thumbnail generated');
					resolve();
				})
				.on('error', (err) => {
					console.error('Error generating thumbnail:', err);
					reject(err);
				});
		});
	} catch (e) {
		console.error('Failed to generate thumbnail', e);
	}
};
