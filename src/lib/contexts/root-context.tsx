import { createContext, useContext, useState, type Dispatch, type ReactNode } from 'react';
import type { SortableListRootState as RootState } from '../types/states';

type StateSetters<T> = {
	[K in keyof T as `set${Capitalize<string & K>}`]: Dispatch<React.SetStateAction<T[K]>>;
};

type RootContextProps = RootState & StateSetters<RootState>;

export const RootContext = createContext<RootContextProps | null>(null);

export function RootContextProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<RootState>({
		rootRef: { current: null },
		rootProps: {
			gap: 12,
			direction: 'vertical',
			delay: 0,
			transition: { duration: 320, easing: 'cubic-bezier(0.2, 1, 0.1, 1)' },
			hasWrapping: false,
			hasLockedAxis: false,
			hasBoundaries: false,
			canClearOnDragOut: false,
			canRemoveOnDropOut: false,
			isLocked: false,
			isDisabled: false,
		},
		dragState: 'idle',
		ghostState: 'idle',
		draggedItem: null,
		targetItem: null,
		focusedItem: null,
		itemRects: null,
		pointer: null,
		pointerOrigin: null,
		isBetweenBounds: false,
		isRTL: false,
	});

	const setters = Object.keys(state).reduce((acc, key) => {
		const setterName = `set${key.charAt(0).toUpperCase() + key.slice(1)}`;
		acc[setterName] = (value: any) => setState((prev) => ({ ...prev, [key]: value }));
		return acc;
	}, {} as any);

	return <RootContext.Provider value={{ ...state, ...setters }}>{children}</RootContext.Provider>;
}

export function useRootContext() {
	const context = useContext(RootContext);
	if (context === null) {
		throw new Error('useRootContext must be used within a RootContextProvider');
	}
	return context;
}
