import { videos } from '~server/db/schema';
import ffmpeg from 'fluent-ffmpeg';
import { eq } from 'drizzle-orm';
import { db } from '~server/db';
import fs from 'fs/promises';
import path from 'path';

export const qualityPresets: Record<string, { resolution: string; bitrate: string; audioBitrate: string }> = {
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
		}
	} catch (e) {
		console.error(`[${videoId}] Error probing video:`, e);
	}

	const qualities = Object.entries(qualityPresets).filter(([_, preset]) => {
		if (inputHeight === 0) return true; // Could not detect, generate all

		const [_w, h] = preset.resolution.split('x').map(Number);
		return h <= inputHeight + 10;
	});

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
			console.log(`[${videoId}] Starting transcoding for ${quality}...`);
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
				.on('end', () => resolve())
				.on('error', (err) => {
					console.error(`Error transcoding ${quality}:`, err);
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

	// Generate Thumbnail
	try {
		const isVertical = inputWidth > 0 && inputHeight > 0 && inputWidth <= inputHeight;

		await new Promise<void>((resolve, reject) => {
			let command = ffmpeg(inputPath);

			if (isVertical) {
				// Complex filter for vertical video: blurred background + centered video in 16:9 container
				command = command
					.complexFilter([
						'[0:v]split=2[bg][fg]',
						'[bg]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=20[bg_blurred]',
						'[fg]scale=1280:720:force_original_aspect_ratio=decrease[fg_scaled]',
						'[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2'
					])
					.outputOptions(['-ss 1', '-frames:v 1', '-update 1']);
			} else {
				// Standard screenshot for horizontal video
				command = command.outputOptions(['-ss 1', '-frames:v 1']).size('1280x720');
			}

			command
				.output(path.join(outputDir, 'thumbnail.jpg'))
				.on('end', () => resolve())
				.on('error', (err) => {
					console.error(`[${videoId}] Error generating thumbnail:`, err);
					reject(err);
				})
				.run();
		});
	} catch (e) {
		console.error(`[${videoId}] Failed to generate thumbnail`, e);
	}
};
