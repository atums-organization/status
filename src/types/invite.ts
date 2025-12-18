export interface Invite {
	id: string;
	code: string;
	createdBy: string;
	usedBy: string | null;
	usedByUsername: string | null;
	usedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
}
