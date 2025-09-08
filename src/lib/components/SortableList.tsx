import { Children } from 'react';
import SortableListGhost from './SortableListGhost';
import SortableListItem from './SortableListItem';
import SortableListItemHandle from './SortableListItemHandle';
import SortableListItemRemove from './SortableListItemRemove';
import type {
	SortableListRootProps as RootProps,
	SortableListItemProps as ItemProps,
} from '../types';
import styles from './SortableList.module.css';

function SortableList({ children }: RootProps) {
	return (
		<>
			<ul className={styles['rsl-root']} aria-orientation="vertical">
				{Children.count(children) ? (
					<>{children}</>
				) : (
					<p>
						To display your list, put a few <code>{'<SortableList.Item>'}</code> inside your
						<code>{'<SortableList.Root>'}</code>.
					</p>
				)}
			</ul>
			<SortableListGhost />
		</>
	);
}

SortableList.Item = SortableListItem;
SortableList.ItemHandle = SortableListItemHandle;
SortableList.ItemRemove = SortableListItemRemove;
SortableList.Props = {} as RootProps;
SortableList.ItemProps = {} as ItemProps;

export default SortableList;
