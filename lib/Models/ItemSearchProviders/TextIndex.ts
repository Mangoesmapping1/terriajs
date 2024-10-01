import MiniSearch, { Options as MiniSearchOptions, SearchResult } from "minisearch";
import loadText from "../../Core/loadText";
import { IndexBase, IndexType } from "./Types";
import joinUrl from "./joinUrl";
import { JsonObject } from "../../Core/Json";

// Text search query
type TextSearchQuery = string;

class ResultLabel {
  prefix: string | undefined;
  suffix: string | undefined;

  constructor(prefix?: string, suffix?: string) {
    this.prefix = prefix;
    this.suffix = suffix;
  }
}

/**
 * An index for searching arbirtray text.
 *
 * We use the Minisearch library for indexing and searching free text.  The
 * index files contains a serialized JSON representation of the Minisearch
 * instance and the options used to construct the Minisearch instance.
 */
export default class TextIndex implements IndexBase<TextSearchQuery> {
  readonly type = IndexType.text;

  private miniSearchIndex?: Promise<MiniSearch>;

  /**
   * Construct the search index.
   *
   * @param url Url of the text index file
   */
  constructor(readonly url: string, readonly resultLabel?: ResultLabel) {}

  /**
   * Loads the text index.
   *
   * @param indexRootUrl The URL of the index root directory.
   * @param _valueHint Ignored for TextIndex.
   */
  async load(indexRootUrl: string, _valueHint: TextSearchQuery): Promise<void> {
    if (this.miniSearchIndex) return;
    const promise = loadText(joinUrl(indexRootUrl, this.url))
      .then((text: string) => JSON.parse(text))
      .then((json: any) =>
        MiniSearch.loadJS(
          json.index as any,
          json.options as any as MiniSearchOptions
        )
      );
    this.miniSearchIndex = promise;
    return promise.then(() => {});
  }

  /**
   * Search the text index for the given value.
   *
   * @param value         The value to be searched.
   * @param queryOptions  MiniSearch.SearchOptions
   * @param return The IDs of objects matching the search text.
   */
  async search(
    value: TextSearchQuery,
    queryOptions: MiniSearchOptions
  ): Promise<Set<number>> {
    if (this.miniSearchIndex === undefined)
      throw new Error(`Text index not loaded`);
    const miniSearchIndex = await this.miniSearchIndex;
    const results = miniSearchIndex.search(value, queryOptions);
    const ids = new Set(results.map((r) => r.id));
    return ids;
  }

  async searchReturnResults(
    value: TextSearchQuery
  ): Promise<SearchResult[]> {
    if (this.miniSearchIndex === undefined)
      throw new Error(`Text index not loaded`);
    const miniSearchIndex = await this.miniSearchIndex;
    const results = miniSearchIndex.search(value);
    return results;
  }

  static fromJson(json: JsonObject) {
    const url = json.url as string;

    const inputResultLabel = json.resultLabel as JsonObject;
    const resultLabel: ResultLabel = new ResultLabel();
    if (inputResultLabel) {
      resultLabel.prefix = inputResultLabel.prefix as string | undefined;
      resultLabel.suffix = inputResultLabel.suffix as string | undefined;
    }

    return new TextIndex(url, resultLabel);
  }
}
