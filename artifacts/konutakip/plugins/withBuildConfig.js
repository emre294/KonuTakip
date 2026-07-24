const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Keep BuildConfig generation enabled for the generated Android app module.
 *
 * Expo regenerates the android directory during prebuild, so this must live
 * in app configuration rather than only in android/app/build.gradle.
 */
module.exports = function withBuildConfig(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== "groovy") {
      throw new Error(
        "KonuTakip requires the Android app Gradle file to use Groovy syntax.",
      );
    }

    const contents = modConfig.modResults.contents;
    if (/buildFeatures\s*\{[\s\S]*?\bbuildConfig\s+true\b[\s\S]*?\}/.test(contents)) {
      return modConfig;
    }

    const marker = "    namespace 'com.konutakip.app'\n";
    if (!contents.includes(marker)) {
      throw new Error(
        "Could not find the expected Android namespace while enabling BuildConfig.",
      );
    }

    modConfig.modResults.contents = contents.replace(
      marker,
      `${marker}    buildFeatures {\n        buildConfig true\n    }\n`,
    );
    return modConfig;
  });
};