import type { IconProps } from '../types';

function Icon({ name }: IconProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={`rsl-icon-${name}`}
			height="18"
			viewBox={`${name === 'handle' ? 4 : 0} 0 ${name === 'handle' ? 16 : 24} 24`}
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			pointerEvents="none"
		>
			{name === 'handle' ? (
				<>
					<circle cx="9" cy="12" r="1" />
					<circle cx="9" cy="5" r="1" />
					<circle cx="9" cy="19" r="1" />
					<circle cx="15" cy="12" r="1" />
					<circle cx="15" cy="5" r="1" />
					<circle cx="15" cy="19" r="1" />
				</>
			) : (
				<>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</>
			)}
		</svg>
	);
}

export default Icon;
