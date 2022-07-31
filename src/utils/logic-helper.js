import { parse } from "acorn";
import _ from "lodash";

import Locations from "./locations";

import DEFAULT_SETTINGS from "../data/setting-presets/league-s3.json";

class LogicHelper {
  static initialize(logicHelpersFile) {
    this.rule_aliases = {};
    _.forEach(logicHelpersFile, (rule, alias) => {
      _.set(this.rule_aliases, alias, LogicHelper.parseRule(rule));
    });
    this.items = {};
    this.events = {};
    this.accessibleRegions = [];
  }

  static updateItems(newItems) {
    this.items = _.cloneDeep(newItems);

    this.accessibleRegions = [];
    if (!_.isUndefined(Locations.exits)) {
      LogicHelper._recalculateAccessibleRegions("Root");
    }
  }

  static _recalculateAccessibleRegions(rootRegion) {
    _.forEach(Locations.exits[rootRegion], (exitRule, exitName) => {
      if (_.includes(this.accessibleRegions, exitName)) {
        return;
      }
      if (LogicHelper._evalNode(exitRule)) {
        this.accessibleRegions.push(exitName);
        LogicHelper._recalculateAccessibleRegions(exitName);
      }
    });
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

  static isLocationAvailable(locationName) {
    const parentRegion = Locations.locations[locationName].parentRegion;
    const locatioNRule = Locations.locations[locationName].rule;
    return _.includes(this.accessibleRegions, parentRegion) && LogicHelper._evalNode(locatioNRule);
  }

  static _evalNode(node) {
    switch (node.type) {
      case "BinaryExpression":
        return LogicHelper._evalBinaryExpression(node);
      case "CallExpression":
        return LogicHelper._evalCallExpression(node);
      case "ExpressionStatement":
        return LogicHelper._evalNode(node.expression);
      case "Identifier":
        return LogicHelper._evalIdentifier(node);
      case "Literal":
        return LogicHelper._evalLiteral(node);
      case "LogicalExpression":
        return LogicHelper._evalLogicalExpression(node);
      case "SequenceExpression":
        return LogicHelper._evalSequenceExpression(node);
      case "UnaryExpression":
        return LogicHelper._evalUnaryExpression(node);
      default:
        throw Error(`Unknown AST node of type ${node.type}`);
    }
  }

  static _evalBinaryExpression(node) {
    const leftSide = _.isEqual(node.left.type, "Identifier") ? node.left.name : node.left.value;
    const rightSide = _.isEqual(node.right.type, "Identifier") ? node.right.name : node.right.value;

    // Hardcode open DoT (TODO: don't hardcode this)
    if (_.includes(["==", "!="], node.operator) && _.isEqual(leftSide, "age")) {
      return true;
    }

    switch (node.operator) {
      case "==":
        return _.includes(_.keys(DEFAULT_SETTINGS), leftSide) && _.isEqual(DEFAULT_SETTINGS[leftSide], rightSide);
      case "!=":
        return _.includes(_.keys(DEFAULT_SETTINGS), leftSide) && !_.isEqual(DEFAULT_SETTINGS[leftSide], rightSide);
      case "in":
        return _.includes(_.keys(DEFAULT_SETTINGS), rightSide) && _.includes(DEFAULT_SETTINGS[rightSide], leftSide);
      default:
        throw Error(`Unable to eval BinaryExpression: ${leftSide} ${node.operator} ${rightSide}`);
    }
  }

  static _evalCallExpression(node) {
    const arg = node.arguments[0].name;
    switch (node.callee.name) {
      case "at":
        // TODO: this is hardcoded for now
        return true;
      case "can_play":
        return LogicHelper._evalCanPlay(arg);
      case "can_use":
        return LogicHelper._evalCanUse(arg);
      case "has_medallions":
        return LogicHelper._evalHasMedallions(arg);
      case "has_projectile":
        return LogicHelper._evalHasProjectile(arg);
      // Hardcoded cases (TODO: don't hardcode these)
      case "here":
        return true;
      case "region_has_shortcuts":
        return false;
      default:
        throw Error(`Unknown CallExpression: ${node.callee.name}`);
    }
  }

  static _evalIdentifier(node) {
    if (_.isEqual(node.name, "True")) {
      return true;
    }
    if (_.startsWith(node.name, "logic_")) {
      return _.includes(DEFAULT_SETTINGS.allowed_tricks, node.name);
    }
    if (_.includes(_.keys(this.items), node.name)) {
      return this.items[node.name] > 0;
    }
    if (_.includes(_.keys(DEFAULT_SETTINGS), node.name)) {
      return DEFAULT_SETTINGS[node.name];
    }
    if (_.includes(_.keys(this.rule_aliases), node.name)) {
      return LogicHelper._evalNode(this.rule_aliases[node.name]);
    }
    if (_.includes(_.keys(Locations.events), _.replace(node.name, /_/g, " "))) {
      const escapedIdentifier = _.replace(node.name, /_/g, " ");
      return LogicHelper._evalEvent(escapedIdentifier);
    }

    switch (node.name) {
      case "disable_trade_revert":
        return (
          _.includes(["simple", "all"], DEFAULT_SETTINGS.shuffle_interior_entrances) ||
          DEFAULT_SETTINGS.shuffle_overworld_entrances
        );
      case "has_bottle":
        return this.items.Bottle > 0 || LogicHelper._canDeliverRutosLetter();
      case "Big_Poe":
        return LogicHelper._canKillBigPoe();
      case "Deliver_Letter":
        return LogicHelper._canDeliverRutosLetter();
    }

    // Some hardcoded special cases (TODO: don't hardcode these)
    // Can only buy Bombchus if you have bomb bag
    if (_.startsWith(node.name, "Buy_Bombchu") || _.startsWith(node.name, "Bombchu_Drop")) {
      return this.items.Bomb_Bag > 0;
    }
    // Can only buy Blue Fire with two wallet upgrades
    if (_.startsWith(node.name, "Buy_Blue_Fire")) {
      return this.items.Progressive_Wallet > 2;
    }
    // Assume can always let time of day pass
    if (_.startsWith(node.name, "at_")) {
      return true;
    }

    throw Error(`Unknown identifier: ${node.name}`);
  }

  static _evalLiteral(node) {
    const escapedLiteral = _.replace(node.value, /_/g, " ");
    if (_.includes(_.keys(Locations.events), escapedLiteral)) {
      return LogicHelper._evalEvent(escapedLiteral);
    }

    // Hardcode 'Blue Fire' literal (TODO: don't hardcode this)
    if (_.isEqual(node.value, "Blue Fire")) {
      return LogicHelper._canGetBlueFire();
    }

    throw Error(`Unknown Literal: ${node.value}`);
  }

  static _evalLogicalExpression(node) {
    switch (node.operator) {
      case "&&":
        return LogicHelper._evalNode(node.left) && LogicHelper._evalNode(node.right);
      case "||":
        return LogicHelper._evalNode(node.left) || LogicHelper._evalNode(node.right);
      default:
        throw Error(`Unknown logical operator: ${node.operator}`);
    }
  }

  static _evalSequenceExpression(node) {
    if (_.size(node.expressions) !== 2) {
      throw Error(`Unknown SequenceExpression of length ${_.size(node.expressions)}`);
    }

    const itemName = node.expressions[0].name;
    const itemCount = node.expressions[1].value;
    return this.items[itemName] >= itemCount;
  }

  static _evalUnaryExpression(node) {
    if (_.isEqual(node.operator, "!")) {
      return !LogicHelper._evalNode(node.argument);
    }

    throw Error(`Unknown unary operator: ${node.operator}`);
  }

  static _evalCanPlay(songName) {
    return this.items.Ocarina > 0 && this.items[songName] > 0;
  }

  static _evalCanUse(itemName) {
    if (_.isEqual(itemName, "Scarecrow")) {
      return this.items.Progressive_Hookshot > 0 && LogicHelper._evalCanPlay("Scarecrow_Song");
    }
    if (_.isEqual(itemName, "Distant_Scarecrow")) {
      return this.items.Progressive_Hookshot > 1 && LogicHelper._evalCanPlay("Scarecrow_Song");
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
      (DEFAULT_SETTINGS.blue_fire_arrows && _.isEqual(itemName, "Ice_Arrows"));

    return (
      (isChildItem && LogicHelper._evalNode(LogicHelper.parseRule(`is_child and ${itemName}`))) ||
      (isAdultItem && LogicHelper._evalNode(LogicHelper.parseRule(`is_adult and ${itemName}`))) ||
      (isMagicItem && this.items.Magic_Meter > 0) ||
      (isMagicArrow && this.items.Bow > 0 && this.items.Magic_Meter > 0)
    );
  }

  static _evalHasMedallions(count) {
    if (!_.includes(_.keys(DEFAULT_SETTINGS), count)) {
      throw Error(`Bad argument to has_medallions: ${count}`);
    }

    const medallionCount = DEFAULT_SETTINGS[count];
    return (
      _.sum([
        "Forest_Medallion",
        "Fire_Medallion",
        "Water_Medallion",
        "Spirit_Medallion",
        "Shadow_Medallion",
        "Light_Medallion",
      ]) >= medallionCount
    );
  }

  static _evalHasProjectile(forAge) {
    const canChildProjectile = this.items.Slingshot > 0 || this.items.Boomerang > 0;
    const canAdultProjectile = this.items.Bow > 0 || this.items.Hookshot > 0;

    return (
      LogicHelper._evalNode(LogicHelper.parseRule("has_explosives")) ||
      (_.isEqual(forAge, "child") && canChildProjectile) ||
      (_.isEqual(forAge, "adult") && canAdultProjectile) ||
      (_.isEqual(forAge, "both") && canChildProjectile && canAdultProjectile) ||
      (_.isEqual(forAge, "either") && (canChildProjectile || canAdultProjectile))
    );
  }

  static _evalEvent(eventName) {
    const rule = Locations.events[eventName].rule;
    return _.includes(this.accessibleRegions, Locations.events[eventName].parentRegion) && LogicHelper._evalNode(rule);
  }

  static _canGetBlueFire() {
    const iceCavernRule = LogicHelper.parseRule("is_adult and has_bottle");
    const ganonsCastleRule = LogicHelper.parseRule(
      "has_bottle and (is_adult or (is_child and (Sticks or Kokiri_Sword or has_explosives)))",
    );
    return (
      (_.includes(this.accessibleRegions, "Ice Cavern") && LogicHelper._evalNode(iceCavernRule)) ||
      (_.includes(this.accessibleRegions, "Ganons Castle Water Trial") && LogicHelper._evalNode(ganonsCastleRule))
    );
  }

  static _canDeliverRutosLetter() {
    const rule = LogicHelper.parseRule("(is_child and Rutos_Letter) and zora_fountain != 'open'");
    return _.includes(this.accessibleRegions, "Zoras Domain") && LogicHelper._evalNode(rule);
  }

  static _canKillBigPoe() {
    const rule = LogicHelper.parseRule("can_use(Bow) and can_ride_epona and has_bottle");
    return _.includes(this.accessibleRegions, "Hyrule Field") && LogicHelper._evalNode(rule);
  }
}

export default LogicHelper;
