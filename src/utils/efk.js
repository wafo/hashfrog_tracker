import _ from "lodash";

import DUNGEONS from "../data/dungeons.json";
import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import SETTING_STRINGS_JSON from "../data/setting-strings.json";

const EFK_SETTINGS_STRING = SETTING_STRINGS_JSON.presets.find(p => p.value === "escape_from_kak")?.settingsString;

const EFK_LABEL_NAME = "efk_dungeon";

// Maps full dungeon hint-region names to the lobby region name used in the devTFBlitz_ Overworld graph.
// These are the unconditional (True) exits added from Kakariko Village in the EFK version.
const EFK_DUNGEON_LOBBY_REGIONS = {
  "Deku Tree": "Deku Tree Lobby",
  "Dodongos Cavern": "Dodongos Cavern Beginning",
  "Jabu Jabus Belly": "Jabu Jabus Belly Beginning",
  "Forest Temple": "Forest Temple Lobby",
  "Fire Temple": "Fire Temple Lower",
  "Water Temple": "Water Temple Lobby",
  "Shadow Temple": "Shadow Temple Entryway",
  "Spirit Temple": "Spirit Temple Lobby",
  "Bottom of the Well": "Bottom of the Well",
  "Ice Cavern": "Ice Cavern Beginning",
  "Gerudo Training Ground": "Gerudo Training Ground Lobby",
};

const SHORT_TO_FULL_HINT_REGION_NAMES = _.invert(HINT_REGIONS_SHORT_NAMES);

/**
 * @param {string} settingsString - Current tracker settings string.
 * @returns {boolean} True if the EFK preset is active.
 */
function isEFK(settingsString) {
  return settingsString === EFK_SETTINGS_STRING;
}

/**
 * @param {string} name - Label selector name.
 * @returns {boolean} True if the label is the EFK dungeon selector.
 */
function isEFKLabel(name) {
  return name === EFK_LABEL_NAME;
}

/**
 * Resolves the EFK dungeon label selections to full hint-region names.
 * @param {object} labelSelections - Map of elementId to { name, value }.
 * @returns {string[]} Selected dungeon full names, excluding unset ("???") or unknown values.
 */
function getSelectedEFKDungeons(labelSelections) {
  return Object.values(labelSelections)
    .filter(s => s.name === EFK_LABEL_NAME && s.value !== "???")
    .map(s => SHORT_TO_FULL_HINT_REGION_NAMES[s.value])
    .filter(Boolean);
}

/**
 * Returns lobby regions to skip during region traversal when the EFK preset is active.
 * Selected dungeons stay reachable; unselected dungeon lobbies are pruned.
 * @param {string} settingsString - Current tracker settings string.
 * @param {object} labelSelections - Map of elementId to { name, value }.
 * @returns {Set<string>} Region names to skip.
 */
function getEFKSkipRegions(settingsString, labelSelections) {
  if (!isEFK(settingsString)) {
    return new Set();
  }
  const selectedDungeons = new Set(getSelectedEFKDungeons(labelSelections));
  const skipRegions = new Set();
  Object.entries(EFK_DUNGEON_LOBBY_REGIONS).forEach(([dungeonName, lobbyRegion]) => {
    if (!selectedDungeons.has(dungeonName)) {
      skipRegions.add(lobbyRegion);
    }
  });
  return skipRegions;
}

/**
 * Predicate for the EFK region list. EFK shows only Kakariko plus either the four
 * selected dungeons (when all four selectors are set) or every dungeon except Ganons Castle.
 * @param {string} regionName - Region name to test.
 * @param {string[]} selectedDungeonNames - Dungeons currently picked via EFK labels.
 * @returns {boolean} True if the region should appear in EFK views.
 */
function isEFKRelevantRegion(regionName, selectedDungeonNames) {
  if (regionName === "Kakariko Village") {
    return true;
  }
  if (selectedDungeonNames.length === 4) {
    return _.includes(selectedDungeonNames, regionName);
  }
  return _.includes(DUNGEONS, regionName) && regionName !== "Ganons Castle";
}

export {
  EFK_LABEL_NAME,
  getEFKSkipRegions,
  getSelectedEFKDungeons,
  isEFK,
  isEFKLabel,
  isEFKRelevantRegion,
};
