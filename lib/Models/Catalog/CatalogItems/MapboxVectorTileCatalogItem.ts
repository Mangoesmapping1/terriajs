import bbox from "@turf/bbox";
import i18next from "i18next";
import { computed, runInAction, makeObservable, override, action } from "mobx";
import {
  GeomType,
  LabelRule,
  LineSymbolizer,
  PolygonSymbolizer,
  PaintRule
} from "protomaps-leaflet";
import { JsonObject } from "../../../Core/Json";
import loadJson from "../../../Core/loadJson";
import TerriaError from "../../../Core/TerriaError";
import ProtomapsImageryProvider, {
  GeojsonSource
} from "../../../Map/ImageryProvider/ProtomapsImageryProvider";
import CatalogMemberMixin from "../../../ModelMixins/CatalogMemberMixin";
import MappableMixin, { MapItem } from "../../../ModelMixins/MappableMixin";
import UrlMixin from "../../../ModelMixins/UrlMixin";
import LegendTraits, {
  LegendItemTraits
} from "../../../Traits/TraitsClasses/LegendTraits";
import MapboxVectorTileCatalogItemTraits from "../../../Traits/TraitsClasses/MapboxVectorTileCatalogItemTraits";
import SearchableItemMixin, {
  ItemSelectionDisposer
} from "../../../ModelMixins/SearchableItemMixin";
import { RectangleTraits } from "../../../Traits/TraitsClasses/MappableTraits";
import CreateModel from "../../Definition/CreateModel";
import createStratumInstance from "../../Definition/createStratumInstance";
import LoadableStratum from "../../Definition/LoadableStratum";
import { BaseModel } from "../../Definition/Model";
import StratumOrder from "../../Definition/StratumOrder";
import { ModelConstructorParameters } from "../../Definition/Model";
import proxyCatalogItemUrl from "../proxyCatalogItemUrl";
import { ItemSearchResult } from "../../ItemSearchProviders/ItemSearchProvider";
import { default as TerriaFeature } from "../../../Models/Feature/Feature";
import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import Cartographic from "terriajs-cesium/Source/Core/Cartographic";
import sampleTerrainMostDetailed from "terriajs-cesium/Source/Core/sampleTerrainMostDetailed";
import isDefined from "../../../Core/isDefined";

class MapboxVectorTileLoadableStratum extends LoadableStratum(
  MapboxVectorTileCatalogItemTraits
) {
  static stratumName = "MapboxVectorTileLoadable";

  constructor(
    readonly item: MapboxVectorTileCatalogItem,
    readonly styleJson: JsonObject | undefined
  ) {
    super();
    makeObservable(this);
  }

  duplicateLoadableStratum(newModel: BaseModel): this {
    return new MapboxVectorTileLoadableStratum(
      newModel as MapboxVectorTileCatalogItem,
      this.styleJson
    ) as this;
  }

  static async load(item: MapboxVectorTileCatalogItem) {
    let styleJson: JsonObject | undefined;
    if (item.styleUrl) {
      try {
        styleJson = await loadJson(proxyCatalogItemUrl(item, item.styleUrl));
      } catch (e) {
        throw TerriaError.from(
          e,
          `Failed to load style JSON from url ${item.styleUrl}`
        );
      }
    }
    return new MapboxVectorTileLoadableStratum(item, styleJson);
  }

  get style() {
    return this.styleJson;
  }

  get opacity() {
    return 1;
  }

  @computed get legends() {
    if (!this.item.fillColor && !this.item.lineColor) return [];
    return [
      createStratumInstance(LegendTraits, {
        items: [
          createStratumInstance(LegendItemTraits, {
            color: this.item.fillColor,
            outlineColor: this.item.lineColor,
            outlineWidth: this.item.lineColor ? 1 : undefined,
            title: this.item.name
          })
        ]
      })
    ];
  }

  @computed
  get rectangle() {
    if (
      this.item.imageryProvider?.source instanceof GeojsonSource &&
      this.item.imageryProvider.source.geojsonObject
    ) {
      const geojsonBbox = bbox(this.item.imageryProvider.source.geojsonObject);
      return createStratumInstance(RectangleTraits, {
        west: geojsonBbox[0],
        south: geojsonBbox[1],
        east: geojsonBbox[2],
        north: geojsonBbox[3]
      });
    }
  }
}

StratumOrder.addLoadStratum(MapboxVectorTileLoadableStratum.stratumName);

class MapboxVectorTileCatalogItem extends SearchableItemMixin(
  MappableMixin(
    UrlMixin(CatalogMemberMixin(CreateModel(MapboxVectorTileCatalogItemTraits)))
  )
) {
  static readonly type = "mvt";

  constructor(...args: ModelConstructorParameters) {
    super(...args);
    makeObservable(this);
  }

  get type() {
    return MapboxVectorTileCatalogItem.type;
  }

  get typeName() {
    return i18next.t("models.mapboxVectorTile.name");
  }

  @override
  get forceProxy() {
    return true;
  }

  async forceLoadMetadata() {
    const stratum = await MapboxVectorTileLoadableStratum.load(this);
    runInAction(() => {
      this.strata.set(MapboxVectorTileLoadableStratum.stratumName, stratum);
    });
  }

  @computed
  get parsedJsonStyle() {
    if (this.style) {
      console.log(this.style);
      return { paint_rules: [], label_rules: [], layers: this.style.layers };
    }
  }

  @computed
  get layers(): any {
    if (this.parsedJsonStyle?.layers) {
      return this.parsedJsonStyle.layers;
    }

    return [];
  }

  @computed
  /** Convert traits into paint rules:
   * - `layer` and `fillColor`/`lineColor` into simple rules
   * - `parsedJsonStyle`
   */
  get paintRules(): PaintRule[] {
    const rules: PaintRule[] = [];

    if (this.layer) {
      if (this.fillColor) {
        rules.push({
          dataLayer: this.layer,
          symbolizer: new PolygonSymbolizer({ fill: this.fillColor }),
          minzoom: this.minimumZoom,
          maxzoom: this.maximumZoom,
          // Only apply polygon/fill symbolizer to polygon features (otherwise it will also apply to line features)
          filter: (z, f) => f.geomType === GeomType.Polygon
        });
      }
      if (this.lineColor) {
        rules.push({
          dataLayer: this.layer,
          symbolizer: new LineSymbolizer({ color: this.lineColor }),
          minzoom: this.minimumZoom,
          maxzoom: this.maximumZoom
        });
      }
    }

    if (this.parsedJsonStyle) {
      rules.push(
        ...(this.parsedJsonStyle.paint_rules as unknown as PaintRule[])
      );
    }

    return rules;
  }

  @computed
  get labelRules(): LabelRule[] {
    if (this.parsedJsonStyle) {
      return this.parsedJsonStyle.label_rules as unknown as LabelRule[];
    }
    return [];
  }

  @computed
  get imageryProvider(): ProtomapsImageryProvider | undefined {
    if (this.url === undefined) {
      return;
    }

    return new ProtomapsImageryProvider({
      terria: this.terria,
      id: this.uniqueId,
      data: this.url,
      minimumZoom: this.minimumZoom,
      maximumNativeZoom: this.maximumNativeZoom,
      maximumZoom: this.maximumZoom,
      credit: this.attribution,
      paintRules: this.paintRules,
      labelRules: this.labelRules,
      layers: this.layers,
      idProperty: this.idProperty
    });
  }

  protected forceLoadMapItems(): Promise<void> {
    return Promise.resolve();
  }

  @computed
  get mapItems(): MapItem[] {
    if (this.isLoadingMapItems || this.imageryProvider === undefined) {
      return [];
    }

    return [
      {
        imageryProvider: this.imageryProvider,
        show: this.show,
        alpha: this.opacity,
        clippingRectangle: this.clipToRectangle
          ? this.cesiumRectangle
          : undefined
      }
    ];
  }

  @action
  highlightFeaturesFromItemSearchResults(
    results: ItemSearchResult[]
  ): ItemSelectionDisposer {
    const highlightedFeatures: Set<TerriaFeature> = new Set();

    results.forEach((i) => {
      const positionFromLatLng = Cartesian3.fromDegrees(
        i.featureCoordinate.longitudeDegrees,
        i.featureCoordinate.latitudeDegrees,
        i.featureCoordinate.featureHeight
      );

      const props = i.properties;
      if (this.layer) {
        props.__LAYERNAME = this.layer;
      }

      props.highlighted = "true";

      const feature = new TerriaFeature({
        id: i.id.toString(),
        position: positionFromLatLng,
        properties: props
      });
      const highlightImageryProvider =
        this.imageryProvider?.createHighlightImageryProvider(feature);

      if (highlightImageryProvider && this.imageryProvider?.rectangle) {
        this.terria.currentViewer._addVectorTileHighlight(
          highlightImageryProvider,
          this.imageryProvider.rectangle
        );

        highlightedFeatures.add(feature);
      }
    });

    // Need to add a disposer to reset the style
    const highlightDisposer = action(() => {
      highlightedFeatures.forEach((feature) => {
        if (isDefined(feature.properties)) {
          feature.properties.highlighted = "false";
        }
        const highlightImageryProvider =
          this.imageryProvider?.createHighlightImageryProvider(feature);
        if (highlightImageryProvider && this.imageryProvider?.rectangle) {
          this.terria.currentViewer._addVectorTileHighlight(
            highlightImageryProvider,
            this.imageryProvider.rectangle
          );
        }
      });
    });

    return highlightDisposer;
  }

  @action
  hideFeaturesNotInItemSearchResults(
    results: ItemSearchResult[]
  ): ItemSelectionDisposer {
    const highlightDisposer = action(() => {});

    return highlightDisposer;
  }

  zoomToItemSearchResult = action(async (result: ItemSearchResult) => {
    if (this.terria.cesium === undefined) return;

    const scene = this.terria.cesium.scene;
    const camera = scene.camera;
    const { latitudeDegrees, longitudeDegrees } = result.featureCoordinate;

    const cartographic = Cartographic.fromDegrees(
      longitudeDegrees,
      latitudeDegrees
    );
    const [terrainCartographic] = await sampleTerrainMostDetailed(
      scene.terrainProvider,
      [cartographic]
    ).catch(() => [cartographic]);

    // for small features we show a top-down view so that it is visible even
    // if surrounded by larger features
    const minViewDistance = 50;
    // height = terrainHeight + featureHeight + minViewDistance
    terrainCartographic.height += minViewDistance;
    const destination = Cartographic.toCartesian(cartographic);
    // use default orientation which is a top-down view of the feature
    camera.flyTo({ destination, orientation: undefined });
  });
}

export default MapboxVectorTileCatalogItem;
