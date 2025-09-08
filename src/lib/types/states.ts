import type { RefObject } from 'react';
import type { ItemRect } from './';
import type { SortableListRootProps as RootProps } from './props.js';

export interface SortableListRootState {
	rootRef: RefObject<HTMLUListElement | null>;
	rootProps: RootProps;
	dragState:
		| 'idle'
		| 'ptr-drag-start'
		| 'ptr-drag'
		| 'ptr-drop'
		| 'ptr-cancel'
		| 'kbd-drag-start'
		| 'kbd-drag'
		| 'kbd-drop'
		| 'kbd-cancel';
	ghostState: 'idle' | 'ptr-drag-start' | 'ptr-drag' | 'ptr-predrop' | 'ptr-drop' | 'ptr-remove';
	draggedItem: HTMLLIElement | null;
	targetItem: HTMLLIElement | null;
	focusedItem: HTMLLIElement | null;
	itemRects: ItemRect[] | null;
	pointer: { x: number; y: number } | null;
	pointerOrigin: { x: number; y: number } | null;
	isBetweenBounds: boolean;
	isRTL: boolean;
}
