'use client';

import { useAppStore } from './store';
import { useCallback } from 'react';

import en from '../../locales/en.json';
import ro from '../../locales/ro.json';

const translations: Record<string, any> = {
	en,
	ro
};

export const useTranslation = () => {
	const language = useAppStore((state) => state.language);
	const setLanguage = useAppStore((state) => state.setLanguage);

	const t = useCallback(
		(path: string, params?: Record<string, any>): string => {
			const keys = path.split('.');
			let result: any = translations[language] || translations['en'];

			for (const key of keys) {
				if (result[key] === undefined) {
					// Fallback to English if key missing in current language
					let fallback = translations['en'];
					for (const fallbackKey of keys) {
						if (fallback[fallbackKey] === undefined) return path;
						fallback = fallback[fallbackKey];
					}
					result = fallback;
					break;
				}
				result = result[key];
			}

			if (typeof result !== 'string') return path;

			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					result = (result as string).replaceAll(`{${key}}`, String(value));
				});
			}

			return result as string;
		},
		[language]
	);

	return { t, language, setLanguage };
};

export default useTranslation;
