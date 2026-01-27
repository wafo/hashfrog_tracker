import DUNGEONS from "../data/dungeons.json";

const LOGIC_BRANCH = process.env.REACT_APP_LOGIC_BRANCH;

class LogicLoader {
  static async loadLogicFiles() {
    // Load all logic files in parallel
    const [logicHelpersFile, bossesFile, overworldFile, ...dungeonResults] = await Promise.all([
      this._loadLogicFile(this._logicHelpersFileUrl()),
      this._loadLogicFile(this._logicFileUrl("Bosses.json")),
      this._loadLogicFile(this._logicFileUrl("Overworld.json")),
      ...DUNGEONS.flatMap(dungeonName => [
        this._loadLogicFile(this._logicFileUrl(`${dungeonName}.json`)).then(data => ({ type: "normal", name: dungeonName, data })),
        this._loadLogicFile(this._logicFileUrl(`${dungeonName} MQ.json`)).then(data => ({ type: "mq", name: `${dungeonName} MQ`, data })),
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

  static _logicHelpersFileUrl() {
    return `https://raw.githubusercontent.com/OoTRandomizer/OoT-Randomizer/${LOGIC_BRANCH}/data/LogicHelpers.json`;
  }

  static _logicFileUrl(fileName) {
    return `https://raw.githubusercontent.com/OoTRandomizer/OoT-Randomizer/${LOGIC_BRANCH}/data/World/${fileName}`;
  }
}

export default LogicLoader;
