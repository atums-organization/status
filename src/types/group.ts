export interface Group {
	id: string;
	name: string;
	position: number;
	emailNotifications: boolean;
	createdAt: string;
	parentGroupName: string | null;
}

export interface MasterGroup extends Group {
	subGroups: Group[];
}
