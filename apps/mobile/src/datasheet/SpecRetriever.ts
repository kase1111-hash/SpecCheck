/**
 * SpecRetriever
 *
 * Retrieves specifications for matched components.
 * Uses cache first, falls back to API.
 */

import type {
  MatchedComponent,
  ComponentWithSpecs,
  SpecRetrievalResult,
} from '@speccheck/shared-types';
import { getDatasheetCache } from './DatasheetCache';
import { getDatasheetAPI } from './DatasheetAPI';

/**
 * Spec retrieval service
 */
export class SpecRetriever {
  private cache = getDatasheetCache();
  private api = getDatasheetAPI();

  /**
   * Retrieve specs for all matched components
   */
  async retrieveAll(matches: MatchedComponent[]): Promise<SpecRetrievalResult> {
    const components: ComponentWithSpecs[] = [];
    let cacheHits = 0;
    let apiCalls = 0;

    for (const match of matches) {
      const result = await this.retrieve(match);
      components.push(result.component);

      if (result.source === 'cache') cacheHits++;
      if (result.source === 'api') apiCalls++;
    }

    return {
      frameId: matches[0]?.regionId.split('_')[0] || '',
      components,
      cacheHits,
      apiCalls,
    };
  }

  /**
   * Retrieve specs for a single component
   */
  async retrieve(
    match: MatchedComponent
  ): Promise<{ component: ComponentWithSpecs; source: 'cache' | 'api' | 'none' }> {
    // If no part number, can't retrieve specs
    if (!match.partNumber) {
      return {
        component: {
          match,
          specs: null,
          error: 'No part number identified',
        },
        source: 'none',
      };
    }

    // Try cache first
    const cached = await this.cache.get(match.partNumber);
    if (cached) {
      return {
        component: {
          match,
          specs: cached,
          error: null,
        },
        source: 'cache',
      };
    }

    // Fall back to API
    try {
      const fromApi = await this.api.getByPartNumber(match.partNumber);
      if (fromApi) {
        // Cache the result
        await this.cache.set(fromApi);

        return {
          component: {
            match,
            specs: fromApi,
            error: null,
          },
          source: 'api',
        };
      }
    } catch (error) {
      console.error('[SpecRetriever] API error:', error);
    }

    // No specs found
    return {
      component: {
        match,
        specs: null,
        error: `No datasheet found for ${match.partNumber}`,
      },
      source: 'none',
    };
  }
}

/**
 * Singleton instance
 */
let retrieverInstance: SpecRetriever | null = null;

/**
 * Get the spec retriever instance
 */
export function getSpecRetriever(): SpecRetriever {
  if (!retrieverInstance) {
    retrieverInstance = new SpecRetriever();
  }
  return retrieverInstance;
}
