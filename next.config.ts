import type { NextConfig } from 'next';
import pkg from './package.json';

export default {
	env: {
		NEXT_PUBLIC_APP_VERSION: pkg.version
	},
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
