import { useContext, useReducer, createContext, useMemo } from "react";
import locationsJSON from "../data/locations.json";
import checksJSON from "../data/checks.json";

const defaultItems = {
  // Songs
  zelda: false,
  epona: false,
  sarias: false,
  sunsong: false,
  storms: false,
  minuet: false,
  bolero: false,
  requiem: false,
  // Items
  sticks: false,
  bombs: false,
  bombchus: false,
  bow: false,
  fire_arrows: false,
  slingshot: false,
  hammer: false,
  hookshot: false,
  longshot: false,
  boomerang: false,
  lens: false,
  beans: false,
  dins: false,
  bottle: false,
  claim_check: false,
  rutos_letter: false,
  // Equipment
  magic: false,
  wallet_1: false,
  wallet_2: false,
  scale: false,
  gold_scale: false,
  gerudo_card: false,
  iron_boots: false,
  hover_boots: false,
  strength_1: false,
  strength_2: false,
  strength_3: false,
  // Medallions
  medallion_green: false,
  medallion_red: false,
  medallion_blue: false,
  medallion_purple: false,
  medallion_orange: false,
  // Extra
  scarecrow: true,
  fire_source: true,
  dmc_entrance: false,
  domain_child_access: false,
  domain_adult_access: false,
  fountain_child_access: false,
  fountain_adult_access: false,
  fortress_access: false,
  wasteland_access: false,
  colossus_access: false,
};

const TrackerContext = createContext();

function parseItems(items_list) {
  const items = { ...defaultItems };
  items_list.forEach((item) => {
    // Songs
    if (item === "2801c2b994864757a2363fbb053076db") items.zelda = true;
    if (item === "96ebae804a3143438c2cfbc7680c464f") items.epona = true;
    if (item === "4fd7fcb8249744d9ba7f0d951df061bf") items.sarias = true;
    if (item === "4cc5a64c593c4e6b8b0ecc8d3dae3230") items.sunsong = true;
    if (item === "60671fe069e54ae38e763652bd7d9d97") items.time = true;
    if (item === "c2b35441c0604a9dbd0d63c9cd6755d9") items.storms = true;
    if (item === "ce1f2799ff1a433ba0bb40fee47e49a1") items.minuet = true;
    if (item === "e4769601bde54324a97704d29ca7f9b3") items.bolero = true;
    if (item === "063dcc22e4f7422b80d7a4679be65db3") items.requiem = true;
    // Items
    if (item === "34b2ad3657e94b75b281cec30e617f37") items.sticks = true;
    if (item === "2fcfafe04ec24a9cb3c2d03c2aa047aa") items.bombs = true;
    if (item === "22512dafa587497f98cd7135903b09c9") items.bombchus = true;
    if (item === "8633e18f860e4eccb821800eeec01c29") items.bow = true;
    if (item === "7c3026558a6b49df97733d13ecc815c7") items.fire_arrows = true;
    if (item === "f6eff46730cf46098deddab9d99d7677") items.slingshot = true;
    if (item === "0baa96ca7e344c86a7086dd11e2d8a74") items.hammer = true;
    if (item === "29e0384c520a4e7dad505b48a2156097") items.hookshot = true;
    if (item === "1c9d61dc0b974a55a17120c81dcfb71b") {
      items.hookshot = true;
      items.longshot = true;
    }
    if (item === "bc6099ef9091404e9b45aea12d4b6b65") items.boomerang = true;
    if (item === "2ac429aee9b5447e827a16e377fb6ce0") items.lens = true;
    if (item === "2e7752ec3fbc4c03b68c5621f853cad3") items.beans = true;
    if (item === "3b07b8868e7a4e438b5c874a1f0ae677") items.claim_check = true;
    if (item === "a391497285c34d56b762ca84b1450d5d") items.rutos_letter = true;
    if (item === "591d582f479140759fd6501caa23c2f9") items.dins = true;
    // Equipment
    if (item === "cd8c1df30f28430aa622e6abfed3b527") items.scale = true;
    if (item === "5fe58641b313493ea21ffb20bca6cd66") {
      items.scale = true;
      items.gold_scale = true;
    }
    if (item === "7373656ec94f430f8fbf971e53930949") items.gerudo_card = true;
    if (item === "10498d96274048598706264078789899") items.magic = true;
    if (item === "29cddaecf35a49dfb6f80682f69b5df9") items.magic = true;
    if (item === "8bfe80d648134ed9985c6f390bcd48ce") items.wallet_1 = true;
    if (item === "5d029979a4ce402ba09042e0fda97c82") {
      items.wallet_1 = true;
      items.wallet_2 = true;
    }
    if (item === "bad09131f88a440093087e11efc1c8b0") items.iron_boots = true;
    if (item === "33f4bc4c632846bea5fb88573f2f95b2") items.hover_boots = true;
    if (item === "5c3d12eba0814d87a362202d03ffcdeb") items.strength_1 = true;
    if (item === "0ff0a90a20d54a42b4fa4721c63d357c") {
      items.strength_1 = true;
      items.strength_2 = true;
    }
    if (item === "e965d22b67474d6a9072c75ddcc50aed") {
      items.strength_1 = true;
      items.strength_2 = true;
      items.strength_3 = true;
    }
    // Medallions
    if (item === "2c592d344777457f87c1507845864418")
      items.medallion_green = true;
    if (item === "880f118d9f80482cb5e3a5091917d965") items.medallion_red = true;
    if (item === "4e77495743cd44919d4c06061536b445")
      items.medallion_blue = true;
    if (item === "099497c5610a43659bd2d31aee5d7250")
      items.medallion_purple = true;
    if (item === "9e57725a38d344cfa2f5ebd41c953c71")
      items.medallion_orange = true;
  });

  // Extra
  if (
    items.bombs ||
    items.bow ||
    items.strength_1 ||
    (items.bolero && (items.hover_boots || items.hookshot))
  ) {
    items.dmc_entrance = true;
  }
  if (items.bombs || items.scale) {
    items.beans = true;
  }
  if (items.zelda || items.scale) {
    items.domain_child_access = true;
  }
  if (items.zelda || items.hover_boots) {
    items.domain_adult_access = true;
  }
  if (items.domain_child_access && items.rutos_letter) {
    items.fountain_child_access = true;
  }
  if (items.domain_child_access && items.rutos_letter && items.domain_adult_access) {
    items.fountain_adult_access = true;
  }
  if (items.epona || items.longshot) {
    items.fortress_access = true;
  }
  if (items.fortress_access && (items.hover_boots || items.longshot)) {
    items.wasteland_access = true;
  }
  if ((items.wasteland_access && items.magic && items.lens) || items.requiem) {
    items.colossus_access = true;
  }
  if (items.magic && (items.dins || (items.bow && items.fire_arrows))) {
    items.fire_source = true;
  }

  return items;
}

const initialState = {
  checks: [...checksJSON],
  locations: [...locationsJSON],
  items: { ...defaultItems },
  items_list: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "CHECK_MARK": {
      // Finding check
      const checkIndex = state.checks.findIndex((x) => x.id === action.payload);
      if (checkIndex === -1) return state;
      // Manipulating check
      const check = { ...state.checks[checkIndex] };
      check.checked = !check.checked;
      // Manipulating state
      const checks = [...state.checks];
      checks[checkIndex] = { ...check };

      return {
        ...state,
        checks,
      };
    }
    case "ITEM_MARK": {
      const { items, item } = action.payload;
      // Preping collecting items
      const items_list = [
        ...state.items_list.filter((x) => !items.includes(x)),
      ];
      if (item) items_list.push(item);
      const parsedItems = parseItems(items_list);
      // Validating checks based on items collected
      let checks = [...state.checks];
      checks = checks.map(check => {
        if (check.condition) {
          check.available = new Function("return " + check.condition)()(parsedItems);
        }
        return check;
      });

      return {
        ...state,
        items_list,
        items: parsedItems,
        checks,
      };
    }
    default:
      throw new Error();
  }
}

function TrackerProvider(props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Implementar local storage?
  return <TrackerContext.Provider value={{ state, dispatch }} {...props} />;
}

const useTracker = () => useContext(TrackerContext);

const useChecks = () => {
  const {
    state: { checks, locations, items },
  } = useTracker();

  return {
    checks,
    locations,
    items,
  };
};

const useCheck = () => {
  const { dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markCheck: (id) => dispatch({ type: "CHECK_MARK", payload: id }),
    }),
    [dispatch]
  );

  return [actions];
};

const useItem = () => {
  const { dispatch } = useTracker();

  const actions = useMemo(
    () => ({
      markItem: (items, item) =>
        dispatch({ type: "ITEM_MARK", payload: { items, item } }),
    }),
    [dispatch]
  );

  return actions;
};

export { TrackerProvider, useTracker, useChecks, useCheck, useItem };
