import { useEffect, useMemo, useRef, type FocusEventHandler } from 'react';
import type { SortableListItemProps as ItemProps } from '../types';
import { useRootContext } from '../contexts';
import {
	calculateTranslate,
	calculateTranslateWithAlignment,
	dispatch,
	getIndex,
	INTERACTIVE_ELEMENTS,
	INTERACTIVE_ROLE_ATTRIBUTES,
	isInSameRow,
} from '../utils';
import styles from './SortableListItem.module.css';

function SortableListItem({
	id,
	index,
	isLocked = false,
	isDisabled = false,
	children,
	...restProps
}: ItemProps & { className?: string }) {
	const itemRef = useRef<HTMLLIElement>(null);

	const {
		rootRef,
		rootProps,
		dragState,
		draggedItem,
		targetItem,
		focusedItem,
		setFocusedItem,
		itemRects,
		isBetweenBounds,
		isRTL,
	} = useRootContext();

	const isGhost = useMemo(
		() => !!itemRef.current?.parentElement?.className.includes('rsl-ghost'),
		[rootRef]
	);

	const currentRect = useMemo(() => (itemRects ? itemRects[index] : null), [itemRects, index]);
	const draggedId = useMemo(() => (draggedItem ? draggedItem.id : null), [draggedItem]);
	const draggedIndex = useMemo(() => (draggedItem ? getIndex(draggedItem) : null), [draggedItem]);
	// itemRects is used as a reliable reference to the item’s position in the list
	// without the risk of catching in-between values while an item is translating.
	const draggedRect = useMemo(
		() => (itemRects && typeof draggedIndex === 'number' ? itemRects[draggedIndex] : null),
		[itemRects, draggedIndex]
	);
	const targetIndex = useMemo(() => (targetItem ? getIndex(targetItem) : null), [targetItem]);
	const targetRect = useMemo(
		() => (itemRects && typeof targetIndex === 'number' ? itemRects[targetIndex] : null),
		[itemRects, targetIndex]
	);
	const focusedId = useMemo(() => (focusedItem ? focusedItem.id : null), [focusedItem]);

	const selectors = [...INTERACTIVE_ELEMENTS, ...INTERACTIVE_ROLE_ATTRIBUTES].join(', ');
	const setInteractiveElementsTabIndex = () => {
		itemRef.current
			?.querySelectorAll<HTMLElement>(selectors)
			.forEach(
				(el) =>
					(el.tabIndex =
						dragState !== 'kbd-drag-start' &&
						dragState !== 'kbd-drag' &&
						focusedId === String(id) &&
						!rootProps.isDisabled &&
						!isDisabled
							? 0
							: -1)
			);
	};
	useMemo(() => {
		if (dragState === 'kbd-drag-start') setInteractiveElementsTabIndex();
	}, [dragState, focusedId]);

	useEffect(() => {
		setInteractiveElementsTabIndex();
	}, []);

	const styleWidth = useMemo(() => {
		if (draggedId !== String(id)) return undefined;
		if (
			!isGhost &&
			rootProps.direction === 'horizontal' &&
			!isBetweenBounds &&
			rootProps.canRemoveOnDropOut
		)
			return '0';
		return `${currentRect?.width}px`;
	}, [draggedItem, isBetweenBounds]);

	const styleHeight = useMemo(() => {
		if (draggedId !== String(id)) return undefined;
		if (
			!isGhost &&
			rootProps.direction === 'vertical' &&
			!isBetweenBounds &&
			rootProps.canRemoveOnDropOut
		)
			return '0';
		return `${currentRect?.height}px`;
	}, [draggedItem, isBetweenBounds]);

	const styleTransform = useMemo(() => {
		if (isGhost) return 'none';
		if (
			dragState === 'idle' ||
			dragState === 'ptr-cancel' ||
			dragState === 'kbd-cancel' ||
			!itemRects ||
			!draggedItem ||
			!targetItem ||
			currentRect === null ||
			draggedIndex === null ||
			draggedRect === null ||
			targetIndex === null ||
			targetRect === null
		)
			return 'translate3d(0, 0, 0)';

		if (draggedId !== String(id)) {
			if (
				(index > draggedIndex && index <= targetIndex) ||
				(index < draggedIndex && index >= targetIndex)
			) {
				const step = index > draggedIndex ? -1 : 1;
				const operator = index > draggedIndex === !isRTL ? '-' : '';
				const x =
					rootProps.direction === 'vertical'
						? '0'
						: isInSameRow(currentRect, itemRects[index + step])
							? `${operator}${draggedRect.width + rootProps.gap!}px`
							: `${itemRects[index + step].right - currentRect.right}px`;
				const y =
					rootProps.direction === 'vertical'
						? `${operator}${draggedRect.height + rootProps.gap!}px`
						: isInSameRow(currentRect, itemRects[index + step])
							? '0'
							: calculateTranslateWithAlignment(
									rootRef.current!,
									itemRects[index + step],
									currentRect
								);

				return `translate3d(${x}, ${y}, 0)`;
			} else {
				return 'translate3d(0, 0, 0)';
			}
		} else {
			const x =
				rootProps.direction === 'vertical'
					? '0'
					: calculateTranslate('x', targetRect, draggedRect, draggedIndex, targetIndex);
			const y =
				rootProps.direction === 'vertical'
					? calculateTranslate('y', targetRect, draggedRect, draggedIndex, targetIndex)
					: isInSameRow(draggedRect, targetRect)
						? '0'
						: calculateTranslateWithAlignment(rootRef.current!, targetRect, draggedRect);

			return `translate3d(${x}, ${y}, 0)`;
		}
	}, [draggedItem, targetItem, dragState, isBetweenBounds]);

	const handleFocus: FocusEventHandler<HTMLLIElement> = (e) => {
		if (dragState.includes('ptr')) {
			e.preventDefault();
			return;
		}

		setFocusedItem(itemRef.current);
	};

	// `focusout` is preferred over `blur` since it detects the loss of focus
	// on the current element and it’s descendants too.
	const handleBlur: FocusEventHandler<HTMLLIElement> = (e) => {
		const relatedTarget = e.relatedTarget as HTMLElement | null;
		if (!relatedTarget || (relatedTarget && !relatedTarget.closest('[class^="rsl-item_"]'))) {
			if (!focusedItem) return;
			if (itemRef.current) dispatch(itemRef.current, 'itemfocusout', { item: focusedItem });
			setFocusedItem(null);
		}
	};

	return (
		<li
			ref={itemRef}
			id={id}
			className={styles['rsl-item']}
			style={{ width: styleWidth, height: styleHeight, transform: styleTransform }}
			data-item-id={id}
			data-item-index={index}
			data-drag-state={draggedId === String(id) ? dragState : 'idle'}
			data-is-ghost={isGhost}
			data-is-between-bounds={isBetweenBounds || (draggedId === String(id) && isBetweenBounds)}
			data-is-locked={rootProps.isLocked || isLocked}
			data-is-disabled={rootProps.isDisabled || isDisabled}
			tabIndex={focusedId === String(id) ? 0 : -1}
			role="option"
			aria-disabled={rootProps.isDisabled || isDisabled}
			aria-label={restProps['aria-label'] || undefined}
			aria-labelledby={restProps['aria-labelledby'] || undefined}
			aria-selected={focusedId === String(id)}
			onFocus={handleFocus}
			onBlur={handleBlur}
		>
			{children}
		</li>
	);
}

export default SortableListItem;
