import SortableList from '../components/SortableList';

export interface SortableListItemData extends Omit<typeof SortableList.ItemProps, 'index'> {
	[key: string]: unknown;
}
