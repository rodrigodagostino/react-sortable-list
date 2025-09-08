import { Children, type MouseEventHandler } from 'react';
import Icon from './Icon';
import { useRootContext } from '../contexts';
import type { SortableListItemRemoveProps as RemoveProps } from '../types';
import { getIndex } from '../utils';

function SortableListItemRemove({ children, ...restProps }: RemoveProps) {
	const { rootRef, focusedItem } = useRootContext();

	const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
		if (focusedItem && rootRef.current) {
			const items = rootRef.current.querySelectorAll<HTMLLIElement>('[class^="rsl-item_"]');
			if (items.length > 1) {
				// Focus the next/previous item (if it exists) before removing.
				const step = getIndex(focusedItem) !== items.length - 1 ? 1 : -1;
				if (step === 1)
					(focusedItem.nextElementSibling as HTMLLIElement)?.focus({
						preventScroll: true,
					});
				else
					(focusedItem.previousElementSibling as HTMLLIElement)?.focus({
						preventScroll: true,
					});
			} else {
				// Focus the root element (if there are no items left) before removing.
				rootRef.current.focus();
			}
		}

		restProps.onClick?.(e);
	};

	return (
		<button className="rsl-item-remove" onClick={handleClick}>
			{Children.count(children) ? <>{children}</> : <Icon name="remove" />}
		</button>
	);
}

export default SortableListItemRemove;
