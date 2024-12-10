import { runInAction } from "mobx";
import React from "react";
import AugmentedVirtuality from "../../../Models/AugmentedVirtuality";
import ViewerMode from "../../../Models/ViewerMode";
import ViewState from "../../../ReactViewModels/ViewState";
import { GLYPHS } from "../../../Styled/Icon";
import { GenericMapNavigationItemController } from "../../../ViewModels/MapNavigation/MapNavigationItemController";
import {
  FeedbackButtonController,
  FEEDBACK_TOOL_ID
} from "../../Feedback/FeedbackButtonController";
import PedestrianMode, {
  PEDESTRIAN_MODE_ID
} from "../../Tools/PedestrianMode/PedestrianMode";
import { ToolButtonController } from "../../Tools/Tool";
import {
  AR_TOOL_ID,
  AugmentedVirtualityController,
  AugmentedVirtualityHoverController,
  AugmentedVirtualityRealign,
  AugmentedVirtualityRealignController,
  CloseToolButton,
  Compass,
  COMPASS_TOOL_ID,
  MeasureTool,
  MyLocation,
  ToggleSplitterController,
  ZoomControl,
  ZOOM_CONTROL_ID
} from "./Items";

export const CLOSE_TOOL_ID = "close-tool";

export const registerMapNavigations = (viewState: ViewState) => {
  const terria = viewState.terria;
  const mapNavigationModel = terria.mapNavigationModel;

  const compassController = new GenericMapNavigationItemController({
    viewerMode: ViewerMode.Cesium,
    icon: GLYPHS.compassInnerArrows
  });
  compassController.pinned = true;
  mapNavigationModel.addItem({
    id: COMPASS_TOOL_ID,
    name: "translate#compass",
    controller: compassController,
    location: "TOP",
    order: 1,
    screenSize: "medium",
    render: <Compass terria={terria} viewState={viewState} />
  });

  const zoomToolController = new GenericMapNavigationItemController({
    viewerMode: undefined,
    icon: GLYPHS.zoomIn
  });
  zoomToolController.pinned = true;
  mapNavigationModel.addItem({
    id: ZOOM_CONTROL_ID,
    name: "translate#zoom",
    controller: zoomToolController,
    location: "TOP",
    order: 2,
    screenSize: "medium",
    render: <ZoomControl terria={terria} />
  });

  const myLocation = new MyLocation({ terria });
  mapNavigationModel.addItem({
    id: MyLocation.id,
    name: "translate#location.location",
    title: "translate#location.centreMap",
    location: "TOP",
    controller: myLocation,
    screenSize: undefined,
    order: 3
  });

  const measureTool = new MeasureTool({
    terria,
    onClose: () => {
      runInAction(() => {
        viewState.panel = undefined;
      });
    }
  });
  mapNavigationModel.addItem({
    id: MeasureTool.id,
    name: "translate#measure.measureToolTitle",
    title: "translate#measure.measureDistance",
    location: "TOP",
    controller: measureTool,
    screenSize: undefined,
    order: 6
  });

  const closeToolButtonController = new GenericMapNavigationItemController({
    handleClick: () => {
      viewState.closeTool();
    },
    icon: GLYPHS.closeLight
  });
  mapNavigationModel.addItem({
    id: CLOSE_TOOL_ID,
    name: "translate#close",
    location: "TOP",
    screenSize: undefined,
    controller: closeToolButtonController,
    render: <CloseToolButton />,
    order: 7
  });
  closeToolButtonController.setVisible(false);

  const feedbackController = new FeedbackButtonController(viewState);
  mapNavigationModel.addItem({
    id: FEEDBACK_TOOL_ID,
    name: "translate#feedback.feedbackBtnText",
    title: "translate#feedback.feedbackBtnText",
    location: "BOTTOM",
    screenSize: "medium",
    controller: feedbackController,
    order: 8
  });
};
