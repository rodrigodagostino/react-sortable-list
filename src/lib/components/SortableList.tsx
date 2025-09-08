import { Children } from 'react';
import SortableListGhost from './SortableListGhost';
import type { SortableListRootProps as RootProps } from '../types';
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

export default SortableList;
