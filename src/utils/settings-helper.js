class SettingsHelper {
  static defaults = {};
  static transformations = [];
  static settings = null;
  static renamedAttributes = null;

  static _mqDungeonsSet = null;
  static _dungeonShortcutsSet = null;
  static _allowedTricksSet = null;
  static _advancedAllowedTricksSet = null;
  static _adultTradeStartSet = null;
  static _shuffleChildTradeSet = null;
  static _disabledLocationsSet = null;

  static initialize(bundle) {
    this.defaults = bundle.settingsDefaults || {};
    this.transformations = bundle.settingsTransformations || [];
  }

  static reset() {
    this.defaults = {};
    this.transformations = [];
    this.settings = null;
    this.renamedAttributes = null;

    this._mqDungeonsSet = null;
    this._dungeonShortcutsSet = null;
    this._allowedTricksSet = null;
    this._advancedAllowedTricksSet = null;
    this._adultTradeStartSet = null;
    this._shuffleChildTradeSet = null;
    this._disabledLocationsSet = null;
  }

  static _updateCachedSets() {
    const mqDungeons = this.settings?.mq_dungeons_specific || this.defaults.mq_dungeons_specific || [];
    this._mqDungeonsSet = new Set(mqDungeons);

    const dungeonShortcuts = this.settings?.dungeon_shortcuts || this.defaults.dungeon_shortcuts || [];
    this._dungeonShortcutsSet = new Set(dungeonShortcuts);

    const allowedTricks = this.settings?.allowed_tricks || this.defaults.allowed_tricks || [];
    this._allowedTricksSet = new Set(allowedTricks);

    const advancedAllowedTricks = this.settings?.advanced_allowed_tricks || this.defaults.advanced_allowed_tricks || [];
    this._advancedAllowedTricksSet = new Set(advancedAllowedTricks);

    const adultTradeStart = this.settings?.adult_trade_start || this.defaults.adult_trade_start || [];
    this._adultTradeStartSet = new Set(adultTradeStart);

    const shuffleChildTrade = this.settings?.shuffle_child_trade || this.defaults.shuffle_child_trade || [];
    this._shuffleChildTradeSet = new Set(shuffleChildTrade);

    const disabledLocations = this.settings?.disabled_locations || this.defaults.disabled_locations || [];
    this._disabledLocationsSet = new Set(disabledLocations);
  }

  static invalidateCachedSets() {
    this._updateCachedSets();
  }

  static getRenamedAttribute(name, defaultValue = false) {
    return this.renamedAttributes?.[name] ?? defaultValue;
  }

  static getSetting(name) {
    if (this.settings && name in this.settings) {
      return this.settings[name];
    }
    return this.defaults[name];
  }

  static hasAdultTradeStart(itemName) {
    if (!this._adultTradeStartSet) {
      this._updateCachedSets();
    }
    return this._adultTradeStartSet.has(itemName);
  }

  static hasDungeonShortcut(regionName) {
    if (!this._dungeonShortcutsSet) {
      this._updateCachedSets();
    }
    return this._dungeonShortcutsSet.has(regionName);
  }

  static hasShuffleChildTrade(itemName) {
    if (!this._shuffleChildTradeSet) {
      this._updateCachedSets();
    }
    return this._shuffleChildTradeSet.has(itemName);
  }

  static isAdvancedAllowedTrick(trickName) {
    if (!this._advancedAllowedTricksSet) {
      this._updateCachedSets();
    }
    return this._advancedAllowedTricksSet.has(trickName);
  }

  static isAllowedTrick(trickName) {
    if (!this._allowedTricksSet) {
      this._updateCachedSets();
    }
    return this._allowedTricksSet.has(trickName);
  }

  static isDisabledLocation(locationName) {
    if (!this._disabledLocationsSet) {
      this._updateCachedSets();
    }
    return this._disabledLocationsSet.has(locationName);
  }

  static isMQDungeon(dungeonName) {
    if (!this._mqDungeonsSet) {
      this._updateCachedSets();
    }
    return this._mqDungeonsSet.has(dungeonName);
  }

  static _evaluateConversion(convert, oldValue) {
    if (typeof convert === "object") {
      return convert[String(oldValue)] ?? oldValue;
    }

    if (typeof convert === "string" && convert.includes("?")) {
      const match = convert.match(/oldValue\s*\?\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/);
      if (match) {
        return oldValue ? match[1] : match[2];
      }
    }

    return oldValue;
  }

  static _applyTransformations(settings) {
    const result = { ...settings };

    for (const transform of this.transformations) {
      // Only apply if old field exists and new field doesn't
      if (transform.from in result && !(transform.to in result)) {
        const oldValue = result[transform.from];

        if (transform.convert) {
          // Apply the conversion
          result[transform.to] = this._evaluateConversion(transform.convert, oldValue);
        } else {
          result[transform.to] = oldValue;
        }

        delete result[transform.from];
      }
    }

    return result;
  }

  static setSettings(settings) {
    // Apply transformations to convert old field names to current ones
    const transformed = this._applyTransformations(settings);

    // Merge with defaults so missing fields have values
    this.settings = { ...this.defaults, ...transformed };

    // Update cached Sets
    this._updateCachedSets();
  }

  static setRenamedAttributes(renamedAttributes) {
    this.renamedAttributes = renamedAttributes;
  }
}

export default SettingsHelper;
