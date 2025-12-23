export interface DocsEndpoint {
	method: string;
	path: string;
	desc: string;
	scopes?: string[];
	request?: string;
	response?: string;
}

export interface DocsCategory {
	category: string;
	routes: DocsEndpoint[];
}
