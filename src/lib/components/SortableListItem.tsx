import type { SortableListItemProps as ItemProps } from '../types';
import styles from './SortableListItem.module.css';

function SortableListItem({ children }: ItemProps) {
	return <li className={styles['rsl-item']}>{children}</li>;
}

export default SortableListItem;
