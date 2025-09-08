import SortableListItem from './SortableListItem';
import styles from './SortableListGhost.module.css';

function SortableListGhost() {
	return (
		<div className={styles['rsl-ghost']}>
			<SortableListItem />
		</div>
	);
}

export default SortableListGhost;
