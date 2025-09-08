import { useMemo, type CSSProperties, type PointerEventHandler } from 'react';
import SortableListItem from './SortableListItem';
import { useRootContext } from '../contexts';
import type { SortableListGhostProps as GhostProps } from '../types';
import {
	calculateTranslate,
	calculateTranslateWithAlignment,
	getIndex,
	isInSameRow,
	preserveFormFieldValues,
} from '../utils';
import styles from './SortableListGhost.module.css';

function SortableListGhost({ ghostRef }: GhostProps) {
	const {
		rootRef,
		rootProps,
		ghostState,
		draggedItem,
		targetItem,
		itemRects,
		pointer,
		pointerOrigin,
	} = useRootContext();

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

	const cloneDraggedItemContent = () => {
		if (!ghostRef.current || !draggedItem) return;

		const clone = draggedItem.cloneNode(true) as HTMLLIElement;
		preserveFormFieldValues(draggedItem, clone);
		// `childNodes` is used to always preserve the dragged item’s content,
		// even when only a text node is present inside.
		ghostRef.current?.children[0].replaceChildren(...clone.childNodes);
	};
	useMemo(() => cloneDraggedItemContent(), [draggedItem]);

	const styleLeft = useMemo(() => {
		if (ghostState === 'idle' || typeof draggedIndex !== 'number' || !draggedRect || !itemRects)
			return '0';

		if (ghostState === 'ptr-remove') return ghostRef.current?.style.left;

		if (!targetItem || typeof targetIndex !== 'number' || !targetRect) return `${draggedRect.x}px`;

		const left =
			rootProps.direction === 'vertical'
				? draggedRect.x
				: draggedIndex < targetIndex
					? targetRect.right - draggedRect.width
					: targetRect.x;
		return `${left}px`;
	}, [ghostState]);

	const styleTop = useMemo(() => {
		if (ghostState === 'idle' || typeof draggedIndex !== 'number' || !draggedRect || !itemRects)
			return '0';

		if (ghostState === 'ptr-remove') return ghostRef.current?.style.top;

		if (!targetItem || typeof targetIndex !== 'number' || !targetRect) return `${draggedRect.y}px`;

		const alignItems = rootRef.current
			? window.getComputedStyle(rootRef.current).alignItems
			: 'center';
		const top =
			rootProps.direction === 'vertical'
				? draggedIndex < targetIndex
					? targetRect.bottom - draggedRect.height
					: targetRect.y
				: isInSameRow(draggedRect, targetRect)
					? draggedRect.y
					: alignItems === 'center'
						? targetRect.y + (targetRect.height - draggedRect.height) / 2
						: alignItems === 'end' || alignItems === 'flex-end'
							? targetRect.bottom - draggedRect.height
							: targetRect.y;
		return `${top}px`;
	}, [ghostState]);

	const styleTransform = useMemo(() => {
		if (ghostState === 'idle' || !ghostRef.current || !pointer || !pointerOrigin)
			return 'translate3d(0, 0, 0)';

		const ghostRect = ghostRef.current?.getBoundingClientRect();
		const rootRect = rootRef.current?.getBoundingClientRect();

		if (!rootRect) return 'translate3d(0, 0, 0)';

		if (
			(ghostState === 'ptr-drag-start' || ghostState === 'ptr-drag') &&
			ghostRect &&
			draggedRect
		) {
			if (!rootProps.hasBoundaries) {
				const x =
					rootProps.direction === 'horizontal' ||
					(rootProps.direction === 'vertical' && !rootProps.hasLockedAxis)
						? `${pointer.x - pointerOrigin.x}px`
						: 0;
				const y =
					rootProps.direction === 'vertical' ||
					(rootProps.direction === 'horizontal' && !rootProps.hasLockedAxis)
						? `${pointer.y - pointerOrigin.y}px`
						: 0;

				return `translate3d(${x}, ${y}, 0)`;
			}

			const x =
				rootProps.direction === 'horizontal' ||
				(rootProps.direction === 'vertical' && !rootProps.hasLockedAxis)
					? // If the ghost is dragged to the left of the list,
						// place it to the right of the left edge of the list.
						pointer.x - (pointerOrigin.x - draggedRect.x) < rootRect.x + rootProps.gap! / 2
						? `${rootRect.x - draggedRect.x + rootProps.gap! / 2}px`
						: // If the ghost is dragged to the right of the list,
							// place it to the left of the right edge of the list.
							pointer.x + ghostRect.width - (pointerOrigin.x - draggedRect.x) >
							  rootRect.right - rootProps.gap! / 2
							? `${rootRect.right - draggedRect.x - ghostRect.width - rootProps.gap! / 2}px`
							: `${pointer.x - pointerOrigin.x}px`
					: 0;
			const y =
				rootProps.direction === 'vertical' ||
				(rootProps.direction === 'horizontal' && !rootProps.hasLockedAxis)
					? // If the ghost is dragged above the top of the list,
						// place it right below the top edge of the list.
						pointer.y - (pointerOrigin.y - draggedRect.y) < rootRect.y + rootProps.gap! / 2
						? `${rootRect.y - draggedRect.y + rootProps.gap! / 2}px`
						: // If the ghost is dragged below the bottom of the list,
							// place it right above the bottom edge of the list.
							pointer.y + ghostRect.height - (pointerOrigin.y - draggedRect.y) >
							  rootRect.bottom - rootProps.gap! / 2
							? `${rootRect.bottom - draggedRect.y - ghostRect.height - rootProps.gap! / 2}px`
							: `${pointer.y - pointerOrigin.y}px`
					: 0;
			return `translate3d(${x}, ${y}, 0)`;
		}

		if (
			ghostState === 'ptr-predrop' &&
			typeof draggedIndex === 'number' &&
			ghostRect &&
			draggedRect
		) {
			if (!rootRef.current || !targetItem || typeof targetIndex !== 'number' || !targetRect)
				return 'translate3d(0, 0, 0)';

			const x =
				rootProps.direction === 'vertical'
					? `${ghostRect.x - targetRect.x + (ghostRect.width - targetRect.width) / 2}px`
					: calculateTranslate('x', ghostRect, targetRect, draggedIndex, targetIndex);
			const y =
				rootProps.direction === 'vertical'
					? calculateTranslate('y', ghostRect, targetRect, draggedIndex, targetIndex)
					: calculateTranslateWithAlignment(rootRef.current, ghostRect, targetRect);

			return `translate3d(${x}, ${y}, 0)`;
		}

		if (ghostState === 'ptr-drop') return 'translate3d(0, 0, 0)';

		if (ghostState === 'ptr-remove') return ghostRef.current?.style.transform;
	}, [ghostState, pointer]);

	const handlePointerDown: PointerEventHandler<HTMLDivElement> = (e) => {
		// Prevent focusing the item inside when clicking on the ghost.
		e.preventDefault();
	};

	return (
		<div
			ref={ghostRef}
			className={styles['rsl-ghost']}
			style={
				{
					left: styleLeft,
					top: styleTop,
					transform: styleTransform,
					'--rsl-gap': `${rootProps.gap}px`,
					'--rsl-wrap': rootProps.hasWrapping ? 'wrap' : 'nowrap',
					'--rsl-transition-duration': `${rootProps.transition?.duration}ms`,
					'--rsl-transition-easing': `${rootProps.transition?.easing}`,
				} as CSSProperties
			}
			data-ghost-state={ghostState}
			data-can-clear-on-drag-out={rootProps.canClearOnDragOut}
			data-can-remove-on-drop-out={rootProps.canRemoveOnDropOut}
			aria-hidden="true"
			onPointerDown={handlePointerDown}
		>
			<SortableListItem
				id={draggedId || 'rsl-ghost-item'}
				index={draggedIndex ?? -1}
				className={draggedItem?.className.replace(/\s*s-[a-zA-Z0-9]{12}\s*/g, '')}
			/>
		</div>
	);
}

export default SortableListGhost;
