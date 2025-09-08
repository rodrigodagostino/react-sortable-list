import type { ReactNode } from 'react';

export interface SortableListRootProps {
	/** Content to be rendered inside the list. */
	children?: ReactNode;
}

export interface SortableListItemProps {
	/** Content to be rendered inside the item. */
	children?: ReactNode;
}

export interface SortableListItemHandleProps {
	/** Content to be rendered inside the handle. */
	children?: ReactNode;
}

export interface SortableListItemRemoveProps {
	/** Content to be rendered inside the handle. */
	children?: ReactNode;
}

export interface IconProps {
	/** Name of the icon to display. */
	name: 'handle' | 'remove';
}
