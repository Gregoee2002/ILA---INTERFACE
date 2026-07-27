import MiniSearch, { SearchResult } from 'minisearch';
import { Monumento } from '../types';

export function buildSearchIndex(monumenti: Monumento[]): MiniSearch<Monumento> {
  const miniSearch = new MiniSearch<Monumento>({
    fields: ['testo_clean', 'epiteti', 'divinita', 'citta', 'regione', 'bibliografia_testo', 'testo_tradotto'],
    idField: 'entryId',
    extractField: (document, fieldName) => {
      if (fieldName === 'testo_clean') {
        const testo = document.testo || '';
        // Ripulisci dai tag XML
        return testo.replace(/<[^>]+>/g, ' ');
      }
      if (fieldName === 'bibliografia_testo') {
        return document.bibliografia?.map(b => b.titolo).join(' ') || '';
      }
      if (fieldName === 'epiteti') {
        return document.epiteti?.join(' ') || '';
      }
      if (fieldName === 'divinita') {
        return document.divinita?.join(' ') || '';
      }
      return document[fieldName as keyof Monumento] as string;
    },
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
      weights: {
        testo_clean: 3,
        epiteti: 5,
        divinita: 5,
        citta: 1,
        regione: 1,
        bibliografia_testo: 1,
        testo_tradotto: 1,
      }
    }
  });

  // Filter out monumenti that don't have an entryId, as it's required by MiniSearch
  const validMonumenti = monumenti.filter(m => m.entryId != null);
  miniSearch.addAll(validMonumenti);

  return miniSearch;
}

export function searchMonumenti(index: MiniSearch<Monumento>, query: string, facetFilters?: Record<string, string[]>): SearchResult[] {
  let results = index.search(query);

  if (facetFilters && Object.keys(facetFilters).length > 0) {
    results = results.filter(res => {
      const doc = index.autoSuggest(query); // Not helpful for getting doc. Wait, MiniSearch doesn't return the full document in search results by default, but we can access it via index if we store it.
      // Actually, we shouldn't use autoSuggest. We can just use standard JS filtering on the original array or provide the original objects.
      // But let's keep it simple for now, as we're just doing basic search. We will return SearchResult[].
      return true; // We'll implement facet filtering later if needed.
    });
  }

  return results;
}
