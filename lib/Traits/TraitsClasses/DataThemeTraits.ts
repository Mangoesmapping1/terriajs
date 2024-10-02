import CatalogMemberFactory from "../../Models/Catalog/CatalogMemberFactory";
import modelReferenceTrait from "../Decorators/modelReferenceTrait";
import objectArrayTrait from "../Decorators/objectArrayTrait";
import primitiveArrayTrait from "../Decorators/primitiveArrayTrait";
import primitiveTrait from "../Decorators/primitiveTrait";
import ModelTraits from "../ModelTraits";

export class DataThemeTraits extends ModelTraits {

  @primitiveTrait({
    type: "string",
    name: "id",
    description: "Unique identifier for the data theme"
  })
  id: string = "";

  @primitiveTrait({
    type: "string",
    name: "Image",
    description: "Path to the data theme image"
  })
  image?: string;

  @primitiveTrait({
    type: "string",
    name: "Label",
    description:
      "Pointer to translation object for the label of the data theme"
  })
  label?: string;

  @primitiveTrait({
    type: "string",
    name: "URL",
    description:
      "URL to the data theme catalog (eg. /#water)"
  })
  url: string = "";
}

export class DataThemesTraits extends ModelTraits {
  @primitiveTrait({
    type: "string",
    name: "defaultDataThemeId",
    description:
      "The url of the dataTheme user will see on the first mapLoad. This wil be used **before** `defaultDataThemeName`"
  })
  defaultDataThemeId?: string = "";

  @primitiveTrait({
    type: "string",
    name: "defaultDataThemeName",
    description: "Name of the data theme to use as default"
  })
  defaultDataThemeName?: string = "";

  @primitiveTrait({
    type: "string",
    name: "previewDataThemeId",
    description:
      "The id of the dataTheme to be used as the base map in data preview. "
  })
  previewDataThemeId?: string = "water";

  @objectArrayTrait<DataThemeTraits>({
    type: DataThemeTraits,
    idProperty: "url",
    name: "items",
    description:
      "Array of data theme definitions that can be used as a Data theme."
  })
  items?: DataThemeTraits[] = [];

  @primitiveArrayTrait({
    type: "string",
    name: "enabledDataThemes",
    description:
      "Array of data theme ids that is available to user. Use this to define order of the data themes in data themes panel. Leave undefined to show all basemaps."
  })
  enabledDataThemes?: string[];
}
