import { action, computed, makeObservable } from "mobx";
import DeveloperError from "terriajs-cesium/Source/Core/DeveloperError";
import isDefined from "../../Core/isDefined";
import { isJsonObject, JsonObject } from "../../Core/Json";
import Result from "../../Core/Result";
import TerriaError from "../../Core/TerriaError";
import CommonStrata from "../Definition/CommonStrata";
import CreateModel from "../Definition/CreateModel";
import ModelPropertiesFromTraits from "../Definition/ModelPropertiesFromTraits";
import updateModelFromJson from "../Definition/updateModelFromJson";
import { ModelConstructorParameters } from "../Definition/Model";
import {
  DataThemeTraits,
  DataThemesTraits
} from "../../Traits/TraitsClasses/DataThemeTraits";

export class DataThemeModel extends CreateModel(DataThemeTraits) {}

export type DataThemeJson = Partial<
  Omit<ModelPropertiesFromTraits<DataThemeTraits>, "item"> & {
    item: JsonObject | string;
  }
>;
export type DataThemesJson = Partial<
  Omit<ModelPropertiesFromTraits<DataThemesTraits>, "items"> & {
    items: DataThemeJson[];
  }
>;

export interface DataThemeItem {
  id: string;
  label?: string;
  url: string;
  image?: string;
}

export class DataThemesModel extends CreateModel(DataThemesTraits) {
  constructor(...args: ModelConstructorParameters) {
    super(...args);
    makeObservable(this);
  }

  /**
   * List of the data themes to show in data theme panel
   */
  @computed
  get dataThemeItems(): DataThemeItem[] {
    const enabledDataThemes: DataThemeItem[] = [];

    this.items.forEach((dataThemeItem) => {
      if (
        dataThemeItem.id &&
        (!this.enabledDataThemes ||
          this.enabledDataThemes.includes(dataThemeItem.id))
      ) {
        enabledDataThemes.push({
          id: dataThemeItem.id,
          label: dataThemeItem.label,
          url: dataThemeItem.url,
          image: dataThemeItem.image
        });
      }
    });

    return enabledDataThemes;
  }

  // Can't do this in constructor since {@link CatalogMemberFactory} doesn't
  // have any values at the moment of initializing Terria class.
  initializeDataThemes(dataThemes: any): Result {
    return this.loadFromJson(CommonStrata.definition, dataThemes);
  }

  @action
  private add(stratumId: string, dataTheme: DataThemeModel) {
    if (dataTheme.id === undefined) {
      throw new DeveloperError(
        "A model without a `uniqueId` cannot be added to a group."
      );
    }

    const items = this.getTrait(stratumId, "items");
    if (isDefined(items)) {
      items.push(dataTheme);
    } else {
      this.setTrait(stratumId, "items", [dataTheme]);
    }
  }

  @action
  loadFromJson(stratumId: CommonStrata, newDataThemes: DataThemesJson): Result {
    const errors: TerriaError[] = [];
    const { items, ...rest } = newDataThemes;
    if (items !== undefined) {
      const { items: itemsTrait } = this.traits;
      const newItemsIds = itemsTrait.fromJson(this, stratumId, items);
      newItemsIds.pushErrorTo(errors)?.forEach((member: DataThemeModel) => {
        const existingItem = this.items.find(
          (dataTheme) => dataTheme.id === member.id
        );

        if (existingItem) {
          // object array trait doesn't automatically update model item
          existingItem.setTrait(stratumId, "image", member.image);
          existingItem.setTrait(stratumId, "label", member.label);
        } else {
          this.add(stratumId, member);
        }
      });
    }

    if (isJsonObject(rest))
      updateModelFromJson(this, stratumId, rest).pushErrorTo(errors);
    else errors.push(TerriaError.from("Invalid JSON object"));

    const defaultDataTheme = this.items.find(
      (dataTheme) => dataTheme.id === this.defaultDataThemeId
    );
    if (defaultDataTheme) {
      this.terria.activeDataTheme = {
        id: defaultDataTheme.id,
        label: defaultDataTheme.label,
        url: defaultDataTheme.url,
        image: defaultDataTheme.image
      };
    }

    return new Result(
      undefined,
      TerriaError.combine(
        errors,
        `Failed to add members from JSON for model \`${this.uniqueId}\``
      )
    );
  }
}
