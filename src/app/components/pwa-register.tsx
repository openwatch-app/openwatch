'use client';

import { useEffect } from 'react';

export function PWARegister() {
	useEffect(() => {
		if (typeof window !== 'undefined') {
			// Check for secure context
			if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
				console.warn('PWA: Service Worker registration requires a secure context (HTTPS) or localhost. Current origin is insecure.');
			}

			if ('serviceWorker' in navigator) {
				const registerSW = () => {
					navigator.serviceWorker.register('/sw.js').then(
						function (registration) {
							console.log('Service Worker registration successful with scope: ', registration.scope);
						},
						function (err) {
							console.log('Service Worker registration failed: ', err);
						}
					);
				};

				if (document.readyState === 'complete') {
					registerSW();
				} else {
					window.addEventListener('load', registerSW);
					return () => window.removeEventListener('load', registerSW);
				}
			}
		}
	}, []);

	return null;
}
