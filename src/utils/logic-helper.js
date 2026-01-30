import _ from "lodash";
import memoize from "memoizee";

import Locations from "./locations";
import { parseRule } from "./rule-parser";

import DUNGEON_CONFIG from "../data/dungeon-config.json";
import DUNGEONS from "../data/dungeons.json";
import MASK_LOCATIONS from "../data/mask-locations.json";
import SHOP_RULES from "../data/shop-rules.json";
import SONG_NOTES from "../data/song-notes.json";
import TRADE_SEQUENCE from "../data/trade-sequence.json";

class LogicHelper {
  static BUILTIN_FUNCTIONS = {
    // source: State.py

    has_hearts: function (node, _age) {
      const countArg = node.arguments[0];
      const requiredCount = countArg.type === "Identifier" ? this.settings[countArg.name] || 0 : countArg.value;

      const pieces = this.items.Piece_of_Heart || 0;
      const containers = this.items.Heart_Container || 0;
      const totalHearts = Math.floor(pieces / 4) + containers + 3;
      return totalHearts >= requiredCount;
    },

    has_medallions: function (node, _age) {
      const countArg = node.arguments[0];
      const requiredCount = countArg.type === "Identifier" ? this.settings[countArg.name] || 0 : countArg.value;

      const medallions = [
        "Forest_Medallion",
        "Fire_Medallion",
        "Water_Medallion",
        "Spirit_Medallion",
        "Shadow_Medallion",
        "Light_Medallion",
      ];
      const count = medallions.filter(m => this.items[m] > 0).length;
      return count >= requiredCount;
    },

    has_stones: function (node, _age) {
      const countArg = node.arguments[0];
      const requiredCount = countArg.type === "Identifier" ? this.settings[countArg.name] || 0 : countArg.value;

      const stones = ["Kokiri_Emerald", "Goron_Ruby", "Zora_Sapphire"];
      const count = stones.filter(s => this.items[s] > 0).length;
      return count >= requiredCount;
    },

    has_dungeon_rewards: function (node, _age) {
      const countArg = node.arguments[0];
      const requiredCount = countArg.type === "Identifier" ? this.settings[countArg.name] || 0 : countArg.value;

      const rewards = [
        "Kokiri_Emerald",
        "Goron_Ruby",
        "Zora_Sapphire",
        "Forest_Medallion",
        "Fire_Medallion",
        "Water_Medallion",
        "Spirit_Medallion",
        "Shadow_Medallion",
        "Light_Medallion",
      ];
      const count = rewards.filter(r => this.items[r] > 0).length;
      return count >= requiredCount;
    },

    can_live_dmg: function (node, age) {
      const heartsArg = node.arguments[0];
      const hearts = heartsArg.value;

      const allowReviveArg = node.arguments[1];
      const allowRevive = allowReviveArg ? allowReviveArg.name !== "False" && allowReviveArg.value !== false : true;

      const allowNayrusArg = node.arguments[2];
      const allowNayrus = allowNayrusArg ? allowNayrusArg.name !== "False" && allowNayrusArg.value !== false : true;

      const mult = this.settings.damage_multiplier;
      const hasNayrus = allowNayrus && this.items.Nayrus_Love > 0 && this.items.Magic_Meter > 0;
      const hasFairy = allowRevive && this._evalNode(parseRule("Fairy"), age);

      if (mult === "ohko") {
        return hasFairy || hasNayrus;
      } else if (mult === "quad") {
        return hearts < 0.75 || hasFairy || hasNayrus;
      } else if (mult === "double") {
        return hearts < 1.5 || hasFairy || hasNayrus;
      } else if (mult === "normal") {
        return hearts < 3 || hasFairy || hasNayrus;
      } else if (mult === "half") {
        return hearts < 6 || hasFairy || hasNayrus;
      }
      return false;
    },

    region_has_shortcuts: function (node, _age) {
      const regionArg = node.arguments[0];
      const regionName = regionArg.type === "Identifier" ? regionArg.name : regionArg.value;

      if (!(regionName in Locations.regionMap)) {
        return false;
      }
      return _.includes(this.settings.dungeon_shortcuts, Locations.regionMap[regionName]);
    },

    has_soul: function (_node, _age) {
      // const enemyName = node.arguments[0].type === "Identifier" ? node.arguments[0].name : node.arguments[0].value;
      // return !this.settings.shuffle_enemy_souls || this.items[`${enemyName}_Soul`] > 0;
      return true;
    },

    has_all_notes_for_song: function (node, _age) {
      if (!this.settings.shuffle_individual_ocarina_notes) {
        return true;
      }

      const songArg = node.arguments[0];
      const songName = songArg.type === "Identifier" ? songArg.name : songArg.value;

      // Scarecrow needs 2 different notes
      if (songName === "Scarecrow_Song" || songName === "Scarecrow Song") {
        if (this.settings.scarecrow_behavior === "free") {
          return true;
        }
        const buttons = [
          "Ocarina_A_Button",
          "Ocarina_C_up_Button",
          "Ocarina_C_down_Button",
          "Ocarina_C_left_Button",
          "Ocarina_C_right_Button",
        ];
        const count = buttons.filter(b => this.items[b] > 0).length;
        return count >= 2;
      }

      // Other songs
      const normalizedName = songName.replace(/_/g, " ").replace(/'/g, "");
      if (normalizedName in SONG_NOTES) {
        return SONG_NOTES[normalizedName].every(button => this.items[button] > 0);
      }
      if (songName in SONG_NOTES) {
        return SONG_NOTES[songName].every(button => this.items[button] > 0);
      }

      return true;
    },

    // Internal functions
    // source: RuleParser.py
    at: function (node, _age) {
      const spotToCheck = node.arguments[0].value;
      const expression = node.arguments[1];
      return (
        (this._isRegionAccessible(spotToCheck, "child") && this._evalNode(expression, "child")) ||
        (this._isRegionAccessible(spotToCheck, "adult") && this._evalNode(expression, "adult"))
      );
    },

    here: function (node, age) {
      return this._evalNode(node.arguments[0], age);
    },

    at_day: function (_node, _age) {
      return true;
    },

    at_dampe_time: function (_node, _age) {
      return true;
    },

    at_night: function (_node, _age) {
      return true;
    },
  };

  static async initialize(logicHelpersFile, settings) {
    this.settings = settings;

    this.ruleAliases = {};
    this.parameterizedAliases = {};
    _.forEach(logicHelpersFile, (rule, alias) => {
      if (alias.includes("(")) {
        const match = alias.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]+)\)$/);
        if (match) {
          const funcName = match[1];
          const paramNames = match[2].split(",").map(p => p.trim());

          // Create regex patterns for each parameter
          const paramPatterns = paramNames.map(p => new RegExp(`\\b${p}\\b`, "g"));
          this.parameterizedAliases[funcName] = {
            params: paramNames,
            patterns: paramPatterns,
            template: rule,
          };
        }
      } else {
        _.set(this.ruleAliases, alias, parseRule(rule));
      }
    });

    this.renamedAttributes = this._initRenamedAttributes();

    if (
      _.isEqual(this.settings.open_forest, "closed") &&
      (this.renamedAttributes.shuffle_special_interior_entrances ||
        this.settings.shuffle_overworld_entrances ||
        this.settings.warp_songs ||
        this.settings.spawn_positions)
    ) {
      _.set(this.settings, "open_forest", "closed_deku");
    }

    if (this.settings.triforce_hunt) {
      _.set(this.settings, "shuffle_ganon_bosskey", "triforce");
    }

    if (_.isEqual(this.settings.dungeon_shortcuts_choice, "all")) {
      _.set(this.settings, "dungeon_shortcuts", DUNGEON_CONFIG.dungeonShortcuts);
    }

    if (_.isEqual(this.settings.key_rings_choice, "all")) {
      _.set(this.settings, "key_rings", DUNGEON_CONFIG.keyRings);
    }

    // Add all dungeons to MQ-dungeons-specific list if all dungeons are set to MQ
    if (_.isEqual(this.settings.mq_dungeons_mode, "mq")) {
      _.set(this.settings, "mq_dungeons_specific", DUNGEONS);
    }

    // Ignore initial dungeon shortcuts choices when option is set to random
    if (_.isEqual(this.settings.dungeon_shortcuts_choice, "random")) {
      _.set(this.settings, "dungeon_shortcuts", []);
    }

    this.items = {};
    this.regions = { child: new Set(), adult: new Set() };

    this.memoizedFunctions = this._memoizeFunctions();

    return this.settings;
  }

  static updateItems(newItems) {
    this.items = _.cloneDeep(newItems);

    this.regions = { child: new Set(), adult: new Set() };

    let accessibleChildRegions = [];
    let newChildRegions = this._recalculateAccessibleRegions("Root", "child");

    let accessibleAdultRegions = [];
    let newAdultRegions = this._recalculateAccessibleRegions("Root", "adult");

    const guaranteedKeys = {};
    let updatedKeys = false;

    do {
      updatedKeys = false;

      // NOTE: Must use native forEach for Sets
      this.regions.child.forEach(regionName => {
        if (regionName in Locations.activeKeyLocations) {
          _.forEach(Locations.activeKeyLocations[regionName], keyLocation => {
            if (
              !(keyLocation.locationName in guaranteedKeys) &&
              this._evalNode(keyLocation.rule, "child")
            ) {
              _.set(guaranteedKeys, keyLocation.locationName, true);
              _.update(this.items, this._getItemName(keyLocation.vanillaItem), count => count + 1);
              updatedKeys = true;
            }
          });
        }
      });
      this.regions.adult.forEach(regionName => {
        if (regionName in Locations.activeKeyLocations) {
          _.forEach(Locations.activeKeyLocations[regionName], keyLocation => {
            if (
              !(keyLocation.locationName in guaranteedKeys) &&
              this._evalNode(keyLocation.rule, "adult")
            ) {
              _.set(guaranteedKeys, keyLocation.locationName, true);
              _.update(this.items, this._getItemName(keyLocation.vanillaItem), count => count + 1);
              updatedKeys = true;
            }
          });
        }
      });

      accessibleChildRegions = _.cloneDeep(newChildRegions);
      accessibleAdultRegions = _.cloneDeep(newAdultRegions);

      _.forEach(accessibleChildRegions, regionName => {
        newChildRegions = _.union(newChildRegions, this._recalculateAccessibleRegions(regionName, "child"));
      });
      _.forEach(accessibleAdultRegions, regionName => {
        newAdultRegions = _.union(newAdultRegions, this._recalculateAccessibleRegions(regionName, "adult"));
      });
    } while (
      updatedKeys ||
      !_.isEqual(accessibleChildRegions, newChildRegions) ||
      !_.isEqual(accessibleAdultRegions, newAdultRegions)
    );
  }

  static isLocationAvailable(locationName, age) {
    const parentRegion = Locations.activeLocations[locationName].parentRegion;
    const locationRule = Locations.activeLocations[locationName].rule;

    if (_.isUndefined(age)) {
      return this.isLocationAvailable(locationName, "child") || this.isLocationAvailable(locationName, "adult");
    } else {
      return this._isRegionAccessible(parentRegion, age) && this._evalNode(locationRule, age);
    }
  }

  static countSkullsInLogic() {
    return _.size(
      _.filter(Locations.activeSkullsLocations, locationName => this.isLocationAvailable(locationName)),
    );
  }

  static _memoizeFunctions() {
    return _.map(
      [
        "isLocationAvailable",
        "_getItemName",
        "_isRegionAccessible",
        "_evalNode",
        "_evalBinaryExpression",
        "_evalCallExpression",
        "_evalIdentifier",
        "_evalLiteral",
        "_evalLogicalExpression",
        "_evalMemberExpression",
        "_evalSequenceExpression",
        "_evalUnaryExpression",
      ],
      funcName => {
        const memoizedFunction = memoize(LogicHelper[funcName]);
        _.set(LogicHelper, funcName, memoizedFunction);
        return memoizedFunction;
      },
    );
  }

  static _invalidateMemoizedFunctions() {
    _.forEach(this.memoizedFunctions, memoizedFunction => {
      if (memoizedFunction.clear) {
        memoizedFunction.clear();
      }
    });
  }

  static _initRenamedAttributes() {
    // source: World.py __init__()

    const keysanity = _.includes(
      ["keysanity", "remove", "any_dungeon", "overworld", "regional"],
      this.settings.shuffle_smallkeys,
    );
    const shuffleSilverRupees = !_.isEqual(this.settings.shuffle_silver_rupees, "vanilla");
    const checkBeatableOnly = !_.isEqual(this.settings.reachable_locations, "all");
    const shuffleSpecialInteriorEntrances = _.isEqual(this.settings.shuffle_interior_entrances, "all");
    const shuffleInteriorEntrances = _.includes(["simple", "all"], this.settings.shuffle_interior_entrances);
    const shuffleSpecialDungeonEntrances = _.isEqual(this.settings.shuffle_dungeon_entrances, "all");
    const shuffleDungeonEntrances = _.includes(["simple", "all"], this.settings.shuffle_dungeon_entrances);

    const entranceShuffle =
      shuffleInteriorEntrances ||
      this.settings.shuffle_grotto_entrances ||
      shuffleDungeonEntrances ||
      this.settings.shuffle_overworld_entrances ||
      this.settings.shuffle_gerudo_valley_river_exit ||
      this.settings.owl_drops ||
      this.settings.warp_songs ||
      this.settings.spawn_positions ||
      !_.isEqual(this.settings.shuffle_bosses, "off");

    const mixedPoolsBosses = false;

    const ensureTodAccess =
      shuffleInteriorEntrances || this.settings.shuffle_overworld_entrances || this.settings.spawn_positions;
    const disableTradeRevert =
      shuffleInteriorEntrances || this.settings.shuffle_overworld_entrances || this.settings.adult_trade_shuffle;
    const skipChildZelda =
      !_.includes(this.settings.shuffle_child_trade, "Zeldas Letter") &&
      _.includes(this.settings.starting_inventory, "zeldas_letter");

    const triforceGoal = this.settings.triforce_goal_per_world * this.settings.world_count;

    return {
      keysanity: keysanity,
      shuffle_silver_rupees: shuffleSilverRupees,
      check_beatable_only: checkBeatableOnly,
      shuffle_special_interior_entrances: shuffleSpecialInteriorEntrances,
      shuffle_interior_entrances: shuffleInteriorEntrances,
      shuffle_special_dungeon_entrances: shuffleSpecialDungeonEntrances,
      shuffle_dungeon_entrances: shuffleDungeonEntrances,
      entrance_shuffle: entranceShuffle,
      mixed_pools_bosses: mixedPoolsBosses,
      ensure_tod_access: ensureTodAccess,
      disable_trade_revert: disableTradeRevert,
      skip_child_zelda: skipChildZelda,
      triforce_goal: triforceGoal,
    };
  }

  static _getItemName(itemName) {
    return _.replace(itemName, /[() ]/g, match => (_.isEqual(match, " ") ? "_" : ""));
  }

  static _recalculateAccessibleRegions(rootRegion, age) {
    this._invalidateMemoizedFunctions();

    let regionsToCheck = [];

    _.forEach(Locations.activeExits[rootRegion], (exitRule, exitName) => {
      if (!this.regions[age].has(exitName)) {
        if (this._evalNode(exitRule, age)) {
          this.regions[age].add(exitName);
          regionsToCheck = _.union(regionsToCheck, this._recalculateAccessibleRegions(exitName, age));
        } else {
          regionsToCheck = _.union(regionsToCheck, [rootRegion]);
        }
      }
    });

    return regionsToCheck;
  }

  static _isRegionAccessible(regionName, age) {
    switch (age) {
      case "child":
        return this.regions.child.has(regionName);
      case "adult":
        return this.regions.adult.has(regionName);
      default:
        throw Error(`Invalid age ${age}`);
    }
  }

  static _evalBinaryExpression(node) {
    const leftNode = node.left;
    const rightNode = node.right;
    const leftValue = leftNode.type === "Identifier" ? leftNode.name : leftNode.value;
    const rightValue = rightNode.type === "Identifier" ? rightNode.name : rightNode.value;

    switch (node.operator) {
      case "==":
        if (leftNode.type === "Identifier" && rightNode.type === "Identifier") {
          const leftIsSettingOrAttribute = leftValue in this.settings || leftValue in this.renamedAttributes;
          const rightIsSettingOrAttribute = rightValue in this.settings || rightValue in this.renamedAttributes;

          if (!leftIsSettingOrAttribute && !rightIsSettingOrAttribute) {
            return leftValue === rightValue;
          }
        }
        if (leftValue in this.settings) {
          return _.isEqual(this.settings[leftValue], rightValue);
        }
        if (leftValue in this.renamedAttributes) {
          return _.isEqual(this.renamedAttributes[leftValue], rightValue);
        }
        if (leftValue === "age") {
          if (rightValue === "starting_age") {
            return true; // TODO: don't hardcode this
          }
          return false;
        }
        else if (leftValue === "selected_adult_trade_item") {
          return _.includes(this.items, rightValue);
        }
        return false;

      case "!=":
        if (leftNode.type === "Identifier" && rightNode.type === "Identifier") {
          const leftIsSettingOrAttribute = leftValue in this.settings || leftValue in this.renamedAttributes;
          const rightIsSettingOrAttribute = rightValue in this.settings || rightValue in this.renamedAttributes;

          if (!leftIsSettingOrAttribute && !rightIsSettingOrAttribute) {
            return leftValue !== rightValue;
          }
        }
        if (leftValue in this.settings) {
          return !_.isEqual(this.settings[leftValue], rightValue);
        }
        if (leftValue in this.renamedAttributes) {
          return !_.isEqual(this.renamedAttributes[leftValue], rightValue);
        }
        return true;

      case "<":
        if (leftValue in this.settings) {
          return this.settings[leftValue] < rightValue;
        }
        throw Error(`Unable to eval BinaryExpression: ${leftValue} < ${rightValue}`);

      case "in":
        if (rightValue in this.settings) {
          return _.includes(this.settings[rightValue], leftValue);
        }
        return false;

    }

    throw Error(`Unable to eval BinaryExpression: ${leftValue} ${node.operator} ${rightValue}`);
  }

  static _substituteParameters(template, patterns, argValues) {
    let result = template;
    patterns.forEach((pattern, i) => {
      result = result.replace(pattern, argValues[i]);
    });
    return result;
  }

  static _evalCallExpression(node, age) {
    const funcName = node.callee.name;

    // Check built-in functions
    if (funcName in this.BUILTIN_FUNCTIONS) {
      return this.BUILTIN_FUNCTIONS[funcName].call(this, node, age);
    }

    // Check parameterized aliases
    if (funcName in this.parameterizedAliases) {
      const { params, patterns, template } = this.parameterizedAliases[funcName];

      // Extract argument values as strings
      const argValues = node.arguments.map(arg => {
        if (arg.type === "Identifier") {
          return arg.name;
        }
        if (arg.type === "Literal") {
          return typeof arg.value === "string" ? arg.value : String(arg.value);
        }
        throw Error(`Unsupported argument type in ${funcName}: ${arg.type}`);
      });

      // Validate argument count
      if (argValues.length !== params.length) {
        throw Error(`Expected ${params.length} args for ${funcName}, got ${argValues.length}`);
      }

      // Substitute parameters with strings
      const substituted = this._substituteParameters(template, patterns, argValues);

      // Parse substituted string and evaluate
      const parsedRule = parseRule(substituted);
      return this._evalNode(parsedRule, age);
    }

    throw Error(`Unknown CallExpression: ${funcName}`);
  }

  static _canAccessDrop(dropName) {
    return _.some(Locations.activeDropLocations[dropName], locationData => {
      const parentRegion = locationData.parentRegion;
      const rule = locationData.rule;

      const asChild = this._isRegionAccessible(parentRegion, "child") && this._evalNode(rule, "child");
      const asAdult = this._isRegionAccessible(parentRegion, "adult") && this._evalNode(rule, "adult");

      return asChild || asAdult;
    });
  }

  static _canBuy(itemName, age) {
    const rules = [];

    if (_.includes(SHOP_RULES.walletRequired, itemName)) {
      rules.push("Progressive_Wallet");
    } else if (_.includes(SHOP_RULES.wallet2Required, itemName)) {
      rules.push("(Progressive_Wallet, 2)");
    }

    if (_.includes(SHOP_RULES.adultRequired, itemName)) {
      rules.push("is_adult");
    }

    if (_.includes(SHOP_RULES.bottleRequired, itemName)) {
      rules.push("has_bottle");
    }

    if (_.includes(SHOP_RULES.bombchusRequired, itemName)) {
      rules.push("found_bombchus");
    }

    if (_.isEmpty(rules)) {
      return true;
    } else {
      const combinedRule = _.join(rules, " and ");
      return this._evalNode(parseRule(combinedRule), age);
    }
  }

  static _evalRuleAlias(ruleName) {
    const rule = this.ruleAliases[ruleName];

    const asChild = this._evalNode(rule, "child");
    const asAdult = this._evalNode(rule, "adult");

    return asChild || asAdult;
  }

  static _hadNightStart() {
    const stod = this.settings.starting_tod;
    return _.includes(["sunset", "evening", "midnight", "witching-hour"], stod);
  }

  static _hasBottle() {
    return this.items.Bottle > 0 || this.isLocationAvailable("Deliver Rutos Letter");
  }

  static _evalIdentifier(name, age) {
    switch (name) {
      case "True":
        return true;

      case "has_bottle":
        return this._hasBottle();
      case "had_night_start":
        return this._hadNightStart();
      case "is_adult":
        return _.isEqual(age, "adult");
      case "is_child":
        return _.isEqual(age, "child");

      case "Big_Poe":
        return this._canAccessDrop("Big Poe");
      case "Blue_Fire_Arrows":
        return this.settings.blue_fire_arrows && this.items.Ice_Arrows > 0;
      case "Bombchu_Drop":
        return this.isLocationAvailable("Market Bombchu Bowling Bombchus");
      case "Deku_Nut_Drop":
        return this._canAccessDrop("Deku Nut Drop");
      case "Deku_Shield_Drop":
        return this._canAccessDrop("Deku Shield Drop");
      case "Deku_Stick_Drop":
        return this._canAccessDrop("Deku Stick Drop");
      case "Deliver_Letter":
        return this.isLocationAvailable("Deliver Rutos Letter");
      case "Scarecrow_Song":
        return (
          this.settings.scarecrow_behavior === "free" ||
          this.settings.scarecrow_behavior === "fast" ||
          (age === "adult" && this._evalEvent("Bonooru"))
        );
      case "Time_Travel":
        return this.isLocationAvailable("Master Sword Pedestal");
      case "Zeldas_Letter":
        return (
          this.items[name] > 0 ||
          this.renamedAttributes.skip_child_zelda ||
          this.isLocationAvailable("HC Zeldas Letter")
        );
    }

    if (name in MASK_LOCATIONS) {
      return this.items[name] > 0 || this.isLocationAvailable(MASK_LOCATIONS[name]);
    }

    if (name in TRADE_SEQUENCE) {
      const trade = TRADE_SEQUENCE[name];
      return (
        this.items[name] > 0 ||
        ((!this.settings.adult_trade_shuffle ||
          !_.includes(this.settings.adult_trade_start, trade.tradeStartName)) &&
          this.isLocationAvailable(trade.location, "adult"))
      );
    }

    if (name in this.items) {
      if (_.startsWith(name, "Boss_Key_")) {
        // extra check for boss keysy modes
        if (_.isEqual(name, "Boss_Key_Ganons_Castle")) {
          // if Ganon's Boss Keys mode is Keysy, ignore Ganon's Boss Key requirements
          return _.isEqual(this.settings.shuffle_ganon_bosskey, "remove") || this.items[name] > 0;
        } else {
          // if Boss Keys mode is Keysy, ignore Boss Key requirements
          return _.isEqual(this.settings.shuffle_bosskeys, "remove") || this.items[name] > 0;
        }
      } else {
        return this.items[name] > 0;
      }
    }
    if (name in this.renamedAttributes) {
      return this.renamedAttributes[name];
    }
    if (name in this.settings) {
      return this.settings[name];
    }
    if (name in this.ruleAliases) {
      return this._evalRuleAlias(name);
    }
    const escapedIdentifier = _.replace(name, /_/g, " ");
    if (escapedIdentifier in Locations.activeEvents) {
      return this._evalEvent(escapedIdentifier);
    }

    if (_.startsWith(name, "logic_")) {
      return _.includes(this.settings.allowed_tricks, name);
    }
    // Assume can always let time of day pass
    if (_.startsWith(name, "at_")) {
      return true;
    }
    if (_.startsWith(name, "Buy_")) {
      return this._canBuy(name, age);
    }
    if (_.startsWith(name, "adv_") || _.startsWith(name, "glitch_")) {
      return _.includes(this.settings.advanced_allowed_tricks, name);
    }

    throw Error(`Unknown Identifier: ${name}`);
  }

  static _evalLiteral(value) {
    if (value in Locations.activeDropLocations) {
      return this._canAccessDrop(value);
    } else if (value in Locations.activeEvents) {
      return this._evalEvent(value);
    }

    throw Error(`Unknown Literal: ${value}`);
  }

  static _evalLogicalExpression(node, age) {
    switch (node.operator) {
      case "&&":
        return this._evalNode(node.left, age) && this._evalNode(node.right, age);
      case "||":
        return this._evalNode(node.left, age) || this._evalNode(node.right, age);
      default:
        throw Error(`Unknown logical operator: ${node.operator}`);
    }
  }

  static _evalMemberExpression() {
    // TODO: not yet implemented
    return true;
  }

  static _evalSequenceExpression(node) {
    if (_.size(node.expressions) !== 2) {
      throw Error(`Unknown SequenceExpression of length ${_.size(node.expressions)}`);
    }

    const itemName = node.expressions[0].name;
    let itemCount = node.expressions[1].value;

    // if Small Keys mode is Keysy, ignore small key requirements
    if (_.isEqual(this.settings.shuffle_smallkeys, "remove") && _.startsWith(itemName, "Small_Key_")) {
      return true;
    }

    // if Silver Rupees mode is Silver Rupeesy, ignore silver rupee requirements
    if (_.isEqual(this.settings.shuffle_silver_rupees, "remove") && _.startsWith(itemName, "Silver_Rupee_")) {
      return true;
    }

    // case for Bottle_with_Big_Poe sequence expression
    if (_.isEqual(itemName, "Bottle_with_Big_Poe")) {
      itemCount = this.big_poe_count_random ? 10 : this.settings.big_poe_count;
    }

    // account for removed locked door in Fire Temple when keysanity is off
    if (!this.renamedAttributes.keysanity && _.isEqual(itemName, "Small_Key_Fire_Temple")) {
      itemCount -= 1;
    }

    return this.items[itemName] >= itemCount;
  }

  static _evalUnaryExpression(node, age) {
    if (_.isEqual(node.operator, "!")) {
      return !this._evalNode(node.argument, age);
    }

    throw Error(`Unknown unary operator: ${node.operator}`);
  }

  static _evalEvent(eventName) {
    // manually implement event to prevent infinite recursion
    if (_.isEqual(eventName, "Eyeball Frog Access")) {
      return (
        this._evalEvent("King Zora Thawed") &&
        ((!this.renamedAttributes.disable_trade_revert && (this.items.Eyedrops > 0 || this.items.Eyeball_Frog > 0)) ||
          this.items.Prescription > 0 ||
          ((!this.settings.adult_trade_shuffle ||
            !_.includes(this.settings.adult_trade_start, "Broken Sword")) &&
            this._evalEvent("Prescription Access")))
      );
    }

    return _.some(Locations.activeEvents[eventName], eventData => {
      const parentRegion = eventData.parentRegion;
      const rule = eventData.rule;

      const asChild = this._isRegionAccessible(parentRegion, "child") && this._evalNode(rule, "child");
      const asAdult = this._isRegionAccessible(parentRegion, "adult") && this._evalNode(rule, "adult");

      return asChild || asAdult;
    });
  }

  static _evalNode(node, age) {
    switch (node.type) {
      case "BinaryExpression":
        return this._evalBinaryExpression(node);
      case "CallExpression":
        return this._evalCallExpression(node, age);
      case "ExpressionStatement":
        return this._evalNode(node.expression, age);
      case "Identifier":
        return this._evalIdentifier(node.name, age);
      case "Literal":
        return this._evalLiteral(node.value, age);
      case "LogicalExpression":
        return this._evalLogicalExpression(node, age);
      case "MemberExpression":
        return this._evalMemberExpression();
      case "SequenceExpression":
        return this._evalSequenceExpression(node, age);
      case "UnaryExpression":
        return this._evalUnaryExpression(node, age);
      default:
        throw Error(`Unknown AST node of type ${node.type}`);
    }
  }
}

export default LogicHelper;
