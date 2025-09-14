import { useState } from 'react';
import { getDefaultItems } from './fixtures';
import { SortableList, sortItems, removeItem } from './lib';
import '@fontsource/rubik/400.css';
import './App.css';
import './lib/styles.css';

function App() {
	const [items, setItems] = useState(getDefaultItems(5));

	const handleDrop = (e: (typeof SortableList.Events)['ondrop']) => {
		const { draggedItemIndex, isBetweenBounds, canRemoveOnDropOut } = e;
		if (!isBetweenBounds && canRemoveOnDropOut) setItems(removeItem(items, draggedItemIndex));
	};

	const handleDragEnd = (e: (typeof SortableList.Events)['ondragend']) => {
		const { draggedItemIndex, targetItemIndex, isCanceled } = e;
		if (!isCanceled && typeof targetItemIndex === 'number' && draggedItemIndex !== targetItemIndex)
			setItems(sortItems(items, draggedItemIndex, targetItemIndex));
	};

	return (
		<SortableList onDrop={handleDrop} onDragEnd={handleDragEnd}>
			{items.map((item, index) => (
				<SortableList.Item key={item.id} {...item} index={index}>
					<div className="rsl-item-content">
						<span className="rsl-item-content__text">{String(item.text)}</span>
					</div>
				</SortableList.Item>
			))}
		</SortableList>
	);
}

export default App;
