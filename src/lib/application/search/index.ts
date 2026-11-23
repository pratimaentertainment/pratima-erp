export interface GlobalSearchQuery {
  term: string;
  modules?: string[];
  limit?: number;
}

export interface GlobalSearchResult {
  moduleId: string;
  results: {
    id: string;
    title: string;
    subtitle?: string;
    score: number;
    url: string;
  }[];
}

export interface SearchEngine {
  search(query: GlobalSearchQuery): Promise<GlobalSearchResult[]>;
}
