/**
 * Android billing entry point.
 *
 * Expo Go uses the safe no-op billing manager.
 * Development builds and Play Store builds use Google Play Billing.
 */

import Constants from "expo-constants";

import { BillingManager as StubBillingManager } from "./BillingManager";
import type { IBillingService } from "./types";

const isExpoGo = Constants.executionEnvironment === "storeClient";

let BillingManagerInstance: IBillingService = StubBillingManager;

if (!isExpoGo) {
  const { GooglePlayBillingProvider } = require(
    "./GooglePlayBillingProvider"
  ) as typeof import("./GooglePlayBillingProvider");

  BillingManagerInstance = new GooglePlayBillingProvider();
}

export const BillingManager = BillingManagerInstance;
