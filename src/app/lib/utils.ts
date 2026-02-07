import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const normalizeViewCount = (views: string | null | undefined): number => {
	if (!views) return 0;

	// Remove commas and trim whitespace
	const cleanViews = views.replace(/,/g, '').trim();

	// Handle numeric strings
	if (/^\d+$/.test(cleanViews)) {
		return parseInt(cleanViews, 10);
	}

	// Handle formatted numbers with K, M, B suffixes
	const match = cleanViews.match(/^(\d+(?:\.\d+)?)\s*([KMB])?$/i);
	if (!match) return 0;

	const numericValue = parseFloat(match[1]);
	const suffix = match[2]?.toUpperCase();

	switch (suffix) {
		case 'K':
			return Math.round(numericValue * 1000);
		case 'M':
			return Math.round(numericValue * 1000000);
		case 'B':
			return Math.round(numericValue * 1000000000);
		default:
			return Math.round(numericValue);
	}
};

export const formatCompactNumber = (num: number): string => {
	return Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1
	}).format(num);
};
