'use client';

import { Button } from '~components/button';
import { Input } from '~components/input';
import { Card } from '~components/card';
import { Video } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '~app/lib/auth-client';

const AuthPage = () => {
	const [email, setEmail] = useState('');
	const [currentView, setCurrentView] = useState<'email' | 'password'>('email');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [username, setUsername] = useState('');
	const [isSigningUp, setIsSigningUp] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const router = useRouter();

	const isValidEmail = (email: string) => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleEmailNext = (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage('');
		if (!isValidEmail(email)) {
			setErrorMessage('Please enter a valid email address.');
			return;
		}
		setCurrentView('password');
		// We don't change isSigningUp here, it stays as false (default) or whatever was set previously if we navigated back
		// Actually, if we are just entering email, we assume sign-in flow unless "Create account" was clicked.
		// But standard flow is: Enter email -> Check if exists -> Password.
		// Here we just go to password view.
	};

	const handleCreateAccountClick = (e: React.MouseEvent) => {
		e.preventDefault();
		setErrorMessage('');

		if (!isValidEmail(email)) {
			setErrorMessage('Please enter a valid email address first.');
			return;
		}

		// Reset states for fresh start if needed, but here we just switch view mode if we want to support "Create account" flow.
		// The design shows "Create account" link.
		// If clicked, we probably want to start the sign-up flow.
		// For now, let's assume it leads to the password/username setup screen or toggles a mode.
		setIsSigningUp(true);
		setCurrentView('password');
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrorMessage('');

		try {
			if (isSigningUp) {
				const { error: signUpError } = await authClient.signUp.email({
					name: username,
					email,
					password
				});

				if (signUpError) {
					setErrorMessage(signUpError.message || 'An unknown sign-up error occurred.');
					setLoading(false);
					return;
				}

				const { error: signInError } = await authClient.signIn.email({
					email,
					password
				});

				if (signInError) {
					setErrorMessage(signInError.message || 'An unknown sign-in error occurred.');
					setLoading(false);
					return;
				}
			} else {
				const { error: signInError } = await authClient.signIn.email({
					email,
					password
				});

				if (signInError) {
					setErrorMessage(signInError.message || 'An unknown sign-in error occurred.');
					setLoading(false);
					return;
				}
			}
			router.push('/');
		} catch (error: any) {
			setErrorMessage(error.message || 'An unexpected error occurred.');
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
							<h1 className="text-2xl font-normal text-foreground">Sign in</h1>
							<p className="text-base text-muted-foreground">to continue to OpenWatch</p>
						</>
					)}
					{currentView === 'password' && (
						<>
							<h1 className="text-2xl font-normal text-foreground">{isSigningUp ? 'Create Account' : 'Welcome'}</h1>
							<div className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-sm text-muted-foreground mt-2">
								<span className="max-w-[200px] truncate">{email}</span>
								<button onClick={() => setCurrentView('email')} className="hover:text-foreground font-medium">
									Edit
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
									placeholder="Email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="h-14 w-full rounded-lg border-input bg-background px-4 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
								/>
								<Link href="#" className="inline-block text-sm font-medium text-blue-500 hover:text-blue-400">
									Forgot email?
								</Link>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2">
							<Link href="#" onClick={handleCreateAccountClick} className="text-sm font-medium text-blue-500 hover:text-blue-400">
								Create account
							</Link>
							<Button type="submit" className="h-10 rounded-full px-8 font-medium" disabled={loading || !email}>
								Next
							</Button>
						</div>
					</form>
				) : (
					<form onSubmit={handlePasswordSubmit} className="space-y-8">
						<div className="space-y-4">
							{isSigningUp && (
								<Input
									type="text"
									placeholder="Username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
									className="h-14 w-full rounded-lg border-input bg-background px-4 text-base"
								/>
							)}

							<div className="relative">
								<Input
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="h-14 w-full rounded-lg border-input bg-background px-4 text-base pr-12"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-500 hover:text-blue-400"
								>
									{showPassword ? 'Hide' : 'Show'}
								</button>
							</div>

							{!isSigningUp && (
								<Link href="#" className="inline-block text-sm font-medium text-blue-500 hover:text-blue-400">
									Forgot password?
								</Link>
							)}
						</div>

						<div className="flex items-center justify-end pt-2">
							<Button type="submit" className="h-10 rounded-full px-8 font-medium" disabled={loading}>
								{isSigningUp ? 'Sign up' : 'Sign in'}
							</Button>
						</div>
					</form>
				)}
			</Card>
		</div>
	);
};

export default AuthPage;
