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
import {
  Index,
  IndexRoot,
  IndexType,
  parseIndexRoot
} from "../ItemSearchProviders/Index";
import TextIndex from "../ItemSearchProviders/TextIndex";
import loadCsv from "../../Core/loadCsv";
import joinUrl from "../ItemSearchProviders/joinUrl";
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

    this.initialize();
  }

  async loadIndexes() {
    const indices = this.terria.searchIndexes;
    this.indexes = await Promise.all(
      indices.map(async (i: TextIndex) => {
        await i.load("", "");
        return i;
      })
    );
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

  async searchLoadedIndexes(searchText: string): Promise<SearchResult[]> {
    const searchPromises = this.indexes.map(async (index) => {
      // Assuming index has a method that returns results and includes properties for name
      const results = await index.searchReturnResults(searchText);

      // Map results to SearchResult instances
      return results.map((feature) => {
        const lat = feature.latitude;
        const lon = feature.longitude;

        const lookAt = {
          lookAt: {
            targetLatitude: lat,
            targetLongitude: lon,
            targetHeight: 0,
            heading: 0,
            pitch: 90,
            range: 100
          }
        };

        const cameraView = CameraView.fromJson(lookAt);

        // Customize name based on index properties
        let name = "undefined";
        if (index.resultLabel) {
          const prefix = index.resultLabel.prefix as string;
          const suffix = index.resultLabel.suffix as string;
          name = `${feature[prefix]} (${feature[suffix]})`;
        }

        return new SearchResult({
          name: name,
          clickAction: createZoomToFunction(this, cameraView),
          location: {
            latitude: lat,
            longitude: lon
          }
        });
      });
    });

    // Flatten the results from all indexes
    const responses = await Promise.all(searchPromises);
    return responses.flat(); // Flatten the array of arrays
  }

  protected async doSearch(
    searchText: string,
    searchResults: SearchProviderResults
  ): Promise<void> {
    searchResults.results.length = 0;
    searchResults.message = undefined;

    await this.loadIndexes();

    let response: SearchResult[];
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

      searchResults.results = response;
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
