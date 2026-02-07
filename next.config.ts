import type { NextConfig } from 'next';

export default {
	reactCompiler: true,
	devIndicators: false,
	output: 'standalone',
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**'
			}
		]
	}
} satisfies NextConfig;
