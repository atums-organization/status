export type ApiKeyScope =
	| "services:read"
	| "services:write"
	| "groups:read"
	| "groups:write"
	| "checks:read"
	| "checks:write"
	| "events:read"
	| "events:write"
	| "webhooks:read"
	| "webhooks:write"
	| "settings:read"
	| "settings:write"
	| "audit:read"
	| "invites:read"
	| "invites:write"
	| "export:read"
	| "import:write";

export interface ApiKey {
	id: string;
	userId: string;
	name: string;
	keyPrefix: string;
	scopes: ApiKeyScope[];
	lastUsedAt: string | null;
	expiresAt: string | null;
	createdAt: string;
}

export interface ApiKeyWithKey extends ApiKey {
	key: string;
}

export const API_SCOPES: { value: ApiKeyScope; label: string; category: string }[] = [
	{ value: "services:read", label: "Read services", category: "Services" },
	{ value: "services:write", label: "Create/update/delete services", category: "Services" },
	{ value: "groups:read", label: "Read groups", category: "Groups" },
	{ value: "groups:write", label: "Create/update/delete groups", category: "Groups" },
	{ value: "checks:read", label: "Read check results", category: "Checks" },
	{ value: "checks:write", label: "Run manual checks", category: "Checks" },
	{ value: "events:read", label: "Read events", category: "Events" },
	{ value: "events:write", label: "Create/update/delete events", category: "Events" },
	{ value: "webhooks:read", label: "Read webhooks", category: "Webhooks" },
	{ value: "webhooks:write", label: "Create/update/delete webhooks", category: "Webhooks" },
	{ value: "settings:read", label: "Read settings", category: "Settings" },
	{ value: "settings:write", label: "Update settings", category: "Settings" },
	{ value: "audit:read", label: "Read audit logs", category: "Audit" },
	{ value: "invites:read", label: "Read invites", category: "Invites" },
	{ value: "invites:write", label: "Create/delete invites", category: "Invites" },
	{ value: "export:read", label: "Export data", category: "Export/Import" },
	{ value: "import:write", label: "Import data", category: "Export/Import" },
];
