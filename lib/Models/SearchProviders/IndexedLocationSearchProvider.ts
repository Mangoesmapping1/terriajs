import i18next from "i18next";
import { makeObservable, override, runInAction } from "mobx";
import Rectangle from "terriajs-cesium/Source/Core/Rectangle";

import {
  Category,
  SearchAction
} from "../../Core/AnalyticEvents/analyticEvents";
import loadJson from "../../Core/loadJson";
import { applyTranslationIfExists } from "../../Language/languageHelpers";
import LocationSearchProviderMixin from "../../ModelMixins/SearchProviders/LocationSearchProviderMixin";
import CesiumIonSearchProviderTraits from "../../Traits/SearchProviders/CesiumIonSearchProviderTraits";
import CreateModel from "../Definition/CreateModel";
import Terria from "../Terria";
import SearchProviderResults from "./SearchProviderResults";
import loadJson5 from "../../Core/loadJson5";
import SearchResult from "./SearchResult";
import CommonStrata from "../Definition/CommonStrata";
import { Index, IndexRoot, IndexType, parseIndexRoot } from "../ItemSearchProviders/Index";
import TextIndex from "../ItemSearchProviders/TextIndex";
import loadCsv from "../../Core/loadCsv";
import joinUrl from "../ItemSearchProviders/joinUrl";
import { Options as MiniSearchOptions, SearchResult as MiniSearchSearchResult } from "minisearch";
import LocationSearchProviderTraits from "../../Traits/SearchProviders/LocationSearchProviderTraits";
import CameraView from "../CameraView";


const t = i18next.t.bind(i18next);

export default class IndexedLocationSearchProvider extends LocationSearchProviderMixin(
  CreateModel(LocationSearchProviderTraits)
) {
  static readonly type = "indexed-location-search-provider";
  indexRootUrl: string;
  indexRoot?: IndexRoot;
  resultsData?: Promise<Record<string, string>[]>;
  indexes: TextIndex[] = [];
  queryOptions: MiniSearchOptions;

  get type() {
    return IndexedLocationSearchProvider.type;
  }

  constructor(uniqueId: string | undefined, terria: Terria) {
    super(uniqueId, terria);

    makeObservable(this);

    //const indexRootUrl = options?.indexRootUrl;
    // if (typeof indexRootUrl !== "string")
    //   throw new Error(t("indexedItemSearchProvider.missingOptionIndexRootUrl"));
    this.indexRootUrl = "";

    // TODO: move this to catalog options
    this.queryOptions = {
      fields: ["address", "lotplan", "street_name", "code", "pointnumber"],
      searchOptions: {
        prefix: true,
        fuzzy: 0.2
      }
    };
    this.initialize();
  }

  async loadIndexes() {
    console.log(`Loading search indexes: ${this.terria.searchIndexes}`);
    const indices = this.terria.searchIndexes;
    this.indexes = await Promise.all(
      indices.map(async (i: string) => {
        const textIndex = new TextIndex("");
        await textIndex.load(`${i}.json`, "");
        return textIndex;
      })
    );
    console.log(this.indexes);
  }

  /**
   * Fetches & parses the indexRoot file and then triggers fetching of the data
   * file but does not wait for it to complete. It should load before the
   * user needs to search
   */
  async initialize() {
    const indexRootUrl = this.indexRootUrl;
    const json = await loadJson5(indexRootUrl);

    try {
      this.indexRoot = parseIndexRoot(json);
      this.getOrLoadResultsData();
    } catch (parseError) {
      console.warn(parseError);
      throw new Error(
        t("indexedItemSearchProvider.errorParsingIndexRoot", { indexRootUrl })
      );
    }
  }

  /**
   * Fetch resultsData URL and return it.
   *
   * Caches the data so that subsequent calls do not result in a network request & parsing.
   *
   * @return A promise that resolves to resultsData
   */
  async getOrLoadResultsData() {
    if (this.resultsData) {
      return this.resultsData;
    }
    if (!this.indexRoot?.resultsDataUrl) {
      throw new Error(`indexRoot is not loaded`);
    }
    const resultsDataUrl = joinUrl(
      this.indexRootUrl,
      this.indexRoot.resultsDataUrl
    );
    const promise = loadCsv(resultsDataUrl, {
      // AC: Changed this to false so that pointnumbers don't get converted to numbers
      dynamicTyping: false,
      header: true
    });
    this.resultsData = promise;
    return promise;
  }

  @override
  override showWarning() {
    // if (!this.key || this.key === "") {
    //   console.warn(
    //     `The ${applyTranslationIfExists(this.name, i18next)}(${
    //       this.type
    //     }) geocoder will always return no results because a CesiumIon key has not been provided. Please get a CesiumIon key from ion.cesium.com, ensure it has geocoding permission and add it to searchProvider.key or parameters.cesiumIonAccessToken in config.json.`
    //   );
    // }
  }

  protected logEvent(searchText: string): void {
    this.terria.analytics?.logEvent(
      Category.search,
      SearchAction.cesium,
      searchText
    );
  }

  async searchLoadedIndexes(searchText: string): Promise<MiniSearchSearchResult[]> {
    const searchResults: MiniSearchSearchResult[] = [];

    const searchPromises = this.indexes.map(async (index) => {
      return await index.searchReturnResults(searchText, this.queryOptions);
    });

    const responses = await Promise.all(searchPromises);

    // Flatten the results from all indexes
    responses.forEach((response) => {
      searchResults.push(...response); // Combine results into a single array
    });

    return searchResults;
  }

  protected async doSearch(
    searchText: string,
    searchResults: SearchProviderResults
  ): Promise<void> {
    searchResults.results.length = 0;
    searchResults.message = undefined;

    await this.loadIndexes();
    let response: MiniSearchSearchResult[];
    try {
      response = await this.searchLoadedIndexes(searchText);
    } catch (e) {
      searchResults.message = {
        content: "translate#viewModels.searchErrorOccurred"
      };
      return;
    }

    runInAction(() => {
      if (response.length === 0) {
        searchResults.message = {
          content: "translate#viewModels.searchNoLocations"
        };
        return;
      }

      searchResults.results = response.map<SearchResult>((feature) => {
        const lat = feature.latitude;
        const lon = feature.longitude;

        const lookAt = {
          "lookAt": {
            "targetLatitude": lat,
            "targetLongitude": lon,
            "targetHeight": 0,
            "heading": 0,
            "pitch": 90,
            "range": 100
          }
        };

        const cameraView = CameraView.fromJson(lookAt);

        const r = new SearchResult({
          // TODO: change this to label function
          name: `${feature.code} (${feature.lotplan})`,
          clickAction: createZoomToFunction(this, cameraView),
          location: {
            latitude: lat,
            longitude: lon
          }
        });
        return r;
      });
    });
  }
}

function createZoomToFunction(
  model: IndexedLocationSearchProvider,
  cameraView: CameraView
) {
  return function () {
    const terria = model.terria;
    terria.currentViewer.zoomTo(cameraView, model.flightDurationSeconds);
  };
}