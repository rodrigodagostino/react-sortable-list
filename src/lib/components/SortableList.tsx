import {
	Children,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEventHandler,
	type MouseEventHandler,
	type PointerEventHandler,
} from 'react';
import SortableListGhost from './SortableListGhost';
import SortableListItem from './SortableListItem';
import SortableListItemHandle from './SortableListItemHandle';
import SortableListItemRemove from './SortableListItemRemove';
import type {
	SortableListRootProps as RootProps,
	SortableListItemProps as ItemProps,
	SortableListItemData as ItemData,
	SortableListRootEvents as RootEvents,
} from '../types';
import { RootContextProvider, useRootContext } from '../contexts/index';
import {
	announce,
	areColliding,
	getClosestScrollableAncestor,
	getCollidingItem,
	getIndex,
	getItemRects,
	getScrollingSpeed,
	getTextDirection,
	isFullyVisible,
	isOrResidesInInteractiveElement,
	isRootElement,
	isScrollable,
	scrollIntoView,
	shouldAutoScroll,
} from '../utils';
import styles from './SortableList.module.css';

function SortableListWithinContext(props: RootProps) {
	const {
		gap = 12,
		direction = 'vertical',
		delay = 0,
		transition = undefined,
		hasWrapping = false,
		hasLockedAxis = false,
		hasBoundaries = false,
		canClearOnDragOut = false,
		canRemoveOnDropOut = false,
		isLocked = false,
		isDisabled = false,
		announcements = undefined,
		onMounted,
		onDragStart,
		onDrag,
		onDrop,
		onDragEnd,
		onDestroyed,
		children,
		...restProps
	} = props;

	const _transition = useMemo(
		() => ({
			duration: 320,
			easing: 'cubic-bezier(0.2, 1, 0.1, 1)',
			...transition,
		}),
		[transition]
	);
	const _announcements = useMemo(() => announcements || announce, [announcements]);

	const rootRef = useRef<HTMLUListElement>(null);
	const ghostRef = useRef<HTMLDivElement>(null);

	const {
		setRootRef,
		setRootProps,
		dragState,
		setDragState,
		ghostState,
		setGhostState,
		draggedItem,
		setDraggedItem,
		targetItem,
		setTargetItem,
		focusedItem,
		itemRects,
		setItemRects,
		setPointer,
		pointerOrigin,
		setPointerOrigin,
		isBetweenBounds,
		setIsBetweenBounds,
		isRTL,
		setIsRTL,
	} = useRootContext();

	// Prevent stale state inside event handlers by combining useRef with useEffect.
	const dragStateRef = useRef(dragState);
	const ghostStateRef = useRef(ghostState);
	const draggedItemRef = useRef(draggedItem);
	const targetItemRef = useRef(targetItem);
	const focusedItemRef = useRef(focusedItem);
	const itemRectsRef = useRef(itemRects);

	useEffect(() => {
		dragStateRef.current = dragState;
	}, [dragState]);

	useEffect(() => {
		ghostStateRef.current = ghostState;
	}, [ghostState]);

	useEffect(() => {
		draggedItemRef.current = draggedItem;
	}, [draggedItem]);

	useEffect(() => {
		targetItemRef.current = targetItem;
	}, [targetItem]);

	useEffect(() => {
		focusedItemRef.current = focusedItem;
	}, [focusedItem]);

	useEffect(() => {
		itemRectsRef.current = itemRects;
	}, [itemRects]);

	const [pointerId, setPointerId] = useState<number | null>(null);
	const [delayTimeoutId, setDelayTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
	const [transitionTimeoutId, setTransitionTimeoutId] = useState<ReturnType<
		typeof setTimeout
	> | null>(null);
	const [_, setLiveText] = useState('');

	useEffect(() => {
		onMounted?.(null);
		setRootRef(rootRef);
		if (rootRef.current) {
			rootRef.current.addEventListener('itemfocusout', handleItemFocusOut);
			setIsRTL(getTextDirection(rootRef.current) === 'rtl');
		}

		return () => {
			onDestroyed?.(null);
			if (rootRef.current) rootRef.current.removeEventListener('itemfocusout', handleItemFocusOut);
		};
	}, []);

	useEffect(() => {
		setRootProps({
			gap,
			direction,
			delay,
			transition: _transition,
			hasWrapping,
			hasLockedAxis,
			hasBoundaries,
			canClearOnDragOut,
			canRemoveOnDropOut,
			isLocked,
			isDisabled,
			announcements: _announcements,
			onMounted,
			onDragStart,
			onDrag,
			onDrop,
			onDragEnd,
			onDestroyed,
		});
	}, [props]);

	const [scrollingSpeed, setScrollingSpeed] = useState(0);
	const scrollingSpeedRef = useRef(scrollingSpeed);
	useEffect(() => {
		scrollingSpeedRef.current = scrollingSpeed;
	}, [scrollingSpeed]);
	const scrollableAncestor: HTMLElement | undefined = useMemo(
		() => getClosestScrollableAncestor(rootRef.current as HTMLElement),
		[rootRef.current]
	);
	const [scrollableAncestorScrollTop, setScrollableAncestorScrollTop] = useState<
		number | undefined
	>(0);
	const [scrollableAncestorScrollLeft, setScrollableAncestorScrollLeft] = useState<
		number | undefined
	>(0);
	const isScrollingDocument = useMemo(
		() => (scrollableAncestor ? isRootElement(scrollableAncestor, direction) : false),
		[scrollableAncestor, direction]
	);
	useEffect(() => {
		if (scrollingSpeed !== 0) scroll();
	}, [scrollingSpeed]);

	function scroll() {
		if (!scrollableAncestor) return;

		if (typeof window !== 'undefined')
			requestAnimationFrame(() => {
				if (!shouldAutoScroll(scrollableAncestor!, direction, scrollingSpeed)) return;

				const x = direction === 'horizontal' ? scrollingSpeed : 0;
				const y = direction === 'vertical' ? scrollingSpeed : 0;
				scrollableAncestor!.scrollBy(x, y);

				if (scrollingSpeedRef.current !== 0) scroll();
			});
	}

	function autoScroll(clientX: PointerEvent['clientX'], clientY: PointerEvent['clientY']) {
		if (!scrollableAncestor) return;

		setScrollingSpeed(
			getScrollingSpeed(scrollableAncestor, clientX, clientY, direction, isScrollingDocument)
		);
	}

	const handlePointerDown: PointerEventHandler<HTMLUListElement> = (e) => {
		if (e.button !== 0 || dragStateRef.current !== 'idle' || focusedItemRef.current) {
			e.preventDefault();
			return;
		}

		const target = e.target as HTMLElement;
		const currItem = target.closest<HTMLLIElement>('[class^="rsl-item_"]');
		if (!currItem) return;

		if (
			(isLocked && !isOrResidesInInteractiveElement(target, currItem)) ||
			(currItem.dataset.isLocked === 'true' &&
				!isOrResidesInInteractiveElement(target, currItem)) ||
			isDisabled ||
			currItem.getAttribute('aria-disabled') === 'true'
		) {
			e.preventDefault();
			return;
		}

		// Prevent default if the clicked/tapped element is a label with a for attribute.
		// NOTE 1: for some reason that is still unknown to me, clicking/tapping a <label> element sets
		// the focus on the current <SortableList.Item>.
		// NOTE 2: We need to run this check before isOrResidesInInteractiveElement() because, if the
		// target is a <label> element, it will stop the execution of this event handler and the
		// preventDefault() right after will never run, but we can’t preventDefault() for every element
		// because we need to allow interactive elements to run normally.
		if (target.tagName.toLowerCase() === 'label' && target.hasAttribute('for')) e.preventDefault();

		// Prevent dragging if the current list item contains a handle, but we’re not dragging from it.
		const hasItemHandle = !!currItem.querySelector('[class^="rsl-item-handle"]');
		const isOrResidesInItemHandle = target.closest('[class^="rsl-item-handle"]');
		if (hasItemHandle && !isOrResidesInItemHandle) {
			e.preventDefault();
			return;
		}

		// Prevent dragging if the current list item contains an interactive element
		// and we’re also not dragging from a handle inside that interactive element.
		if (isOrResidesInInteractiveElement(target, currItem) && !isOrResidesInItemHandle) return;
		// Prevent focus from being set on the current <SortableList.Item>.
		e.preventDefault();

		currItem.setPointerCapture(e.pointerId);
		setPointerId(e.pointerId);

		setPointer({ x: e.clientX, y: e.clientY });
		setPointerOrigin({ x: e.clientX, y: e.clientY });
		setDraggedItem(currItem);
		setItemRects(getItemRects(rootRef.current as HTMLUListElement));

		if (delay <= 0) handlePointerDragStart(currItem);
		else {
			rootRef.current?.addEventListener('pointermove', handlePointerMoveWithDelay);
			setDelayTimeoutId(setTimeout(async () => handlePointerDragStart(currItem), delay));
		}
	};

	const handlePointerDragStart = (currItem: HTMLLIElement) => {
		rootRef.current?.removeEventListener('pointermove', handlePointerMoveWithDelay);

		setGhostState('ptr-drag-start');
		setDragState('ptr-drag-start');

		onDragStart?.({
			deviceType: 'pointer',
			draggedItem: currItem,
			draggedItemId: currItem.id,
			draggedItemIndex: getIndex(currItem),
			isBetweenBounds: isBetweenBounds,
			canRemoveOnDropOut: canRemoveOnDropOut || false,
		});

		rootRef.current?.addEventListener('pointermove', handlePointerMove);
		rootRef.current?.addEventListener(
			'pointerup',
			() => {
				rootRef.current?.removeEventListener('pointermove', handlePointerMove);
				handlePointerUp();
			},
			{ once: true }
		);
		rootRef.current?.addEventListener(
			'pointercancel',
			() => {
				rootRef.current?.removeEventListener('pointermove', handlePointerMove);
				handlePointerCancel();
			},
			{ once: true }
		);
		// Provide a fallback for the pointerup event not firing on Webkit for iOS.
		// This occurs when tapping an item to start dragging and releasing without movement.
		rootRef.current?.addEventListener(
			'lostpointercapture',
			() => {
				rootRef.current?.removeEventListener('pointermove', handlePointerMove);
				if (dragStateRef.current === 'ptr-drag-start') handlePointerCancel();
			},
			{ once: true }
		);
	};

	const [rafId, setRafId] = useState<number | null>(null);
	const handlePointerMove = ({ clientX, clientY }: PointerEvent) => {
		if (rafId) return;

		if (ghostStateRef.current !== 'ptr-drag' || dragStateRef.current !== 'ptr-drag') {
			setGhostState('ptr-drag');
			setDragState('ptr-drag');
		}

		setRafId(
			requestAnimationFrame(async () => {
				if (!draggedItemRef.current || !itemRectsRef.current || !ghostRef.current) return;

				const rootRect = rootRef.current?.getBoundingClientRect();
				const ghostRect = ghostRef.current?.getBoundingClientRect();

				if (!rootRect || !ghostRect) return;

				setPointer({ x: clientX, y: clientY });
				setIsBetweenBounds(areColliding(ghostRect, rootRect));

				// Re-set itemRects only during scrolling.
				// (setting it here instead of in the `scroll()` function to reduce the performance impact)
				if (
					scrollableAncestor?.scrollTop !== scrollableAncestorScrollTop ||
					scrollableAncestor?.scrollLeft !== scrollableAncestorScrollLeft
				) {
					setItemRects(getItemRects(rootRef.current as HTMLUListElement));
					setScrollableAncestorScrollTop(scrollableAncestor?.scrollTop);
					setScrollableAncestorScrollLeft(scrollableAncestor?.scrollLeft);
				}

				const collidingItemRect = ghostRect
					? getCollidingItem(ghostRect, itemRectsRef.current)
					: null;

				if (collidingItemRect)
					setTargetItem(
						rootRef.current!.querySelector<HTMLLIElement>(
							`[data-item-id="${collidingItemRect.id}"]`
						)
					);
				else if (canClearOnDragOut || (canRemoveOnDropOut && !isBetweenBounds)) setTargetItem(null);

				onDrag?.({
					deviceType: 'pointer',
					draggedItem: draggedItemRef.current,
					draggedItemId: draggedItemRef.current.id,
					draggedItemIndex: getIndex(draggedItemRef.current),
					targetItem: targetItemRef.current,
					targetItemId: targetItemRef.current ? targetItemRef.current.id : null,
					targetItemIndex: targetItemRef.current ? getIndex(targetItemRef.current) : null,
					isBetweenBounds: isBetweenBounds,
					canRemoveOnDropOut: canRemoveOnDropOut || false,
				});

				if (isScrollable(scrollableAncestor, direction)) autoScroll(clientX, clientY);

				setRafId(null);
			})
		);
	};

	const handlePointerMoveWithDelay = ({ clientX, clientY }: PointerEvent) => {
		if (delayTimeoutId !== null && pointerOrigin) {
			const threshold = 10;
			const deltaX = Math.abs(clientX - pointerOrigin.x);
			const deltaY = Math.abs(clientY - pointerOrigin.y);

			if ((deltaX > threshold || deltaY > threshold) && delayTimeoutId) {
				clearTimeout(delayTimeoutId);
				setDelayTimeoutId(null);
			}
		}
	};

	const handlePointerUp = () => {
		handlePointerAndKeyboardDrop(ghostRef.current as HTMLDivElement, 'ptr-drop');
	};

	const handlePointerCancel = () => {
		handlePointerAndKeyboardDrop(ghostRef.current as HTMLDivElement, 'ptr-cancel');
	};

	const handleKeyDown: KeyboardEventHandler<HTMLUListElement> = (e) => {
		if (dragStateRef.current === 'kbd-drop') {
			e.preventDefault();
			return;
		}

		const { key } = e;
		const target = e.target as HTMLElement;

		if (target === rootRef.current || target === focusedItemRef.current) {
			if (key === ' ') {
				// Prevent default only if the target is a sortable item.
				// This allows interactive elements (like buttons) to operate normally.
				if (
					!target.className.includes('rsl-item_') ||
					isLocked ||
					target.dataset.isLocked === 'true'
				)
					return;
				else e.preventDefault();

				if (!focusedItemRef.current || target.getAttribute('aria-disabled') === 'true') return;

				if (dragStateRef.current === 'idle') {
					setDraggedItem(focusedItemRef.current);
					const draggedIndex = getIndex(focusedItemRef.current);
					setItemRects(getItemRects(rootRef.current as HTMLUListElement));

					setDragState('kbd-drag-start');

					onDragStart?.({
						deviceType: 'keyboard',
						draggedItem: focusedItemRef.current,
						draggedItemId: focusedItemRef.current.id,
						draggedItemIndex: draggedIndex,
						isBetweenBounds: isBetweenBounds,
						canRemoveOnDropOut: canRemoveOnDropOut || false,
					});

					if (draggedItemRef.current)
						setLiveText(_announcements.lifted(draggedItemRef.current, draggedIndex));
				} else {
					handlePointerAndKeyboardDrop(focusedItemRef.current, 'kbd-drop');
				}
			}

			if (key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowDown' || key === 'ArrowRight') {
				e.preventDefault();

				const step =
					key === 'ArrowUp' || (key === 'ArrowLeft' && !isRTL) || (key === 'ArrowRight' && isRTL)
						? -1
						: 1;
				const focusedIndex = focusedItemRef.current ? getIndex(focusedItemRef.current) : null;

				if (dragStateRef.current !== 'kbd-drag-start' && dragStateRef.current !== 'kbd-drag') {
					if (!focusedItemRef.current || focusedIndex === null) {
						const firstItem = rootRef.current?.querySelector<HTMLLIElement>('[class^="rsl-item_"]');
						if (!firstItem) return;

						firstItem.focus({ preventScroll: true });

						if (scrollableAncestor && !isFullyVisible(firstItem, scrollableAncestor))
							scrollIntoView(firstItem, scrollableAncestor, direction, -1, isScrollingDocument);
						return;
					}

					// Prevent focusing the previous item if the current one is the first,
					// and focusing the next item if the current one is the last.
					const items = rootRef.current?.querySelectorAll<HTMLLIElement>('[class^="rsl-item_"]');
					if (
						!items ||
						(step === -1 && focusedIndex === 0) ||
						(step === 1 && focusedIndex === items.length - 1)
					)
						return;

					if (step === 1)
						(focusedItemRef.current.nextElementSibling as HTMLLIElement)?.focus({
							preventScroll: true,
						});
					else
						(focusedItemRef.current.previousElementSibling as HTMLLIElement)?.focus({
							preventScroll: true,
						});
				} else {
					if (!draggedItemRef.current || !itemRectsRef.current) return;

					const draggedIndex = getIndex(draggedItemRef.current);
					let targetIndex = targetItemRef.current ? getIndex(targetItemRef.current) : null;
					// Prevent moving the selected item if it’s the first or last item,
					// or is at the top or bottom of the list.
					if (
						(step === -1 && draggedIndex === 0 && !targetItemRef.current) ||
						(step === -1 && targetIndex === 0) ||
						(step === 1 &&
							draggedIndex === itemRectsRef.current.length - 1 &&
							!targetItemRef.current) ||
						(step === 1 && targetIndex === itemRectsRef.current.length - 1)
					)
						return;

					if (!targetItemRef.current) {
						setTargetItem(
							step === 1
								? (draggedItemRef.current.nextElementSibling as HTMLLIElement)
								: (draggedItemRef.current.previousElementSibling as HTMLLIElement)
						);
					} else {
						setTargetItem(
							step === 1
								? (targetItemRef.current.nextElementSibling as HTMLLIElement)
								: (targetItemRef.current.previousElementSibling as HTMLLIElement)
						);
					}

					const targetId = targetItemRef.current?.id;
					targetIndex = targetItemRef.current ? getIndex(targetItemRef.current) : null;

					setDragState('kbd-drag');

					onDrag?.({
						deviceType: 'keyboard',
						draggedItem: draggedItemRef.current,
						draggedItemId: draggedItemRef.current.id,
						draggedItemIndex: draggedIndex,
						targetItem: targetItemRef.current,
						targetItemId: targetId ? targetId : null,
						targetItemIndex: targetIndex,
						isBetweenBounds: isBetweenBounds,
						canRemoveOnDropOut: canRemoveOnDropOut || false,
					});

					if (
						scrollableAncestor &&
						targetItemRef.current &&
						!isFullyVisible(targetItemRef.current, scrollableAncestor)
					)
						scrollIntoView(
							targetItemRef.current,
							scrollableAncestor,
							direction,
							step,
							isScrollingDocument
						);

					if (targetItemRef.current && typeof targetIndex === 'number')
						setLiveText(
							_announcements.dragged(
								draggedItemRef.current,
								draggedIndex,
								targetItemRef.current,
								targetIndex
							)
						);
				}

				requestAnimationFrame(() => {
					const scrollTarget =
						dragStateRef.current !== 'kbd-drag' ? focusedItemRef.current : targetItemRef.current;
					if (
						scrollTarget &&
						scrollableAncestor &&
						!isFullyVisible(scrollTarget, scrollableAncestor)
					)
						scrollIntoView(scrollTarget, scrollableAncestor, direction, step, isScrollingDocument);
				});
			}

			if (key === 'Home' || key === 'End') {
				e.preventDefault();

				const items = rootRef.current?.querySelectorAll<HTMLLIElement>('[class^="rsl-item_"]');
				const focusedIndex = (focusedItemRef.current && getIndex(focusedItemRef.current)) ?? null;

				if (
					dragStateRef.current !== 'kbd-drag-start' &&
					dragStateRef.current !== 'kbd-drag' &&
					items
				) {
					// Prevent focusing the previous item if the current one is the first,
					// and focusing the next item if the current one is the last.
					if (
						(key === 'Home' && focusedIndex === 0) ||
						(key === 'End' && focusedIndex === items.length - 1)
					)
						return;

					if (key === 'Home') items[0]?.focus({ preventScroll: true });
					else items[items.length - 1]?.focus({ preventScroll: true });
				} else {
					if (!draggedItemRef.current || !itemRectsRef.current || !items) return;

					const draggedIndex = getIndex(draggedItemRef.current);
					let targetIndex = targetItemRef.current ? getIndex(targetItemRef.current) : null;
					// Prevent moving the selected item if it’s the first or last item,
					// or is at the top or bottom of the list.
					if (
						(key === 'Home' && draggedIndex === 0 && !targetItemRef.current) ||
						(key === 'Home' && targetIndex === 0) ||
						(key === 'End' &&
							draggedIndex === itemRectsRef.current.length - 1 &&
							!targetItemRef.current) ||
						(key === 'End' && targetIndex === itemRectsRef.current.length - 1)
					)
						return;

					setTargetItem(key === 'Home' ? items[0] : items[items.length - 1]);
					targetIndex = targetItemRef.current ? getIndex(targetItemRef.current) : null;

					setDragState('kbd-drag');

					onDrag?.({
						deviceType: 'keyboard',
						draggedItem: draggedItemRef.current,
						draggedItemId: draggedItemRef.current.id,
						draggedItemIndex: draggedIndex,
						targetItem: targetItemRef.current,
						targetItemId: targetItemRef.current ? targetItemRef.current.id : null,
						targetItemIndex: targetIndex,
						isBetweenBounds: isBetweenBounds,
						canRemoveOnDropOut: canRemoveOnDropOut || false,
					});

					if (targetItemRef.current && typeof targetIndex === 'number')
						setLiveText(
							_announcements.dragged(
								draggedItemRef.current,
								draggedIndex,
								targetItemRef.current,
								targetIndex
							)
						);
				}

				requestAnimationFrame(() => {
					const scrollTarget =
						dragStateRef.current !== 'kbd-drag' ? focusedItemRef.current : targetItemRef.current;
					const step = key === 'Home' ? -1 : 1;
					if (
						scrollTarget &&
						scrollableAncestor &&
						!isFullyVisible(scrollTarget, scrollableAncestor)
					)
						scrollIntoView(scrollTarget, scrollableAncestor, direction, step, isScrollingDocument);
				});
			}

			if (key === 'Escape' && draggedItemRef.current) {
				// Prevent closing the <dialog> if the dragged item is inside one.
				if (rootRef.current?.closest<HTMLDialogElement>('dialog')) e.preventDefault();
				handlePointerAndKeyboardDrop(draggedItemRef.current, 'kbd-cancel');
			}
		}
	};

	const handlePointerAndKeyboardDrop = (
		element: HTMLElement,
		action: 'ptr-drop' | 'ptr-cancel' | 'kbd-drop' | 'kbd-cancel'
	) => {
		if (
			!draggedItemRef.current ||
			(action.includes('ptr') && dragStateRef.current === 'ptr-drop') ||
			(action.includes('kbd') && dragStateRef.current === 'kbd-drop')
		)
			return;

		const draggedIndex = getIndex(draggedItemRef.current);
		const targetIndex = targetItemRef.current ? getIndex(targetItemRef.current) : null;

		if (action === 'ptr-drop') {
			setGhostState(!isBetweenBounds && canRemoveOnDropOut ? 'ptr-remove' : 'ptr-predrop');
			requestAnimationFrame(() => {
				if (ghostStateRef.current !== 'ptr-remove') setGhostState('ptr-drop');
			});
			setDragState('ptr-drop');
		} else if (action === 'ptr-cancel') {
			if (ghostStateRef.current !== 'ptr-remove') setGhostState('ptr-drop');
			setDragState('ptr-cancel');
		}

		if (action === 'kbd-drop') {
			setDragState('kbd-drop');
			setLiveText(
				_announcements.dropped(
					draggedItemRef.current,
					draggedIndex,
					targetItemRef.current,
					targetIndex
				)
			);
		} else if (action === 'kbd-cancel') {
			setDragState('kbd-cancel');
			if (scrollableAncestor)
				scrollIntoView(
					draggedItemRef.current,
					scrollableAncestor,
					direction,
					-1,
					isScrollingDocument
				);
			setLiveText(_announcements.canceled(draggedItemRef.current, draggedIndex));
		}

		onDrop?.({
			deviceType: action.includes('pointer') ? 'pointer' : 'keyboard',
			draggedItem: draggedItemRef.current,
			draggedItemId: draggedItemRef.current.id,
			draggedItemIndex: draggedIndex,
			targetItem: targetItemRef.current,
			targetItemId: targetItemRef.current ? targetItemRef.current.id : null,
			targetItemIndex: targetIndex,
			isBetweenBounds: isBetweenBounds,
			canRemoveOnDropOut: canRemoveOnDropOut || false,
		});

		const handleTransitionEnd = ({ propertyName }: TransitionEvent) => {
			if (propertyName === 'z-index') {
				handlePointerAndKeyboardDragEnd(action);
				element?.removeEventListener('transitionend', handleTransitionEnd);
				if (transitionTimeoutId) {
					clearTimeout(transitionTimeoutId);
					setTransitionTimeoutId(null);
				}
			}
		};

		if (_transition.duration > 0) {
			element?.addEventListener('transitionend', handleTransitionEnd);
			// Ensure the drag operation completes even if `transitionend` doesn’t fire.
			setTransitionTimeoutId(
				setTimeout(() => {
					element?.removeEventListener('transitionend', handleTransitionEnd);
					setTransitionTimeoutId(null);
				}, _transition.duration + 100)
			);
		} else {
			handlePointerAndKeyboardDragEnd(action);
		}
	};

	const handlePointerAndKeyboardDragEnd = (
		action: 'ptr-drop' | 'ptr-cancel' | 'kbd-drop' | 'kbd-cancel'
	) => {
		if (!draggedItemRef.current) return;

		setGhostState('idle');
		setDragState('idle');

		onDragEnd?.({
			deviceType: action.includes('ptr') ? 'pointer' : 'keyboard',
			draggedItem: draggedItemRef.current,
			draggedItemId: draggedItemRef.current.id,
			draggedItemIndex: getIndex(draggedItemRef.current),
			targetItem: targetItemRef.current,
			targetItemId: targetItemRef.current ? targetItemRef.current.id : null,
			targetItemIndex: targetItemRef.current ? getIndex(targetItemRef.current) : null,
			isBetweenBounds: isBetweenBounds,
			canRemoveOnDropOut: canRemoveOnDropOut || false,
			isCanceled: action.includes('cancel'),
		});

		if (typeof pointerId === 'number' && draggedItemRef.current?.hasPointerCapture(pointerId))
			draggedItemRef.current?.releasePointerCapture(pointerId);
		setPointerId(null);
		setPointer(null);
		setPointerOrigin(null);
		setDraggedItem(null);
		setTargetItem(null);
		setItemRects(null);
		setIsBetweenBounds(true);
		setRafId(null); // Required on mobile when transition duration is `0ms` and `rafId` is not cleared during `pointermove`.
		setScrollingSpeed(0);
	};

	const handleContextMenu: MouseEventHandler<HTMLUListElement> = (e) => {
		if (dragStateRef.current !== 'idle') {
			e.preventDefault();
		}
	};

	const handleItemFocusOut = (event: Event) => {
		const customEvent = event as CustomEvent<{ item: HTMLLIElement }>;
		handlePointerAndKeyboardDrop(customEvent.detail.item, 'kbd-cancel');
	};

	return (
		<>
			<ul
				ref={rootRef}
				className={styles['rsl-root']}
				style={
					{
						pointerEvents: focusedItemRef.current ? 'none' : 'auto',
						'--rsl-gap': `${gap}px`,
						'--rsl-wrap': hasWrapping ? 'wrap' : 'nowrap',
						'--rsl-transition-duration': `${_transition.duration}ms`,
						'--rsl-transition-easing': _transition.easing,
					} as CSSProperties
				}
				data-has-locked-axis={hasLockedAxis}
				data-has-boundaries={hasBoundaries}
				data-can-clear-on-drag-out={canClearOnDragOut}
				data-can-remove-on-drop-out={canRemoveOnDropOut}
				data-is-locked={isLocked}
				data-is-disabled={isDisabled}
				tabIndex={0}
				role="listbox"
				aria-orientation={direction}
				aria-disabled={isDisabled}
				aria-label={restProps['aria-label'] || undefined}
				aria-labelledby={restProps['aria-labelledby'] || undefined}
				aria-description={
					!restProps['aria-describedby']
						? restProps['aria-description'] ||
							'Press the arrow keys to move through the list items. Press Space to start dragging an item. When dragging, use the arrow keys to move the item around. Press Space again to drop the item, or Escape to cancel.'
						: undefined
				}
				aria-describedby={restProps['aria-describedby'] || undefined}
				aria-activedescendant={focusedItemRef.current ? focusedItemRef.current.id : undefined}
				onPointerDown={handlePointerDown}
				onKeyDown={handleKeyDown}
				onContextMenu={handleContextMenu}
			>
				{Children.count(children) ? (
					<>{children}</>
				) : (
					<p>
						To display your list, put a few <code>{'<SortableList.Item>'}</code> inside your
						<code>{'<SortableList.Root>'}</code>.
					</p>
				)}
			</ul>
			<SortableListGhost ghostRef={ghostRef} />
		</>
	);
}

function SortableList({ children, ...props }: RootProps) {
	return (
		<RootContextProvider>
			<SortableListWithinContext {...props}>{children}</SortableListWithinContext>
		</RootContextProvider>
	);
}

// Compound Pattern.
// https://www.patterns.dev/react/compound-pattern/
SortableList.Props = {} as RootProps;
SortableList.Events = {} as RootEvents;
SortableList.Item = SortableListItem;
SortableList.ItemProps = {} as ItemProps;
SortableList.ItemData = {} as ItemData;
SortableList.ItemHandle = SortableListItemHandle;
SortableList.ItemRemove = SortableListItemRemove;

export default SortableList;
