import { Skeleton } from '~components/skeleton';

export const ChannelPageSkeleton = () => {
	return (
		<div className="flex flex-col w-full min-h-screen bg-background">
			<div className="max-w-[1284px] mx-auto w-full px-4 sm:px-12 lg:px-16 pt-4">
				{/* Banner Skeleton */}
				<Skeleton className="w-full aspect-6/1 min-h-[100px] max-h-[212px] rounded-xl" />

				{/* Header Section Skeleton */}
				<div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 py-6 md:py-8">
					{/* Avatar Skeleton */}
					<Skeleton className="h-20 w-20 md:h-40 md:w-40 rounded-full shrink-0 border-4 border-background" />

					{/* Channel Info Skeleton */}
					<div className="flex flex-col flex-1 items-center md:items-start gap-3 min-w-0 pt-2 w-full">
						<Skeleton className="h-8 w-64 md:w-96" />
						
						<div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-24" />
						</div>

						<Skeleton className="h-4 w-full max-w-2xl" />

						{/* Buttons Skeleton */}
						<div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2 w-full md:w-auto">
							<Skeleton className="h-9 w-32 rounded-full" />
							<Skeleton className="h-9 w-32 rounded-full" />
						</div>
					</div>
				</div>

				{/* Tabs Skeleton */}
				<div className="border-b border-border/40 mt-4">
					<div className="flex gap-8 pb-3">
						<Skeleton className="h-6 w-16" />
						<Skeleton className="h-6 w-16" />
						<Skeleton className="h-6 w-16" />
					</div>
				</div>

				{/* Content Grid Skeleton */}
				<div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6 pb-10">
					{Array.from({ length: 10 }).map((_, i) => (
						<div key={i} className="flex flex-col gap-2">
							<Skeleton className="aspect-video w-full rounded-xl" />
							<div className="flex gap-2">
								<Skeleton className="h-9 w-9 rounded-full shrink-0" />
								<div className="flex flex-col gap-1 w-full">
									<Skeleton className="h-4 w-[90%]" />
									<Skeleton className="h-3 w-[60%]" />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
