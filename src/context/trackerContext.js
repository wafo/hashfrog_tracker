import _ from "lodash";
import { createContext, useContext, useMemo, useReducer } from "react";
import DEFAULT_ITEMS from "../data/default-items.json";
import ITEMS_JSON from "../data/items.json";
import LogicHelper from "../utils/logic-helper";

const TrackerContext = createContext();

function parseItems(items_list) {
  const items = _.cloneDeep(DEFAULT_ITEMS);
  _.forEach(items_list, item => {
    if (item === "bc6099ef9091404e9b45aea12d4b6b65") items.Boomerang = 1;
    if (item === "2ac429aee9b5447e827a16e377fb6ce0") items.Lens_of_Truth = 1;
    if (item === "0baa96ca7e344c86a7086dd11e2d8a74") items.Megaton_Hammer = 1;
    if (item === "55f6bcc569c14f1293eb50fda76c812d") items.Bottle = 1;
    if (item === "a391497285c34d56b762ca84b1450d5d") items.Rutos_Letter = 1;
    if (item === "2e7752ec3fbc4c03b68c5621f853cad3") items.Magic_Bean = 10;
    // Skull_Mask: 1,
    // Spooky_Mask: 0,
    // Keaton_Mask: 0,
    // Bunny_Hood: 0,
    // Mask_of_Truth: 0,
    // Pocket_Egg: 0,
    // Pocket_Cucco: 0,
    // Odd_Mushroom: 0,
    // Odd_Potion: 0,
    // Poachers_Saw: 0,
    // Broken_Sword: 0,
    // Prescription: 0,
    // Eyeball_Frog: 0,
    // Eyedrops: 0,
    if (item === "3b07b8868e7a4e438b5c874a1f0ae677") items.Claim_Check = 1;
    if (item === "b29ac88a18d646ce82b8b2e4752f8b30") items.Kokiri_Sword = 1;
    // Giants_Knife: 0,
    if (item === "06c4c254730149bd93bdd297f1a3b309") items.Deku_Shield = 1;
    if (item === "b4de2eabed4f40cea8661971a17d996e") items.Hylian_Shield = 1;
    if (item === "e0079e25283148f9a20fd43bf34d1f97") items.Mirror_Shield = 1;
    if (item === "cd6a55f0253f45159521efb2b3b515e8") items.Goron_Tunic = 1;
    if (item === "c562c7418d7141ffb70101509a52873e") items.Zora_Tunic = 1;
    if (item === "bad09131f88a440093087e11efc1c8b0") items.Iron_Boots = 1;
    if (item === "33f4bc4c632846bea5fb88573f2f95b2") items.Hover_Boots = 1;
    // Stone_of_Agony: 0,
    if (item === "7373656ec94f430f8fbf971e53930949") items.Gerudo_Membership_Card = 1;
    // Weird_Egg: 0,
    if (item === "5196e02aafac4b39b12ff1dc7bd5cb1c") items.Biggoron_Sword = 1;
    if (item === "7c3026558a6b49df97733d13ecc815c7") items.Fire_Arrows = 1;
    // Ice_Arrows: 0,
    if (item === "ff67e2e04ce04aa8add77658ee932802") items.Light_Arrows = 1;
    // Gold_Skulltula_Token: 0,
    if (item === "591d582f479140759fd6501caa23c2f9") items.Dins_Fire = 1;
    // Nayrus_Love: 0,
    if (item === "0c3e8979165042f686357b4bcbaab8ec") items.Farores_Wind = 1;
    if (item === "29e0384c520a4e7dad505b48a2156097") items.Progressive_Hookshot = 1;
    if (item === "1c9d61dc0b974a55a17120c81dcfb71b") items.Progressive_Hookshot = 2;
    if (item === "5c3d12eba0814d87a362202d03ffcdeb") items.Progressive_Strength_Upgrade = 1;
    if (item === "0ff0a90a20d54a42b4fa4721c63d357c") items.Progressive_Strength_Upgrade = 2;
    if (item === "e965d22b67474d6a9072c75ddcc50aed") items.Progressive_Strength_Upgrade = 3;
    if (item === "2fcfafe04ec24a9cb3c2d03c2aa047aa") items.Bomb_Bag = 1;
    if (item === "8633e18f860e4eccb821800eeec01c29") items.Bow = 1;
    if (item === "f6eff46730cf46098deddab9d99d7677") items.Slingshot = 1;
    if (item === "8bfe80d648134ed9985c6f390bcd48ce") items.Progressive_Wallet = 1;
    if (item === "5d029979a4ce402ba09042e0fda97c82") items.Progressive_Wallet = 2;
    if (item === "cd8c1df30f28430aa622e6abfed3b527") items.Progressive_Scale = 1;
    if (item === "5fe58641b313493ea21ffb20bca6cd66") items.Progressive_Scale = 2;
    if (item === "73a0f3f5688745a8bb4a0973d9858960") items.Deku_Nut_Capacity = 1;
    if (item === "34b2ad3657e94b75b281cec30e617f37") items.Deku_Stick_Capacity = 1;
    if (item === "22512dafa587497f98cd7135903b09c9") {
      items.Bombchus_10 = 1;
      items.Bombchus_5 = 1;
      items.Bombchus_20 = 1;
      items.Bombchus = 1;
    }
    if (item === "10498d96274048598706264078789899") items.Magic_Meter = 1;
    if (item === "29cddaecf35a49dfb6f80682f69b5df9") items.Magic_Meter = 2;
    // Ocarina: 1,
    // Double_Defense: 0,
    // Zeldas_Letter: 0,

    if (item === "ce1f2799ff1a433ba0bb40fee47e49a1") items.Minuet_of_Forest = 1;
    if (item === "e4769601bde54324a97704d29ca7f9b3") items.Bolero_of_Fire = 1;
    if (item === "daf9dc01414741aa9549f719abbabd54") items.Serenade_of_Water = 1;
    if (item === "063dcc22e4f7422b80d7a4679be65db3") items.Requiem_of_Spirit = 1;
    if (item === "8091c91b7f244e16a8f8a1bca80194b1") items.Nocturne_of_Shadow = 1;
    if (item === "c7244845fa1642a8bd8dd2a4291ddad6") items.Prelude_of_Light = 1;
    if (item === "2801c2b994864757a2363fbb053076db") items.Zeldas_Lullaby = 1;
    if (item === "96ebae804a3143438c2cfbc7680c464f") items.Eponas_Song = 1;
    if (item === "4fd7fcb8249744d9ba7f0d951df061bf") items.Sarias_Song = 1;
    if (item === "4cc5a64c593c4e6b8b0ecc8d3dae3230") items.Suns_Song = 1;
    if (item === "60671fe069e54ae38e763652bd7d9d97") items.Song_of_Time = 1;
    if (item === "c2b35441c0604a9dbd0d63c9cd6755d9") items.Song_of_Storms = 1;

    if (item === "cc6b276898a04ec7888e0887ca22db9c") items.Kokiri_Emerald = 1;
    if (item === "a503af4ff2bb4198abe10d2843dab433") items.Goron_Ruby = 1;
    if (item === "15d079b7d8714b79ab637d2b71418d54") items.Zora_Sapphire = 1;
    if (item === "2c592d344777457f87c1507845864418") items.Forest_Medallion = 1;
    if (item === "880f118d9f80482cb5e3a5091917d965") items.Fire_Medallion = 1;
    if (item === "4e77495743cd44919d4c06061536b445") items.Water_Medallion = 1;
    if (item === "099497c5610a43659bd2d31aee5d7250") items.Spirit_Medallion = 1;
    if (item === "9e57725a38d344cfa2f5ebd41c953c71") items.Shadow_Medallion = 1;
    if (item === "c18df5764dd54f82802986fd102e42d7") items.Light_Medallion = 1;
  });

  return items;
}

function validateLocations(locations, parsedItems) {
  locations = _.cloneDeep(locations);
  if (!_.isEmpty(locations)) {
    LogicHelper.updateItems(parsedItems);
    _.forEach(_.values(locations), regionLocations => {
      _.forEach(regionLocations, (locationData, locationName) => {
        const isAvailable = LogicHelper.isLocationAvailable(locationName);
        _.set(locationData, "isAvailable", isAvailable);
      });
    });
  }
  return locations;
}

function getSettingsStringCache() {
  let string = localStorage.getItem("settings_string");
  if (!string) {
    // League S3
    string = "BACKDFQNALH2EAAJARUCSDEAAAEAJEAJ2L62AELTDDSAAAJJCAACABSAQAG2XL8U36HBLTCAYEBAEM2AA24NAS8AFAJCA";
  }
  return string;
}

function setSettingsStringCache(string) {
  localStorage.setItem("settings_string", string);
}

function reducer(state, action) {
  const { payload } = action;
  switch (action.type) {
    case "LOCATION_ADD": {
      const { locationName, regionName } = payload;

      const isAvailable = LogicHelper.isLocationAvailable(locationName);
      const isChecked = false;

      const locations = _.cloneDeep(state.locations);
      _.set(locations, [regionName, locationName], { isAvailable: isAvailable, isChecked: isChecked });

      return {
        ...state,
        locations,
      };
    }
    case "LOCATION_MARK": {
      const { locationName, regionName } = payload;

      // Finding check
      if (
        !_.includes(_.keys(state.locations), regionName) ||
        !_.includes(_.keys(state.locations[regionName]), locationName)
      ) {
        return state;
      }

      // Manipulating check
      const location = state.locations[regionName][locationName];
      location.isChecked = !location.isChecked;

      // Manipulating state
      const locations = _.cloneDeep(state.locations);
      _.set(locations, [regionName, locationName], location);

      return {
        ...state,
        locations,
      };
    }
    case "REGION_TOGGLE": {
      // payload = regionName
      const locations = _.cloneDeep(state.locations);
      const setTo = Object.entries(locations[payload]).every(([, value]) => value.isChecked);
      locations[payload] = Object.entries(locations[payload]).reduce((accumulator, [key, value]) => {
        accumulator[key] = {
          ...value,
          isChecked: !setTo,
        };
        return accumulator;
      }, {});

      return {
        ...state,
        locations,
      };
    }
    case "ITEMS_UPDATE_FROM_LOGIC": {
      // payload should be an array of strings with items, equipments and songs coming from the settings
      const items_list = payload.map(item => {
        return ITEMS_JSON[item];
      });
      const parsedItems = parseItems(items_list);

      // Validating checks based on items collected
      const locations = validateLocations(state.locations, parsedItems);

      return {
        ...state,
        items_list,
        items: parsedItems,
        locations,
      };
    }
    case "ITEM_MARK": {
      const { items, item } = payload;

      // Preping collecting items
      const items_list = [...state.items_list.filter(x => !items.includes(x))];
      if (item) items_list.push(item);
      const parsedItems = parseItems(items_list);

      // Validating checks based on items collected
      const locations = validateLocations(state.locations, parsedItems);

      return {
        ...state,
        items_list,
        items: parsedItems,
        locations,
      };
    }
    case "STRING_SET": {
      setSettingsStringCache(payload);
      return {
        ...state,
        settings_string: payload,
      };
    }
    default:
      throw new Error();
  }
}

function TrackerProvider(props) {
  const initialState = {
    locations: {},
    items: _.cloneDeep(DEFAULT_ITEMS),
    items_list: [],
    settings_string: getSettingsStringCache(),
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  // Implementar local storage?
  return <TrackerContext.Provider value={{ state, dispatch }} {...props} />;
}

const useTracker = () => useContext(TrackerContext);

const useChecks = () => {
  const {
    state: { locations, items },
  } = useTracker();

  return {
    locations,
    items,
  };
};

const useLocation = () => {
  const { dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      addLocation: (locationName, regionName, items) =>
        dispatch({ type: "LOCATION_ADD", payload: { locationName, regionName, items } }),
      markLocation: (locationName, regionName) =>
        dispatch({ type: "LOCATION_MARK", payload: { locationName, regionName } }),
      toggleRegion: regionName => dispatch({ type: "REGION_TOGGLE", payload: regionName }),
    }),
    [dispatch],
  );

  return [actions];
};

const useItems = items => {
  const { state, dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markItem: (items, item) => dispatch({ type: "ITEM_MARK", payload: { items, item } }),
      updateItemsFromLogic: items => dispatch({ type: "ITEMS_UPDATE_FROM_LOGIC", payload: items }),
    }),
    [dispatch],
  );

  return actions;
};

const useSettingsString = () => {
  const {
    state: { settings_string },
    dispatch,
  } = useTracker();

  const actions = useMemo(
    () => ({
      setString: string => dispatch({ type: "STRING_SET", payload: string }),
    }),
    [dispatch],
  );

  return { ...actions, settings_string };
};

export { TrackerProvider, useTracker, useChecks, useLocation, useItems, useSettingsString };
