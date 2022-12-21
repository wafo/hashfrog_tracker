import { parse } from "acorn";
import _ from "lodash";

import Locations from "./locations";

class LogicHelper {
  static async initialize(logicHelpersFile, settings) {
    this.settings = settings;

    this.ruleAliases = {};
    _.forEach(logicHelpersFile, (rule, alias) => {
      if (!_.endsWith(alias, ")")) {
        _.set(this.ruleAliases, alias, this.parseRule(rule));
      }
    });

    this.renamedAttributes = this._initRenamedAttributes();

    if (
      _.isEqual(this.settings.open_forest, "closed") &&
      (this.renamedAttributes.shuffle_special_interior_entrances ||
        this.settings.shuffle_overworld_entrances ||
        this.settings.warp_songs ||
        this.settings.spawn_positions ||
        !_.isEqual(this.settings.shuffle_bosses, "off"))
    ) {
      _.set(this.settings, "open_forest", "closed_deku");
    }

    if (this.settings.triforce_hunt) {
      _.set(this.settings, "shuffle_ganon_bosskey", "triforce");
    }

    this.items = {};
    this.regions = { child: [], adult: [] };

    return this.settings;
  }

  static updateItems(newItems) {
    this.items = _.cloneDeep(newItems);

    this.regions = { child: [], adult: [] };

    let oldRegionsToCheck = [];
    let newRegionsToCheck = [];

    do {
      newRegionsToCheck = [];
      _.forEach(oldRegionsToCheck, regionName => {
        newRegionsToCheck = _.union(newRegionsToCheck, this._recalculateAccessibleRegions(regionName, "child"));
      });
      oldRegionsToCheck = this._recalculateAccessibleRegions("Root", "child");
    } while (!_.isEqual(oldRegionsToCheck, newRegionsToCheck));

    do {
      newRegionsToCheck = [];
      _.forEach(oldRegionsToCheck, regionName => {
        newRegionsToCheck = _.union(newRegionsToCheck, this._recalculateAccessibleRegions(regionName, "adult"));
      });
      oldRegionsToCheck = this._recalculateAccessibleRegions("Root", "adult");
    } while (!_.isEqual(oldRegionsToCheck, newRegionsToCheck));
  }

  static parseRule(ruleString) {
    const rule = _.flow(
      _.trim,
      str => _.replace(str, / and /g, " && "),
      str => _.replace(str, / or /g, " || "),
      str => _.replace(str, /not /g, "! "),
    )(ruleString);

    return parse(rule, { ecmaVersion: 2020 }).body[0];
  }

  static isLocationAvailable(locationName, age) {
    const parentRegion = Locations.locations[locationName].parentRegion;
    const locationRule = Locations.locations[locationName].rule;

    if (_.isUndefined(age)) {
      return this.isLocationAvailable(locationName, "child") || this.isLocationAvailable(locationName, "adult");
    } else {
      return this._isRegionAccessible(parentRegion, age) && this._evalNode(locationRule, age);
    }
  }

  static countSkullsInLogic() {
    return _.size(_.filter(Locations.skullsLocations, locationName => LogicHelper.isLocationAvailable(locationName)));
  }

  static _initRenamedAttributes() {
    // source: World.py __init__()

    const keysanity = _.includes(["keysanity", "remove", "any_dungeon", "overworld", "regional"], this.settings.shuffle_smallkeys);
    const checkBeatableOnly = _.isEqual(this.settings.reachable_locations, "all");
    const shuffleSpecialInteriorEntrances = _.isEqual(this.settings.shuffle_interior_entrances, "all");
    const shuffleInteriorEntrances = _.includes(["simple", "all"], this.settings.shuffle_interior_entrances);
    const shuffleSpecialDungeonEntrances = _.isEqual(this.settings.shuffle_dungeon_entrances, "all");
    const shuffleDungeonEntrances = _.includes(["simple", "all"], this.settings.shuffle_dungeon_entrances);

    const entranceShuffle =
      shuffleInteriorEntrances ||
      this.settings.shuffle_grotto_entrances ||
      shuffleDungeonEntrances ||
      this.settings.shuffle_overworld_entrances ||
      this.settings.owl_drops ||
      this.settings.warp_songs ||
      this.settings.spawn_positions ||
      !_.isEqual(this.settings.shuffle_bosses, "off");

    const ensureTodAccess =
      shuffleInteriorEntrances || this.settings.shuffle_overworld_entrances || this.settings.spawn_positions;
    const disable_trade_revert = shuffleInteriorEntrances || this.settings.shuffle_overworld_entrances;

    const triforceGoal = this.settings.triforce_goal_per_world * this.settings.world_count;

    return {
      keysanity: keysanity,
      check_beatable_only: checkBeatableOnly,
      shuffle_special_interior_entrances: shuffleSpecialInteriorEntrances,
      shuffle_interior_entrances: shuffleInteriorEntrances,
      shuffle_special_dungeon_entrances: shuffleSpecialDungeonEntrances,
      shuffle_dungeon_entrances: shuffleDungeonEntrances,
      entrance_shuffle: entranceShuffle,
      ensure_tod_access: ensureTodAccess,
      disable_trade_revert: disable_trade_revert,
      triforce_goal: triforceGoal,
    };
  }

  static _recalculateAccessibleRegions(rootRegion, age) {
    let regionsToCheck = [];

    _.forEach(Locations.exits[rootRegion], (exitRule, exitName) => {
      if (!_.includes(this.regions[age], exitName)) {
        if (this._evalNode(exitRule, age)) {
          this.regions[age] = _.union(this.regions[age], [exitName]);
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
        return _.includes(this.regions["child"], regionName);
      case "adult":
        return _.includes(this.regions["adult"], regionName);
      default:
        throw Error(`Invalid age ${age}`);
    }
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

  static _evalBinaryExpression(node) {
    const leftSide = _.isEqual(node.left.type, "Identifier") ? node.left.name : node.left.value;
    const rightSide = _.isEqual(node.right.type, "Identifier") ? node.right.name : node.right.value;

    switch (node.operator) {
      case "==":
        if (_.includes(_.keys(this.settings), leftSide)) {
          return _.isEqual(this.settings[leftSide], rightSide);
        } else if (_.isEqual(leftSide, "age") && _.isEqual(rightSide, "starting_age")) {
          return true; //TODO: don't hardcode this
        }
        break;
      case "!=":
        if (_.includes(_.keys(this.settings), leftSide)) {
          return !_.isEqual(this.settings[leftSide], rightSide);
        }
        break;
      case "<":
        if (_.includes(_.keys(this.settings), leftSide)) {
          return this.settings[leftSide] < rightSide;
        }
        break;
      case "in":
        if (_.includes(_.keys(this.settings), rightSide)) {
          return _.includes(this.settings[rightSide], leftSide);
        } else {
          return false;
        }
    }

    throw Error(`Unable to eval BinaryExpression: ${leftSide} ${node.operator} ${rightSide}`);
  }

  static _evalCallExpression(node, age) {
    const arg = node.arguments[0].name;
    switch (node.callee.name) {
      case "at":
        // TODO: this is hardcoded for now
        return true;
      case "at_night":
        // TODO: this is hardcoded for now
        return true;
      case "can_play":
        return this._canPlay(arg);
      case "can_use":
        return this._canUse(arg, age);
      case "has_dungeon_rewards":
        return this._hasDungeonRewards(arg);
      case "has_hearts":
        return this._hasHearts(arg);
      case "has_medallions":
        return this._hasMedallions(arg);
      case "has_projectile":
        return this._hasProjectile(arg, age);
      case "has_stones":
        return this._hasStones(arg);
      case "here":
        return this._evalNode(node.arguments[0], age);
      // Hardcoded (TODO: don't hardcode this)
      case "region_has_shortcuts":
        return false;
      default:
        throw Error(`Unknown CallExpression: ${node.callee.name}`);
    }
  }

  static _evalIdentifier(name, age) {
    switch (name) {
      case "True":
        return true;
      case "had_night_start":
        return this._hadNightStart();
      case "has_bottle":
        return this._hasBottle();
      case "Big_Poe":
        return this._canAccessDrop("Big Poe");
      case "Bombchu_Drop":
        return this.isLocationAvailable("Market Bombchu Bowling Bombchus");
      case "Bottle_with_Big_Poe":
        return false; // TODO: not on tracker yet
      case "Deliver_Letter":
        return this.isLocationAvailable("Deliver Rutos Letter");
      case "Time_Travel":
        return this.isLocationAvailable("Master Sword Pedestal");

      case "is_child":
        return _.isEqual(age, "child");
      case "is_adult":
        return _.isEqual(age, "adult");
    }

    if (_.includes(_.keys(this.items), name)) {
      return this.items[name] > 0;
    }
    if (_.includes(_.keys(this.renamedAttributes), name)) {
      return this.renamedAttributes[name];
    }
    if (_.includes(_.keys(this.settings), name)) {
      return this.settings[name];
    }
    if (_.includes(_.keys(this.ruleAliases), name)) {
      return this._evalRuleAlias(name);
    }
    const escapedIdentifier = _.replace(name, /_/g, " ");
    if (_.includes(_.keys(Locations.events), escapedIdentifier)) {
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

    throw Error(`Unknown identifier: ${name}`);
  }

  static _evalLiteral(value) {
    if (_.includes(_.keys(Locations.dropLocations), value)) {
      return this._canAccessDrop(value);
    } else if (_.includes(_.keys(Locations.events), value)) {
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
    const itemCount = node.expressions[1].value;
    return this.items[itemName] >= itemCount;
  }

  static _evalUnaryExpression(node, age) {
    if (_.isEqual(node.operator, "!")) {
      return !this._evalNode(node.argument, age);
    }

    throw Error(`Unknown unary operator: ${node.operator}`);
  }

  static _canAccessDrop(dropName) {
    return _.some(Locations.dropLocations[dropName], locationData => {
      const parentRegion = locationData.parentRegion;
      const rule = locationData.rule;

      const asChild = this._isRegionAccessible(parentRegion, "child") && this._evalNode(rule, "child");
      const asAdult = this._isRegionAccessible(parentRegion, "adult") && this._evalNode(rule, "adult");

      return asChild || asAdult;
    });
  }

  static _canBuy(itemName, age) {
    const rules = [];

    if (_.includes(["Buy_Arrows_50", "Buy_Fish", "Buy_Goron_Tunic", "Buy_Bombchu_20", "Buy_Bombs_30"], itemName)) {
      rules.push("Progressive_Wallet");
    } else if (_.includes(["Buy_Zora_Tunic", "Buy_Blue_Fire"], itemName)) {
      rules.push("(Progressive_Wallet, 2)");
    }

    if (_.includes(["Buy_Zora_Tunic", "Buy_Blue_Fire"], itemName)) {
      rules.push("is_adult");
    }

    if (
      _.includes(
        [
          "Buy_Blue_Fire",
          "Buy_Blue_Potion",
          "Buy_Bottle_Bug",
          "Buy_Fish",
          "Buy_Green_Potion",
          "Buy_Poe",
          "Buy_Red_Potion_for_30_Rupees",
          "Buy_Red_Potion_for_40_Rupees",
          "Buy_Red_Potion_for_50_Rupees",
          "Buy_Fairy's_Spirit",
        ],
        itemName,
      )
    ) {
      rules.push("has_bottle");
    }

    if (_.includes(["Buy_Bombchu_10", "Buy_Bombchu_20", "Buy_Bombchu_5"], itemName)) {
      rules.push("found_bombchus");
    }

    if (_.isEmpty(rules)) {
      return true;
    } else {
      const combinedRule = _.join(rules, " and ");
      return this._evalNode(this.parseRule(combinedRule), age);
    }
  }

  static _canPlay(songName) {
    if (_.isEqual(songName, "Scarecrow_Song")) {
      return this.items.Ocarina > 0 && (this.settings.free_scarecrow || this.isLocationAvailable("Pierre"));
    } else {
      return this.items.Ocarina > 0 && this.items[songName] > 0;
    }
  }

  static _canUse(itemName, age) {
    if (_.isEqual(itemName, "Scarecrow")) {
      return this.items.Progressive_Hookshot > 0 && this._canPlay("Scarecrow_Song", age);
    }
    if (_.isEqual(itemName, "Distant_Scarecrow")) {
      return this.items.Progressive_Hookshot > 1 && this._canPlay("Scarecrow_Song", age);
    }

    const isChildItem = _.includes(["Slingshot", "Boomerang", "Kokiri_Sword", "Sticks", "Deku_Shield"], itemName);
    const isAdultItem = _.includes(
      [
        "Bow",
        "Megaton_Hammer",
        "Iron_Boots",
        "Hover_Boots",
        "Hookshot",
        "Longshot",
        "Silver_Gauntlets",
        "Golden_Gauntlets",
        "Goron_Tunic",
        "Zora_Tunic",
        "Mirror_Shield",
      ],
      itemName,
    );
    const isMagicItem = _.includes(["Dins_Fire", "Farores_Wind", "Nayrus_Love", "Lens_of_Truth"], itemName);
    const isMagicArrow =
      _.includes(["Fire_Arrows", "Light_Arrows"], itemName) ||
      (this.settings.blue_fire_arrows && _.isEqual(itemName, "Ice_Arrows"));

    if (_.isUndefined(age)) {
      (isChildItem && this._evalNode(this.parseRule(`${itemName}`), age)) ||
        (isAdultItem && this._evalNode(this.parseRule(`${itemName}`), age)) ||
        (isMagicItem && this._evalNode(this.parseRule(`${itemName} and Magic_Meter`), age)) ||
        (isMagicArrow && this._evalNode(this.parseRule(`${itemName} and Bow and Magic_Meter`), age));
    } else {
      return (
        (isChildItem && this._evalNode(this.parseRule(`is_child and ${itemName}`), age)) ||
        (isAdultItem && this._evalNode(this.parseRule(`is_adult and ${itemName}`), age)) ||
        (isMagicItem && this._evalNode(this.parseRule(`${itemName} and Magic_Meter`), age)) ||
        (isMagicArrow && this._evalNode(this.parseRule(`is_adult and ${itemName} and Bow and Magic_Meter`), age))
      );
    }
  }

  static _evalEvent(eventName) {
    // TOOD: hardcode adult trade to start at Prescription
    if (_.isEqual(eventName, "Broken Sword Access")) {
      return false;
    }

    return _.some(Locations.events[eventName], eventData => {
      const parentRegion = eventData.parentRegion;
      const rule = eventData.rule;

      const asChild = this._isRegionAccessible(parentRegion, "child") && this._evalNode(rule, "child");
      const asAdult = this._isRegionAccessible(parentRegion, "adult") && this._evalNode(rule, "adult");

      return asChild || asAdult;
    });
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

  static _hasDungeonRewards(count) {
    if (!_.includes(_.keys(this.settings), count)) {
      throw Error(`Bad argument to has_dungeon_rewards: ${count}`);
    }

    const dungeonRewardsCount = this.settings[count];
    return (
      _.sum([
        this.items.Kokiri_Emerald,
        this.items.Goron_Ruby,
        this.items.Zora_Sapphire,
        this.items.Forest_Medallion,
        this.items.Fire_Medallion,
        this.items.Water_Medallion,
        this.items.Spirit_Medallion,
        this.items.Shadow_Medallion,
        this.items.Light_Medallion,
      ]) >= dungeonRewardsCount
    );
  }

  static _hasHearts() {
    // TODO: not yet implemented
    return false;
  }

  static _hasMedallions(count) {
    if (!_.includes(_.keys(this.settings), count)) {
      throw Error(`Bad argument to has_medallions: ${count}`);
    }

    const medallionCount = this.settings[count];
    return (
      _.sum([
        this.items.Forest_Medallion,
        this.items.Fire_Medallion,
        this.items.Water_Medallion,
        this.items.Spirit_Medallion,
        this.items.Shadow_Medallion,
        this.items.Light_Medallion,
      ]) >= medallionCount
    );
  }

  static _hasProjectile(forAge, age) {
    const canChildProjectile = this.items.Slingshot > 0 || this.items.Boomerang > 0;
    const canAdultProjectile = this.items.Bow > 0 || this.items.Hookshot > 0;

    return (
      this._evalNode(this.parseRule("has_explosives"), age) ||
      (_.isEqual(forAge, "child") && canChildProjectile) ||
      (_.isEqual(forAge, "adult") && canAdultProjectile) ||
      (_.isEqual(forAge, "both") && canChildProjectile && canAdultProjectile) ||
      (_.isEqual(forAge, "either") && (canChildProjectile || canAdultProjectile))
    );
  }

  static _hasStones(count) {
    if (!_.includes(_.keys(this.settings), count)) {
      throw Error(`Bad argument to has_stones: ${count}`);
    }

    const stonesCount = this.settings[count];
    return _.sum([this.items.Kokiri_Emerald, this.items.Goron_Ruby, this.items.Zora_Sapphire]) >= stonesCount;
  }
}

export default LogicHelper;
