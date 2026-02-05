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
		// Basic email regex for client-side validation
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleEmailNext = (e: React.FormEvent) => {
		e.preventDefault();
		setErrorMessage('');
		if (!isValidEmail(email)) {
			setErrorMessage('Please enter a valid email address.');
			setLoading(false);
			return;
		}
		if (!isValidEmail(email)) {
			setErrorMessage('Please enter a valid email address.');
			return;
		}
		setCurrentView('password');
		setIsSigningUp(false); // Assume sign-in by default
	};

	const handleCreateAccountClick = (e: React.MouseEvent) => {
		e.preventDefault();
		setErrorMessage('');

		setCurrentView('password');
		setIsSigningUp(true);
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setErrorMessage('');
		if (!isValidEmail(email)) {
			setErrorMessage('Please enter a valid email address.');
			setLoading(false);
			return;
		}

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

				// After successful sign-up, sign in the user
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
			router.push('/'); // Redirect to home page on success
		} catch (error: any) {
			setErrorMessage(error.message || 'An unexpected error occurred.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
				<Link href="/" className="mb-6 flex items-center justify-center gap-1">
					<div className="rounded-lg bg-orange-600 p-1 text-white">
						<Video className="h-4 w-4 fill-current" />
					</div>
					<span className="text-xl font-bold tracking-tighter">OpenWatch</span>
				</Link>

				{errorMessage && <p className="mb-4 text-center text-sm text-orange-600">{errorMessage}</p>}

				{currentView === 'email' ? (
					<form onSubmit={handleEmailNext} className="space-y-4">
						<h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
						<p className="text-muted-foreground">to continue to OpenWatch</p>
						<Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full" />
						<Link href="#" className="text-sm text-blue-500 hover:underline">
							Forgot email?
						</Link>

						<div className="flex items-center justify-between">
							<Link href="#" onClick={handleCreateAccountClick} className="text-sm text-blue-500 hover:underline">
								Create account
							</Link>
							<Button type="submit" className="px-6 py-2" disabled={loading || !email}>
								Next
							</Button>
						</div>
					</form>
				) : (
					<form onSubmit={handlePasswordSubmit} className="space-y-4">
						<h1 className="text-2xl font-semibold text-foreground">{isSigningUp ? 'Create your account' : 'Welcome'}</h1>
						<Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 text-foreground" />

						{isSigningUp && <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full" />}
						<div className="relative">
							<Input
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full pr-10"
							/>
							<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-500 hover:underline">
								{showPassword ? 'Hide' : 'Show'}
							</button>
						</div>
						{!isSigningUp && (
							<Link href="#" className="text-sm text-blue-500 hover:underline">
								Forgot password?
							</Link>
						)}
						<div className="flex items-center justify-end">
							<Button type="submit" className="px-6 py-2" disabled={loading}>
								Next
							</Button>
						</div>
					</form>
				)}
			</Card>
		</div>
	);
};

export default AuthPage;
