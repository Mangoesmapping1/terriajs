import DOMPurify from "dompurify";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { StyleSheetManager, ThemeProvider } from "styled-components";
import { terriaTheme } from "../../../../StandardUserInterface";
import { useViewState } from "../../../../Context";
import { DistanceLegend } from "../../../BottomBar/DistanceLegend";
import {
  buildShareLink,
  buildShortShareLink,
  canShorten
} from "../BuildShareLink";
import PrintDatasets from "./PrintDatasets";
import PrintSource from "./PrintSource";
import PrintViewButtons from "./PrintViewButtons";
import PrintViewMap from "./PrintViewMap";
import PrintWorkbench from "./PrintWorkbench";

const PRINT_MAP_WIDTH_A4 = 1000; // Adjusted for better fit on A4
const PRINT_MAP_WIDTH_A3 = 1400; // Adjusted width for better fit on A3
const PRINT_MAP_WIDTH = PRINT_MAP_WIDTH_A4; // Use A4 width as default

const styles = `
    .tjs-_base__list-reset {
        list-style: none;
        padding-left: 0;
        margin: 0;
    }

    .mapContainer {
      position: relative;
      padding: 3px; /* Reduce padding around the map */
      height: calc(100vh - 150px); /* Reduce vertical space */
      border: 1px solid lightgray; /* Add border for frame */
      max-width: ${(props: { isA3: boolean, isLandscape: boolean }) => props.isA3 && props.isLandscape ? '1800px' : '100%'}; /* Adjust width for A3 landscape */
    }

    @media print {
      .PrintViewButtons__ButtonBar,
      .PrintView__printControls,
      .PrintViewButtons__ButtonBar-sc-9cld4h-0 {
        display: none !important;
      }
    }

    .titleBlock {
      display: flex;
      justify-content: flex-start; /* Align items to the left */
      align-items: center;
      padding: 0 10px; /* Remove top/bottom padding */
      overflow: hidden; /* Ensure content doesn't overflow */
      white-space: normal; /* Allow text wrapping */
      font-family: Arial, Helvetica, sans-serif; /* Set font family */
    }

    .titleBlock img {
      height: 40px; /* Reduced height for smaller logo */
      margin-right: 10px; /* Add margin to ensure space between logo and title */
    }

    .mapContainer {
      position: relative;
    }

    .map-image {
      width: 100%; /* Ensure map uses full width of the container */
      height: 100%; /* Fill the container height */
      object-fit: cover; /* Cover the container while maintaining aspect ratio */
      max-width: 100%; /* Ensure map uses full width of the container */
    }

    .mapSection {
      display: flex;
      border: 1px solid lightgray;
      margin: 10px 0;
    }

    .mapSection .datasets{
      width:200px
    }

    .layer-legends {
      font-size: 0.6em; /* Adjust font size for legend text */
    }

    .layer-title {
      font-size: 0.6em; /* Adjust font size for legend titles */
    }

    .tjs-legend__legendTitles {
      font-size: 0.5em;
    }

    h1, h2, h3 {
      clear: both;
    }

    p {
      font-size: 0.6em;
    }

    .WorkbenchItem {
      padding-bottom: 10px;
      margin: 0 5px;
      border-bottom: 1px solid lightgray;
      font-family: Arial, Helvetica, sans-serif; /* Set font family for datasets */
      font-size: 0.6em !important; /* Adjust font size to be smaller */
    }

    .WorkbenchItem:last-of-type {
      border: 0;
      padding-bottom: 0;
    }

    .PrintView__source {
      padding-left: 5px;
    }

    .tjs-_form__input {
      width: 80%;
    }

    .tjs-legend__distanceLegend {
      display: inline-block;
      text-align: center;
      position: absolute;
      bottom: 5px;
      right: 10px;
      background: white;
      padding: 5px;
    }

    .tjs-legend__distanceLegend > label {
      color: black;
    }

    .tjs-legend__distanceLegend:hover {
      background: #fff;
    }

    .tjs-legend__bar {
      border-bottom: 3px solid black;
      border-right: 3px solid black;
      border-left: 3px solid black;
      margin: 0 auto;
    }

    body {
      display: flex;
      justify-content: center;
      width: 100%;
      margin: 0; /* Remove default margins */
      font-family: Arial, Helvetica, sans-serif; /* Set global font family */
    }

    @media print {
      body {
        display: block;
        margin: 0; /* Ensure no margins during print */
        size: ${(props: { isA3: boolean, isLandscape: boolean }) => props.isA3 ? 'A3 landscape' : (props.isLandscape ? 'A4 landscape' : 'A4 portrait')}; /* Set page size based on isA3 and isLandscape props */
      }
      .PrintView__printControls {
        display: none;
      }
    }

    main {
      width: 100%; /* Use full width of the page */
      max-width: ${(props: { isA3: boolean, isLandscape: boolean }) => props.isA3 && props.isLandscape ? '1800px' : (props.isA3 ? PRINT_MAP_WIDTH_A3 : PRINT_MAP_WIDTH_A4)}px; /* Adjust width based on isA3 and isLandscape props */
      margin: 0 auto; /* Center content */
      padding: 0; /* Remove padding to eliminate left margin */
    }
`;

const mkStyle = (unsafeCSS: string) => {
  const style = document.createElement("style");
  style.innerHTML = DOMPurify.sanitize(unsafeCSS, {});
  return style;
};

export const downloadImg = (
  dataString: string,
  fileName: string = "map.png"
): void => {
  const a = document.createElement("a");
  a.href = dataString;
  a.download = fileName;
  a.click();
};

interface Props {
  window: Window;
  closeCallback: () => void;
  isA3: boolean; // Prop to determine if the print is A3
  isLandscape: boolean; // New prop to determine if the print is landscape
}

const getScale = (maybeElement: Element | undefined) =>
  maybeElement
    ? PRINT_MAP_WIDTH_A4 / (maybeElement as HTMLElement).offsetWidth
    : 1;

const PrintView = (props: Props) => {
  const viewState = useViewState();
  const rootNode = useRef(document.createElement("main"));

  const [screenshot, setScreenshot] = useState<Promise<string> | null>(null);
  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    props.window.document.title = "Print view";
    props.window.document.head.appendChild(mkStyle(styles));
    props.window.document.body.appendChild(rootNode.current);
    props.window.addEventListener("beforeunload", props.closeCallback);
  }, [props.window]);

  useEffect(() => {
    setScreenshot(viewState.terria.currentViewer.captureScreenshot());
  }, [props.window]);

  useEffect(() => {
    canShorten(viewState.terria)
      ? buildShortShareLink(viewState.terria, viewState, {
          includeStories: false
        })
          .then((url) => {
            setShareLink(url);
          })
          .catch(() =>
            buildShareLink(viewState.terria, viewState, {
              includeStories: false
            })
          )
      : setShareLink(
          buildShareLink(viewState.terria, viewState, {
            includeStories: false
          })
        );
  }, [viewState.terria, viewState]);

  return ReactDOM.createPortal(
    <StyleSheetManager target={props.window.document.head}>
      <ThemeProvider theme={terriaTheme}>
        <div className="titleBlock">
          <img src="https://www.cook.qld.gov.au/wp-content/uploads/2023/06/logo-header.svg" alt="Logo" />
          <h1 style={{ fontSize: "1.5em" }}>GIS Data</h1>
        </div>
        <PrintViewButtons
          window={props.window}
          screenshot={screenshot}
        />
        <section className="mapSection">
          <div className="datasets">
            <PrintWorkbench workbench={viewState.terria.workbench} />
          </div>
          <div className="map">
            {screenshot ? (
              <PrintViewMap screenshot={screenshot}>
                <DistanceLegend
                  scale={getScale(
                    viewState.terria.currentViewer.getContainer()
                  )}
                  isPrintMode
                />
              </PrintViewMap>
            ) : (
              <div>Loading...</div>
            )}
          </div>
        </section>
        <section className="PrintView__source">
          {shareLink && <PrintSource link={shareLink} />}
        </section>
      </ThemeProvider>
    </StyleSheetManager>,
    rootNode.current
  );
};

export default PrintView;
