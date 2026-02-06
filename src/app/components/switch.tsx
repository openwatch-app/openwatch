'use client';

import * as React from 'react';
import { cn } from '~lib/utils';

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, checked, onCheckedChange, ...props }, ref) => (
	<label className={cn('relative inline-flex items-center cursor-pointer', className)}>
		<input
			type="checkbox"
			className="sr-only peer"
			ref={ref}
			checked={checked}
			onChange={(e) => onCheckedChange(e.target.checked)}
			{...props}
		/>
		<div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
	</label>
));

Switch.displayName = 'Switch';
