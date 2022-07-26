import _ from "lodash";

import DUNGEONS from "../data/dungeons.json";

class LogicLoader {
  static async loadLogicFiles() {
    const logicHelpersFile = await this._loadLogicFile(this._logicHelpersFileUrl());

    const dungeonFiles = new Map();
    for await (let dungeonName of DUNGEONS) {
      if (dungeonName === "Inside Ganons Castle") {
        dungeonName = "Ganons Castle";
      }
      _.set(dungeonFiles, dungeonName, await this._loadLogicFile(this._logicFileUrl(`${dungeonName}.json`)));
    }
    _.set(dungeonFiles, "Bosses", await this._loadLogicFile(this._logicFileUrl("Bosses.json")));

    const overworldFile = await this._loadLogicFile(this._logicFileUrl("Overworld.json"));

    return {
      logicHelpersFile,
      dungeonFiles,
      overworldFile,
    };
  }

  static async _loadLogicFile(fileUrl) {
    const fileData = await this._loadFileFromUrl(fileUrl);
    const validatedFile = this._validateLogicFile(fileData);
    const parsedFile = JSON.parse(validatedFile);
    return parsedFile;
  }

  static async _loadFileFromUrl(url) {
    const response = await fetch(url);
    const fileData = await response.text();
    return fileData;
  }

  static _validateLogicFile(fileData) {
    const matchHashComment = new RegExp(/ +#.*\n/, "g");
    const matchMultilineString = new RegExp(/ *\n +/, "g");

    const removedComments = fileData.replace(matchHashComment, "").trim();
    const removedMultilines = removedComments.replace(matchMultilineString, " ").trim();

    return removedMultilines;
  }

  static _logicHelpersFileUrl() {
    return "https://raw.githubusercontent.com/TestRunnerSRL/OoT-Randomizer/Dev/data/LogicHelpers.json";
  }

  static _logicFileUrl(fileName) {
    return `https://raw.githubusercontent.com/TestRunnerSRL/OoT-Randomizer/Dev/data/World/${fileName}`;
  }
}

export default LogicLoader;
