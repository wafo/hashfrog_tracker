class SettingsHelper {
  static defaults = {};
  static transformations = [];
  static settings = null;
  static renamedAttributes = null;

  static initialize(bundle) {
    this.defaults = bundle.settingsDefaults || {};
    this.transformations = bundle.settingsTransformations || [];
  }

  static reset() {
    this.defaults = {};
    this.transformations = [];
    this.settings = null;
    this.renamedAttributes = null;
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
  }

  static setRenamedAttributes(renamedAttributes) {
    this.renamedAttributes = renamedAttributes;
  }
}

export default SettingsHelper;
