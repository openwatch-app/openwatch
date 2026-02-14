import { Skeleton } from '~components/skeleton';

export const StudioCustomizationSkeleton = () => {
	return (
		<div className="max-w-5xl mx-auto pb-20">
			{/* Header Skeleton */}
			<div className="flex items-center justify-between mb-6">
				<Skeleton className="h-8 w-64" />
				<div className="flex gap-2">
					<Skeleton className="h-9 w-32 rounded-full" />
					<Skeleton className="h-9 w-24 rounded-full" />
					<Skeleton className="h-9 w-24 rounded-full" />
				</div>
			</div>

			<div className="space-y-10">
				{/* Banner Image Section */}
				<section className="space-y-4">
					<div className="space-y-1">
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-96" />
					</div>
					<div className="bg-secondary/30 rounded-xl p-6 flex flex-col items-center gap-4 border border-dashed border-border/50">
						<Skeleton className="w-full aspect-6/1 max-h-[160px] rounded-lg" />
						<div className="flex gap-2">
							<Skeleton className="h-9 w-32 rounded-full" />
							<Skeleton className="h-9 w-32 rounded-full" />
						</div>
					</div>
				</section>

				{/* Profile Picture Section */}
				<section className="space-y-4">
					<div className="space-y-1">
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-96" />
					</div>
					<div className="flex items-center gap-6 bg-secondary/30 rounded-xl p-6 border border-dashed border-border/50">
						<Skeleton className="h-32 w-32 rounded-full shrink-0" />
						<div className="flex flex-col gap-4">
							<div className="flex gap-2">
								<Skeleton className="h-9 w-32 rounded-full" />
								<Skeleton className="h-9 w-32 rounded-full" />
							</div>
							<Skeleton className="h-4 w-64" />
						</div>
					</div>
				</section>

				{/* Basic Info Section */}
				<section className="space-y-6">
					<div className="space-y-1">
						<Skeleton className="h-6 w-32" />
						<Skeleton className="h-4 w-96" />
					</div>

					<div className="grid gap-6 max-w-3xl">
						{/* Name */}
						<div className="space-y-2">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-10 w-full rounded-md" />
							<Skeleton className="h-4 w-64" />
						</div>

						{/* Handle */}
						<div className="space-y-2">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-10 w-full rounded-md" />
							<Skeleton className="h-4 w-64" />
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-32 w-full rounded-md" />
							<Skeleton className="h-4 w-64" />
						</div>
					</div>
				</section>
			</div>
		</div>
	);
};
