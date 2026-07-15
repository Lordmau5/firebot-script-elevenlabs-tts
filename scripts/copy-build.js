/**
 *  Copies the built plugin .js to Firebot's scripts folder
 */
const fs = require("fs").promises;
const path = require("path");

const extractPluginName = () => {
  const packageJson = require("../package.json");
  return `${packageJson.pluginOutputName}.js`;
};

const getFirebotScriptsFolderPath = () => {
  // determine os app data folder
  let appDataFolderPath;
  if (process.platform === "win32") {
    appDataFolderPath = process.env.APPDATA;
  } else if (process.platform === "darwin") {
    appDataFolderPath = path.join(
      process.env.HOME,
      "/Library/Application Support",
    );
  } else if (process.platform === "linux") {
    appDataFolderPath = path.join(process.env.HOME, "/.config");
  } else {
    throw new Error("Unsupported OS!");
  }

  const firebotDataFolderPath = path.join(appDataFolderPath, "/Firebot/v5/");
  const firebotGlobalSettings = require(
    path.join(firebotDataFolderPath, "global-settings.json"),
  );

  if (
    firebotGlobalSettings == null ||
    firebotGlobalSettings.profiles == null ||
    firebotGlobalSettings.profiles.loggedInProfile == null
  ) {
    throw new Error("Unable to determine active profile");
  }

  const activeProfile = firebotGlobalSettings.profiles.loggedInProfile;

  const scriptsFolderPath = path.join(
    firebotDataFolderPath,
    `/profiles/${activeProfile}/scripts/`,
  );
  return scriptsFolderPath;
};

/**
 * Asks Firebot to reload the plugin via local http api.
 */
const requestPluginReload = async (pluginName) => {
  const reloadUrl = "http://localhost:7472/api/v1/plugins/restart";

  try {
    const response = await fetch(reloadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: pluginName }),
    });

    if (!response.ok) {
      console.warn(
        `Firebot responded with status ${response.status} when reloading ${pluginName}. Skipping hot-reload.`,
      );
      return;
    }

    console.log(`Requested Firebot to reload ${pluginName}.`);
  } catch (error) {
    console.warn(
      `Could not reach Firebot to reload ${pluginName} (is it running?). Skipping hot-reload.`,
    );
  }
};

const main = async () => {
  const firebotScriptsFolderPath = getFirebotScriptsFolderPath();

  const pluginName = extractPluginName();

  const srcPluginFilePath = path.resolve(`./dist/${pluginName}`);
  const destPluginFilePath = path.join(
    firebotScriptsFolderPath,
    `${pluginName}`,
  );

  await fs.copyFile(srcPluginFilePath, destPluginFilePath);

  console.log(`Successfully copied ${pluginName} to Firebot scripts folder.`);

  await requestPluginReload(pluginName);
};

main();
