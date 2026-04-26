import DUNGEONS from "../data/dungeons.json";
import VersionConfig from "../versions/version-config";

class LogicLoader {
  static async loadLogicFiles(version, settingsString) {
    const normalizedVersion = VersionConfig.normalizeVersion(version);

    // Check for bundled logic files
    if (VersionConfig.isBundled(normalizedVersion, settingsString)) {
      return await VersionConfig.getBundledLogicFiles(normalizedVersion, settingsString);
    }

    // If none are found, try to fetch them from GitHub
    const { owner, tag } = VersionConfig.parseVersion(normalizedVersion);

    try {
      return await this._fetchLogicFiles(owner, tag);
    } catch (error) {
      // If unable to fetch logic files, fall back to bundled version
      return await VersionConfig.getFallbackLogicFiles();
    }
  }

  static async _fetchLogicFiles(owner, tag) {
    // Load all logic files in parallel
    const [logicHelpersFile, bossesFile, overworldFile, ...dungeonResults] = await Promise.all([
      this._loadLogicFile(this._logicHelpersFileUrl(owner, tag)),
      this._loadLogicFile(this._logicFileUrl(owner, tag, "Bosses.json")),
      this._loadLogicFile(this._logicFileUrl(owner, tag, "Overworld.json")),
      ...DUNGEONS.flatMap(dungeonName => [
        this._loadLogicFile(this._logicFileUrl(owner, tag, `${dungeonName}.json`)).then(data => ({
          type: "normal",
          name: dungeonName,
          data,
        })),
        this._loadLogicFile(this._logicFileUrl(owner, tag, `${dungeonName} MQ.json`)).then(data => ({
          type: "mq",
          name: `${dungeonName} MQ`,
          data,
        })),
      ]),
    ]);

    const dungeonFiles = {};
    const dungeonMQFiles = {};
    dungeonResults.forEach(result => {
      if (result.type === "normal") {
        dungeonFiles[result.name] = result.data;
      } else {
        dungeonMQFiles[result.name] = result.data;
      }
    });

    return {
      logicHelpersFile,
      dungeonFiles,
      dungeonMQFiles,
      bossesFile,
      overworldFile,
    };
  }

  static async _loadLogicFile(fileUrl) {
    const fileData = await this._loadFileFromUrl(fileUrl);
    return JSON.parse(this._validateLogicFile(fileData));
  }

  static async _loadFileFromUrl(url) {
    const response = await fetch(url);
    return await response.text();
  }

  static _validateLogicFile(fileData) {
    const matchHashComment = new RegExp(/ +#.*\n/, "g");
    const matchMultilineString = new RegExp(/ *\n +/, "g");

    const removedComments = fileData.replace(matchHashComment, "").trim();
    const removedMultilines = removedComments.replace(matchMultilineString, " ").trim();

    return removedMultilines;
  }

  static _logicHelpersFileUrl(owner, tag) {
    return `https://raw.githubusercontent.com/${owner}/OoT-Randomizer/${tag}/data/LogicHelpers.json`;
  }

  static _logicFileUrl(owner, tag, fileName) {
    return `https://raw.githubusercontent.com/${owner}/OoT-Randomizer/${tag}/data/World/${fileName}`;
  }
}

export default LogicLoader;
