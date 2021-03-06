// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ApplicationInsights, IConfig, IConfiguration, IPageViewTelemetry, ITelemetryItem } from "@microsoft/applicationinsights-web";
import { Action, History, Location } from "history";
import { IReactAISettings } from ".";

/**
 * Module to include Microsoft Application Insights in React applications.
 *
 * @export
 * @class ReactAI
 */
export default class ReactAI {
  /**
   * Returns the underlying root instance of Application Insights.
   *
   * @readonly
   * @static
   * @type {ApplicationInsights}
   * @memberof ReactAI
   */
  public static get rootInstance(): ApplicationInsights {
    return this.ai;
  }

  /**
   * Returns the current value of context/custom dimensions.
   *
   * @readonly
   * @static
   * @type {{ [key: string]: any }}
   * @memberof ReactAI
   */
  public static get context(): { [key: string]: any } {
    return this.contextProps || {};
  }

  /**
   * Returns if ReactAI is in debug mode.
   *
   * @readonly
   * @static
   * @type {boolean}
   * @memberof ReactAI
   */
  public static get isDebugMode(): boolean {
    return this.debug ? true : false;
  }
  /**
   * Initializes a singleton instance of ReactAI based on supplied parameters.
   *
   * @static
   * @param {IReactAISettings} settings
   * @memberof ReactAI
   */
  public static initialize(settings: IReactAISettings & IConfiguration & IConfig): void {
    this.debug = settings.debug;
    if (!this.ai) {
      this.ai = new ApplicationInsights({ config: settings, queue: [] });
      this.ai.loadAppInsights();
      this.debugLog("Application Insights initialized with:", settings);
    }
    this.setContext(settings.initialContext || {}, true);
    this.ai.addTelemetryInitializer(this.customDimensionsInitializer());
    if (settings.history) {
      this.addHistoryListener(settings.history);
    }
  }

  /**
   * Set custom context/custom dimensions for Application Insights
   *
   * @static
   * @param {{ [key: string]: any }} properties - custom properties to add to all outbound Application Insights telemetry
   * @param {boolean} [clearPrevious=false] - if false(default) multiple calls to setContext will append to/overwrite existing custom dimensions, if true the values are reset
   * @memberof ReactAI
   */
  public static setContext(properties: { [key: string]: any }, clearPrevious: boolean = false): void {
    if (clearPrevious) {
      this.contextProps = {};
      this.debugLog("context is reset.");
    }
    properties = properties || {};
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        this.contextProps[key] = properties[key];
      }
    }
    this.debugLog("context is set to:", this.context);
  }

  private static instance: ReactAI = new ReactAI();
  private static ai: ApplicationInsights;
  private static contextProps: { [key: string]: any } = {};
  private static debug?: boolean;

  private static customDimensionsInitializer(): (item: ITelemetryItem) => boolean | void {
    return (envelope: ITelemetryItem) => {
      envelope.data = envelope.data || {};
      const props = this.context;
      for (const key in props) {
        if (props.hasOwnProperty(key)) {
          envelope.data[key] = props[key];
        }
      }
    };
  }

  private static addHistoryListener(history: History): void {
    history.listen(
      (location: Location, action: Action): void => {
        // Timeout to ensure any changes to the DOM made by route changes get included in pageView telemetry
        setTimeout(() => {
          const pageViewTelemetry: IPageViewTelemetry = { uri: location.pathname, properties: this.context };
          this.ai.trackPageView(pageViewTelemetry);
          this.debugLog("recording page view.", `uri: ${location.pathname} action: ${action}`);
        }, 500);
      }
    );
  }

  private static debugLog(message: string, payload?: any): void {
    if (ReactAI.isDebugMode) {
      console.log(`ReactAI: ${message}`, payload === undefined ? "" : payload);
    }
  }

  private constructor() {
    if (ReactAI.instance) {
      throw new Error("ReactAI: use ReactAI.Instance() instead.");
    }
    ReactAI.instance = this;
  }
}
