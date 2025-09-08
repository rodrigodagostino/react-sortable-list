import { Children } from 'react';
import Icon from './Icon';
import type { SortableListItemRemoveProps as RemoveProps } from '../types';

function SortableListItemRemove({ children }: RemoveProps) {
	return (
		<button className="rsl-item-remove" data-role="remove">
			{Children.count(children) ? <>{children}</> : <Icon name="remove" />}
		</button>
	);
}

export default SortableListItemRemove;
