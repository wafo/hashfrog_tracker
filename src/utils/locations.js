import _ from "lodash";

import HINT_REGIONS_SHORT_NAMES from "../data/hint-regions-short-names.json";
import HINT_REGIONS from "../data/hint-regions.json";
import LOCATION_TABLE from "../data/location-table.json";
import DEFAULT_SETTINGS from "../data/setting-presets/league-s3.json";

import LogicHelper from "./logic-helper";

class Locations {
  static initialize(dungeonFiles, overworldFile, settings = DEFAULT_SETTINGS) {
    this.settings = settings;

    this.locations = new Map();
    this.events = {};
    this.exits = {};

    this._mapHintRegions();

    this._parseDungeonFiles(dungeonFiles);
    this._parseOverworldFile(overworldFile);
  }

  static isAlwaysPlacedLocation(location) {
    const [type, vanillaItem] = LOCATION_TABLE[location];

    return (
      _.includes(
        ["Zeldas Letter", "Triforce", "Scarecrow Song", "Deliver Letter", "Time Travel", "Bombchu Drop"],
        vanillaItem,
      ) || type === "Drop"
    );
  }

  static isProgressLocation(location, isDungeon, settings) {
    const [type, vanillaItem] = LOCATION_TABLE[location];

    if (vanillaItem === "None") {
      return false;
    }

    // Disabled Locations
    else if (_.includes(settings.disabled_locations, location)) {
      return false;
    }

    // Always Placed Items
    else if (Locations.isAlwaysPlacedLocation(location)) {
      return false;
    }

    // Gold Skulltula Tokens
    else if (vanillaItem === "Gold Skulltula Token") {
      return (
        settings.tokensanity === "all" ||
        (settings.tokensanity === "dungeons" && isDungeon) ||
        (settings.tokensanity === "overworld" && !isDungeon)
      );
    }

    // Shops
    else if (type === "Shop" && settings.shopsanity === "off") {
      return false;
    }

    // Business Scrubs
    else if (_.includes(["Scrub", "GrottoScrub"], type)) {
      if (_.includes(["Piece of Heart", "Deku Stick Capacity", "Deku Nut Capacity"], vanillaItem)) {
        return true;
      } else if (settings.shuffle_scrubs === "off") {
        return false;
      } else {
        return true;
      }
    }

    // Kokiri Sword
    else if (vanillaItem === "Kokiri Sword") {
      return settings.shuffle_kokiri_sword;
    }

    // Weird Egg
    else if (vanillaItem === "Weird Egg") {
      if (settings.skip_child_zelda) {
        return false;
      } else {
        return settings.shuffle_weird_egg;
      }
    }

    // Ocarinas
    else if (vanillaItem === "Ocarina") {
      return settings.shuffle_ocarinas;
    }

    // Giant's Knife
    else if (vanillaItem === "Giants Knife") {
      return settings.shuffle_medigoron_carpet_salesman;
    }

    // Bombchus
    else if (_.includes(["Bombchus", "Bombchus (5)", "Bombchus (10)", "Bombchus (20)"], vanillaItem)) {
      return location !== "Wasteland Bombchu Salesman" || settings.shuffle_medigoron_carpet_salesman;
    }

    // Cows
    else if (vanillaItem === "Milk") {
      return settings.shuffle_cows;
    }

    // Gerudo Card
    else if (vanillaItem === "Gerudo Membership Card") {
      return settings.shuffle_gerudo_card && settings.gerudo_fortress != "open";
    }

    // Magic Beans
    else if (vanillaItem === "Buy Magic Bean") {
      return settings.shuffle_beans;
    }

    // Frogs Purple Rupees
    else if (_.startsWith(location, "ZR Frogs ") && vanillaItem === "Rupees (50)") {
      return settings.shuffle_frog_song_rupees;
    }

    // Thieves' Hideout
    else if (vanillaItem === "Small Key (Thieves Hideout)") {
      return _.includes(["any_dungeon", "overworld", "keysanity"], settings.shuffle_hideoutkeys);
    }

    // Dungeon Items
    else if (isDungeon) {
      let shuffleSetting = null;

      // Boss Key
      if (_.startsWith(vanillaItem, "Boss Key")) {
        if (!_.startsWith(location, "Ganons Tower")) {
          shuffleSetting = settings.shuffle_bosskeys;
        } else {
          shuffleSetting = settings.shuffle_ganon_bosskey;
        }
        if (shuffleSetting === "vanilla") {
          return false;
        } else {
          return true;
        }
      }
      // Map or Compass
      else if (_.startsWith(vanillaItem, "Map") || _.startsWith(vanillaItem, "Compass")) {
        shuffleSetting = settings.shuffle_mapcompass;
        if (shuffleSetting === "vanilla") {
          return false;
        } else {
          return true;
        }
      }
      // Small Key
      else if (_.startsWith(vanillaItem, "Small Key")) {
        shuffleSetting = settings.shuffle_smallkeys;
        if (shuffleSetting === "vanilla") {
          return false;
        } else {
          return true;
        }
      }
      // Any other item in a dungeon.
      else if (_.includes(["Chest", "NPC", "Song", "Collectable", "Cutscene", "BossHeart"], type)) {
        return true;
      }
      // Remaining locations default to false.
      else {
        return false;
      }
    }

    // The rest of the overworld items.
    else if (_.includes(["Chest", "NPC", "Song", "Collectable", "Cutscene", "BossHeart"], type)) {
      return true;
    }

    // Remaining locations default to false.
    else {
      return false;
    }
  }

  static mapLocationsToHintAreas() {
    const newLocations = new Map();

    _.forEach(this.locations, (locationData, locationName) => {
      const hintRegionName = this.regionMap[locationData.parentRegion];
      _.set(newLocations, hintRegionName, _.union(newLocations[hintRegionName], [locationName]));
    });

    return newLocations;
  }

  static removeRegionPrefix(locationName, regionName) {
    const regionShortName = HINT_REGIONS_SHORT_NAMES[regionName];

    if (_.startsWith(locationName, regionShortName)) {
      return _.slice(locationName, _.size(regionShortName) + 1);
    } else if (_.startsWith(locationName, regionName)) {
      return _.slice(locationName, _.size(regionName) + 1);
    } else if (regionName === "Inside Ganons Castle") {
      if (_.startsWith(locationName, "Ganons Castle")) return _.slice(locationName, _.size("Ganons Castle") + 1);
      if (_.startsWith(locationName, "Ganons Tower")) return _.slice(locationName, _.size("Ganons Tower") + 1);
    } else {
      return locationName;
    }
  }

  static _mapHintRegions() {
    this.regionMap = new Map();

    _.forEach(HINT_REGIONS, (hintRegionData, hintRegionName) => {
      _.forEach(hintRegionData, regionName => {
        _.set(this.regionMap, regionName, hintRegionName);
      });
    });
  }

  static _parseDungeonFiles(dungeonFiles) {
    _.forEach(_.values(dungeonFiles), dungeonRegions => {
      _.forEach(dungeonRegions, region => {
        if (_.includes(_.keys(region), "locations")) {
          _.forEach(region.locations, (rule, locationName) => {
            if (Locations.isProgressLocation(locationName, true, this.settings)) {
              const locationData = {
                parentRegion: region.region_name,
                rule: LogicHelper.parseRule(rule),
              };
              _.set(this.locations, locationName, locationData);
            }
          });
        }

        if (_.includes(_.keys(region), "events")) {
          _.forEach(region.events, (rule, eventName) => {
            const eventData = {
              parentRegion: region.region_name,
              rule: LogicHelper.parseRule(rule),
            };
            _.set(this.events, eventName, eventData);
          });
        }

        if (_.includes(_.keys(region), "exits")) {
          _.forEach(region.exits, (rule, exitName) => {
            _.set(this.exits, [region.region_name, exitName], LogicHelper.parseRule(rule));
          });
        }
      });
    });
  }

  static _parseOverworldFile(overworldFile) {
    _.forEach(overworldFile, region => {
      if (_.includes(_.keys(region), "locations")) {
        _.forEach(region.locations, (rule, locationName) => {
          if (Locations.isProgressLocation(locationName, false, this.settings)) {
            const locationData = {
              parentRegion: region.region_name,
              rule: LogicHelper.parseRule(rule),
            };
            _.set(this.locations, locationName, locationData);
          }
        });
      }

      if (_.includes(_.keys(region), "events")) {
        _.forEach(region.events, (rule, eventName) => {
          const eventData = {
            parentRegion: region.region_name,
            rule: LogicHelper.parseRule(rule),
          };
          _.set(this.events, eventName, eventData);
        });
      }

      if (_.includes(_.keys(region), "exits")) {
        _.forEach(region.exits, (rule, exitName) => {
          _.set(this.exits, [region.region_name, exitName], LogicHelper.parseRule(rule));
        });
      }
    });
  }
}

export default Locations;
