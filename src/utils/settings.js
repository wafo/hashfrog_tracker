import _ from "lodash";

import SETTINGS_INFOS from "../data/setting-infos.json";

class Settings {
  static getSettingsFromString(text) {
    const settings = {};

    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let bits = [];
    _.forEach(text, c => {
      const index = _.indexOf(letters, c);
      for (let i = 0; i < 5; i++) {
        bits.push((index >> i) & 1);
      }
    });

    _.forEach(SETTINGS_INFOS, setting => {
      let curBits = _.slice(bits, 0, setting.bitwidth);
      bits = _.slice(bits, setting.bitwidth);

      let value = 0;
      switch (setting.type) {
        case "bool":
          value = curBits[0] == 1 ? true : false;
          break;
        case "str": {
          let index = 0;
          for (let b = 0; b < setting.bitwidth; b++) {
            index |= curBits[b] << b;
          }
          value = setting.choice_list[index];
          break;
        }
        case "int":
          for (let b = 0; b < setting.bitwidth; b++) {
            value |= curBits[b] << b;
          }
          value = value * setting.gui_params.step;
          value = value + setting.gui_params.min;
          break;
        case "list": {
          value = [];
          const maxIndex = (1 << setting.bitwidth) - 1;

          /* eslint-disable no-constant-condition */
          while (true) {
            let index = 0;
            for (let b = 0; b < setting.bitwidth; b++) {
              index |= curBits[b] << b;
            }

            if (index === 0) {
              break;
            }
            if (index === maxIndex) {
              const oldValue = value;
              value = [];

              _.forEach(setting.choice_list, item => {
                if (!_.includes(oldValue, item)) {
                  value.push(item);
                }
              });
              break;
            }

            value.push(setting.choice_list[index - 1]);
            curBits = _.slice(bits, 0, setting.bitwidth);
            bits = _.slice(bits, setting.bitwidth);
          }
          break;
        }
        default:
          throw Error(`Cannot decode type ${setting.type} from settings string`);
      }

      _.set(settings, setting.name, value);
    });

    return settings;
  }
}

export default Settings;
