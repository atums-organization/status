export interface SqlMigration {
	id: string;
	name: string;
	upSql: string;
	downSql?: string;
}
