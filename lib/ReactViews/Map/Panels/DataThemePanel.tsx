import { TFunction } from "i18next";
import {
  computed,
  observable,
  runInAction,
  makeObservable
} from "mobx";
import { observer } from "mobx-react";
import React, { ComponentProps, MouseEvent } from "react";
import { withTranslation, WithTranslation } from "react-i18next";
import styled, { DefaultTheme, withTheme } from "styled-components";
import Terria from "../../../Models/Terria";
import ViewState from "../../../ReactViewModels/ViewState";
import Box from "../../../Styled/Box";
import Button, { RawButton } from "../../../Styled/Button";
import { GLYPHS, StyledIcon } from "../../../Styled/Icon";
import Text from "../../../Styled/Text";
import withTerriaRef from "../../HOCs/withTerriaRef";
import MenuPanel from "../../StandardUserInterface/customizable/MenuPanel";
import Styles from "./setting-panel.scss";


type PropTypes = WithTranslation & {
  terria: Terria;
  viewState: ViewState;
  refFromHOC?: React.Ref<HTMLDivElement>;
  theme: DefaultTheme;
  t: TFunction;
};

export const Themes = Object.seal({
  "water": {
    label: "themePanel.themeLabels.water",
    url: "/#water",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Concrete_water_pipe.jpg/640px-Concrete_water_pipe.jpg",
    available: true
  },
  "sewer": {
    label: "themePanel.themeLabels.sewer",
    url: "/#sewer",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Sewer_manhole_covers_in_Brisbane.jpg/567px-Sewer_manhole_covers_in_Brisbane.jpg?20170922110858",
    available: true
  },
  "property": {
    label: "themePanel.themeLabels.property",
    url: "/#property",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Cooktown.jpg/270px-Cooktown.jpg",
    available: true
  }
});

@observer
class ThemePanel extends React.Component<PropTypes> {
  /**
   * @param {Props} props
   */
  constructor(props: PropTypes) {
    super(props);
    makeObservable(this);
  }

  @observable _hoverDataTheme = null;

  selectTheme(themeKey: keyof typeof Themes, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    const theme = Themes[themeKey];
    this.props.terria.activeDataTheme = themeKey;
    window.location.replace(theme.url);
  }

  mouseEnterDataTheme(themeLabel: any) {
    runInAction(() => {
      this._hoverDataTheme = themeLabel;
    });
  }

  mouseLeaveDataTheme() {
    runInAction(() => {
      this._hoverDataTheme = null;
    });
  }

  @computed
  get activeDataThemeLabel() {
    const { t } = this.props;
    return this._hoverDataTheme
      ? t((Themes[this._hoverDataTheme as keyof typeof Themes] as any).label)
      : this.props.terria.activeDataTheme
      ? t((Themes[this.props.terria.activeDataTheme as keyof typeof Themes] as any).label)
      : "(None)";
  }

  render() {
    if (!this.props.terria.mainViewer) {
      return null;
    }
    const { t } = this.props;

    const dropdownTheme = {
      inner: Styles.dropdownInner,
      icon: "map"
    };

    return (
      //@ts-expect-error - not yet ready to tackle tsfying MenuPanel
      <MenuPanel
        theme={dropdownTheme}
        btnRef={this.props.refFromHOC}
        btnTitle={t("themePanel.btnTitle")}
        btnText={t("themePanel.btnText")}
        viewState={this.props.viewState}
        smallScreen={this.props.viewState.useSmallScreenInterface}
      >
        <Box padded column>
          <Box paddedVertically={1}>
            <Text as="label" large bold>
              {this.activeDataThemeLabel}
            </Text>
          </Box>
          <FlexGrid gap={1} elementsNo={3}>
            {Object.entries(Themes).map(([key, theme]) => (
              <StyledBasemapButton
                key={key}
                isActive={
                  key === this.props.terria.activeDataTheme
                }
                onClick={(event) => this.selectTheme(key as keyof typeof Themes, event)}
                onMouseEnter={this.mouseEnterDataTheme.bind(this, key)}
                onMouseLeave={this.mouseLeaveDataTheme.bind(this)}
                onFocus={this.mouseEnterDataTheme.bind(this, key)}
              >
                {key === this.props.terria.activeDataTheme ? (
                  <Box position="absolute" topRight>
                    <StyledIcon
                      light
                      glyph={GLYPHS.selected}
                      styledWidth={"22px"}
                    />
                  </Box>
                ) : null}
                <StyledImage
                  fullWidth
                  alt={theme.label ? theme.label : ""}
                  src={theme.image}
                />
              </StyledBasemapButton>
            ))}
          </FlexGrid>
        </Box>
      </MenuPanel>
    );
  }
}

export const THEME_PANEL_NAME = "MenuBarThemeButton";
export default withTranslation()(
  withTheme(withTerriaRef(ThemePanel, THEME_PANEL_NAME))
);

type IFlexGrid = {
  gap: number;
  elementsNo: number;
};

const FlexGrid = styled(Box).attrs({ flexWrap: true })<IFlexGrid>`
  gap: ${(props) => props.gap * 6}px;
  > * {
    flex: ${(props) => `1 0 ${getCalcWidth(props.elementsNo, props.gap)}`};
    max-width: ${(props) => getCalcWidth(props.elementsNo, props.gap)};
  }
`;
const getCalcWidth = (elementsNo: number, gap: number) =>
  `calc(${100 / elementsNo}% - ${gap * 5}px)`;

type IButtonProps = {
  isActive: boolean;
};

const SettingsButton = styled(Button)<IButtonProps>`
  background-color: ${(props) => props.theme.overlay};
  border: 1px solid
    ${(props) => (props.isActive ? "rgba(255, 255, 255, 0.5)" : "transparent")};
`;

const StyledBasemapButton = styled(RawButton)<IButtonProps>`
  border-radius: 4px;
  position: relative;
  border: 2px solid
    ${(props) =>
      props.isActive ? props.theme.turquoiseBlue : "rgba(255, 255, 255, 0.5)"};
`;

const StyledImage = styled(Box).attrs({
  as: "img"
})<ComponentProps<"img">>`
  border-radius: inherit;
`;
