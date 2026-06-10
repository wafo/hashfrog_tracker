import LogicHelpers from "./LogicHelpers.json";
import SettingsDefaults from "./settings-defaults.json";
import SettingsTransformations from "./settings-transformations.json";
import Bosses from "./Bosses.json";
import Overworld from "./Overworld.json";
import DekuTree from "./Deku Tree.json";
import DekuTreeMQ from "./Deku Tree MQ.json";
import DodongosCavern from "./Dodongos Cavern.json";
import DodongosCavernMQ from "./Dodongos Cavern MQ.json";
import JabuJabusBelly from "./Jabu Jabus Belly.json";
import JabuJabusBellyMQ from "./Jabu Jabus Belly MQ.json";
import ForestTemple from "./Forest Temple.json";
import ForestTempleMQ from "./Forest Temple MQ.json";
import FireTemple from "./Fire Temple.json";
import FireTempleMQ from "./Fire Temple MQ.json";
import WaterTemple from "./Water Temple.json";
import WaterTempleMQ from "./Water Temple MQ.json";
import ShadowTemple from "./Shadow Temple.json";
import ShadowTempleMQ from "./Shadow Temple MQ.json";
import SpiritTemple from "./Spirit Temple.json";
import SpiritTempleMQ from "./Spirit Temple MQ.json";
import GanonsCastle from "./Ganons Castle.json";
import GanonsCastleMQ from "./Ganons Castle MQ.json";
import BottomOfTheWell from "./Bottom of the Well.json";
import BottomOfTheWellMQ from "./Bottom of the Well MQ.json";
import IceCavern from "./Ice Cavern.json";
import IceCavernMQ from "./Ice Cavern MQ.json";
import GerudoTrainingGround from "./Gerudo Training Ground.json";
import GerudoTrainingGroundMQ from "./Gerudo Training Ground MQ.json";

export default {
  logicHelpersFile: LogicHelpers,
  settingsDefaults: SettingsDefaults,
  settingsTransformations: SettingsTransformations,
  bossesFile: Bosses,
  overworldFile: Overworld,
  dungeonFiles: {
    "Deku Tree": DekuTree,
    "Dodongos Cavern": DodongosCavern,
    "Jabu Jabus Belly": JabuJabusBelly,
    "Forest Temple": ForestTemple,
    "Fire Temple": FireTemple,
    "Water Temple": WaterTemple,
    "Shadow Temple": ShadowTemple,
    "Spirit Temple": SpiritTemple,
    "Ganons Castle": GanonsCastle,
    "Bottom of the Well": BottomOfTheWell,
    "Ice Cavern": IceCavern,
    "Gerudo Training Ground": GerudoTrainingGround,
  },
  dungeonMQFiles: {
    "Deku Tree MQ": DekuTreeMQ,
    "Dodongos Cavern MQ": DodongosCavernMQ,
    "Jabu Jabus Belly MQ": JabuJabusBellyMQ,
    "Forest Temple MQ": ForestTempleMQ,
    "Fire Temple MQ": FireTempleMQ,
    "Water Temple MQ": WaterTempleMQ,
    "Shadow Temple MQ": ShadowTempleMQ,
    "Spirit Temple MQ": SpiritTempleMQ,
    "Ganons Castle MQ": GanonsCastleMQ,
    "Bottom of the Well MQ": BottomOfTheWellMQ,
    "Ice Cavern MQ": IceCavernMQ,
    "Gerudo Training Ground MQ": GerudoTrainingGroundMQ,
  },
};
