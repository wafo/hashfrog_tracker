import _ from "lodash";

import DUNGEONS from "../data/dungeons.json";

const LOGIC_BRANCH = process.env.REACT_APP_LOGIC_BRANCH;

class LogicLoader {
  static async loadLogicFiles() {
    // Load the LogicHelpers.json file, which defines macros and item aliases for convenience
    const logicHelpersFile = await this._loadLogicFile(this._logicHelpersFileUrl());

    // Load in the logic files for each dungeon
    const dungeonFiles = new Map();
    const dungeonMQFiles = new Map();
    for await (let dungeonName of DUNGEONS) {
      _.set(dungeonFiles, dungeonName, await this._loadLogicFile(this._logicFileUrl(`${dungeonName}.json`)));

      // Include the logic files for the Master Quest dungeons as well
      dungeonName = dungeonName + " MQ";
      _.set(dungeonMQFiles, dungeonName, await this._loadLogicFile(this._logicFileUrl(`${dungeonName}.json`)));
    }

    // Load in the logic file for boss rooms
    const bossesFile = await this._loadLogicFile(this._logicFileUrl("Bosses.json"));

    // Load in the logic file for overworld locations
    const overworldFile = await this._loadLogicFile(this._logicFileUrl("Overworld.json"));

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

  static _logicHelpersFileUrl() {
    return `https://raw.githubusercontent.com/OoTRandomizer/OoT-Randomizer/${LOGIC_BRANCH}/data/LogicHelpers.json`;
  }

  static _logicFileUrl(fileName) {
    return `https://raw.githubusercontent.com/OoTRandomizer/OoT-Randomizer/${LOGIC_BRANCH}/data/World/${fileName}`;
  }
}

export default LogicLoader;
