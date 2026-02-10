'use client';

import { authClient } from '~app/lib/auth-client';
import { useTranslation } from '~lib/i18n';
import { useRouter } from 'next/navigation';
import { Button } from '~components/button';
import { Input } from '~components/input';
import { Card } from '~components/card';
import { Video } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

const AuthPage = () => {
	const { t } = useTranslation();
	const [currentView, setCurrentView] = useState<'email' | 'password'>('email');
	const [showPassword, setShowPassword] = useState(false);
	const [isSigningUp, setIsSigningUp] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [loading, setLoading] = useState(false);
	const [password, setPassword] = useState('');
	const [email, setEmail] = useState('');
	const [name, setName] = useState('');
	const router = useRouter();

	const isValidEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleEmailNext = (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage('');
		if (!isValidEmail(email)) {
			setErrorMessage(t('auth.error_invalid_email'));
			return;
		}
		setCurrentView('password');
	};

	const handleCreateAccountClick = (e: React.MouseEvent) => {
		e.preventDefault();
		setErrorMessage('');

		if (!isValidEmail(email)) {
			setErrorMessage(t('auth.error_invalid_email_first'));
			return;
		}

		setIsSigningUp(true);
		setCurrentView('password');
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrorMessage('');

		try {
			if (isSigningUp) {
				const { error: signUpError } = await authClient.signUp.email({ name, email, password });

				if (signUpError) {
					setErrorMessage(signUpError.message || t('auth.error_unknown_signup'));
					setLoading(false);
					return;
				}

				const { error: signInError } = await authClient.signIn.email({
					email,
					password
				});

				if (signInError) {
					setErrorMessage(signInError.message || t('auth.error_unknown_signin'));
					setLoading(false);
					return;
				}
			} else {
				const { error: signInError } = await authClient.signIn.email({
					email,
					password
				});

				if (signInError) {
					setErrorMessage(signInError.message || t('auth.error_unknown_signin'));
					setLoading(false);
					return;
				}
			}
			router.push('/');
		} catch (error: any) {
			setErrorMessage(error.message || t('auth.error_unexpected'));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
			<Card className="w-full max-w-[448px] border-border/50 bg-background p-12 sm:rounded-[28px] sm:border sm:bg-card/50 sm:shadow-xl backdrop-blur-sm">
				<div className="flex flex-col items-center space-y-2 mb-10">
					<div className="flex items-center gap-2 mb-4">
						<div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
							<Video className="h-5 w-5 fill-current" />
						</div>
						<span className="text-xl font-bold tracking-tight">OpenWatch</span>
					</div>

					{currentView === 'email' && (
						<>
							<h1 className="text-2xl font-normal text-foreground">{t('auth.sign_in')}</h1>
							<p className="text-base text-muted-foreground">{t('auth.sign_in_description')}</p>
						</>
					)}
					{currentView === 'password' && (
						<>
							<h1 className="text-2xl font-normal text-foreground">{isSigningUp ? t('auth.create_account') : t('auth.welcome')}</h1>
							<div className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-sm text-muted-foreground mt-2">
								<span className="max-w-[200px] truncate">{email}</span>
								<button onClick={() => setCurrentView('email')} className="hover:text-foreground font-medium">
									{t('auth.edit')}
								</button>
							</div>
						</>
					)}
				</div>

				{errorMessage && <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center justify-center">{errorMessage}</div>}

				{currentView === 'email' ? (
					<form onSubmit={handleEmailNext} className="space-y-8">
						<div className="space-y-4">
							<div className="space-y-2">
								<Input
									type="email"
									placeholder={t('auth.email')}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="h-14 w-full rounded-lg border-input bg-background px-4 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
								/>
								<Link href="#" className="inline-block text-sm font-medium text-blue-500 hover:text-blue-400">
									{t('auth.forgot_email')}
								</Link>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2">
							<Link href="#" onClick={handleCreateAccountClick} className="text-sm font-medium text-blue-500 hover:text-blue-400">
								{t('auth.create_account')}
							</Link>
							<Button type="submit" className="h-10 rounded-full px-8 font-medium" disabled={loading || !email}>
								{t('auth.next')}
							</Button>
						</div>
					</form>
				) : (
					<form onSubmit={handlePasswordSubmit} className="space-y-8">
						<div className="space-y-4">
							{isSigningUp && (
								<Input
									type="text"
									placeholder={t('auth.name')}
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									className="h-14 w-full rounded-lg border-input bg-background px-4 text-base"
								/>
							)}

							<div className="relative">
								<Input
									type={showPassword ? 'text' : 'password'}
									placeholder={t('auth.enter_password')}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="h-14 w-full rounded-lg border-input bg-background px-4 text-base pr-12"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/90"
								>
									{showPassword ? t('auth.hide_password') : t('auth.show_password')}
								</button>
							</div>

							{!isSigningUp && (
								<Link href="#" className="inline-block text-sm font-medium text-primary hover:text-primary/90">
									{t('auth.forgot_password')}
								</Link>
							)}
						</div>

						<div className="flex items-center justify-end pt-2">
							<Button type="submit" className="h-10 rounded-full px-8 font-medium" disabled={loading}>
								{isSigningUp ? t('auth.sign_up') : t('auth.sign_in')}
							</Button>
						</div>
					</form>
				)}
			</Card>
		</div>
	);
};

export default AuthPage;
