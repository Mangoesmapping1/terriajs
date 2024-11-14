import { TFunction } from "i18next";
import { computed, observable, runInAction, makeObservable } from "mobx";
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
import { DataThemeItem } from "../../../Models/DataThemes/DataThemesModel";

type PropTypes = WithTranslation & {
  terria: Terria;
  viewState: ViewState;
  refFromHOC?: React.Ref<HTMLDivElement>;
  theme: DefaultTheme;
  t: TFunction;
};

@observer
class ThemePanel extends React.Component<PropTypes> {
  /**
   * @param {Props} props
   */
  constructor(props: PropTypes) {
    super(props);
    makeObservable(this);
  }

  @observable _hoverDataTheme: DataThemeItem | undefined = undefined;

  selectTheme(theme: DataThemeItem, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    this.props.terria.activeDataTheme = theme;
    window.location.replace(theme.url);
  }

  mouseEnterDataTheme(theme: any) {
    runInAction(() => {
      this._hoverDataTheme = theme;
    });
  }

  mouseLeaveDataTheme() {
    runInAction(() => {
      this._hoverDataTheme = undefined;
    });
  }

  @computed
  get activeDataThemeLabel() {
    return this._hoverDataTheme
      ? this._hoverDataTheme.label
      : this.props.terria.activeDataTheme
      ? this.props.terria.activeDataTheme.label
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
            {this.props.terria.dataThemesModel.dataThemeItems.map((theme) => (
              <StyledBasemapButton
                key={theme.id}
                isActive={theme.id === this.props.terria.activeDataTheme?.id}
                onClick={(event) => this.selectTheme(theme, event)}
                onMouseEnter={this.mouseEnterDataTheme.bind(this, theme)}
                onMouseLeave={this.mouseLeaveDataTheme.bind(this)}
                onFocus={this.mouseEnterDataTheme.bind(this, theme)}
              >
                {theme.id === this.props.terria.activeDataTheme?.id ? (
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
