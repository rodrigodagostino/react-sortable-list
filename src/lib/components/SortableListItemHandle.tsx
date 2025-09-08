import { Children } from 'react';
import Icon from './Icon';
import type { SortableListItemHandleProps as HandleProps } from '../types';
import styles from './SortableListItemHandle.module.css';

function SortableListItemHandle({ children }: HandleProps) {
	return (
		<span className={styles['rsl-handle']} aria-hidden="true">
			{Children.count(children) ? <>{children}</> : <Icon name="handle" />}
		</span>
	);
}

export default SortableListItemHandle;
