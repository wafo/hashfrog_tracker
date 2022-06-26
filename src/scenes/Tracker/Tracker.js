import { useMemo } from "react";
import Footer from "../../components/Footer";
import Item from "../../components/Item";
import ItemsTable from "../../components/ItemsTable";
import LocationHint from "../../components/LocationHint";
import SometimesHint from "../../components/SometimesHint";
import items from "../../data/items.json";
import labels from "../../data/labels.json";
import styles from "./tracker.module.css";

// TODO: All of this should come from a .json config file
// Or maybe a context stored in local storage

const Tracker = () => {
  const section_1 = useMemo(() => {
    const section_items = [
      "sticks",
      "nuts",
      "bombs",
      "bow",
      "fl_arrows",
      "rutos_letter",
      "bottle_counter",
      "slingshot",
      "hammer",
      "bombchus",
      "hookshot",
      "dins",
      "trade_1",
      "trade_2",
      "boomerang",
      "lens",
      "beans",
      "magic",
      "farores",
      "wallet",
      "gerudo_card",
    ];
    return section_items.map((name) =>
      items.find((item) => item.name === name)
    );
  }, []);

  const section_2 = useMemo(() => {
    const section_items = [
      "kokiri_sword",
      "master_sword",
      "biggoron_sword",
      "deku_shield",
      "hylian_shield",
      "mirror_shield",
      "tunic_goron",
      "tunic_zora",
      "strength",
      "boots_iron",
      "boots_hover",
      "scale",
    ];
    return section_items.map((name) =>
      items.find((item) => item.name === name)
    );
  }, []);

  const dungeons = useMemo(() => {
    const section_items = [
      "stone_kokiri",
      "stone_goron",
      "stone_zora",
      "medallion_yellow",
      "medallion_green",
      "medallion_red",
      "medallion_blue",
      "medallion_purple",
      "medallion_orange",
    ];
    return section_items.map((name) => {
      const item = items.find((item) => item.name === name);
      // TODO: Para dejarlo como recordatorio que estaría bien los labels vinieran de otra parte ((?))
      item.label = labels.dungeons;
      item.labelStartingIndex = 3;
      return item;
    });
  }, []);

  const songs = useMemo(() => {
    const section_items = [
      "song_lullaby",
      "song_epona",
      "song_saria",
      "song_suns",
      "song_time",
      "song_storms",
      "song_minuet",
      "song_bolero",
      "song_serenade",
      "song_nocturne",
      "song_requiem",
      "song_prelude",
    ];
    return section_items.map((name) =>
      items.find((item) => item.name === name)
    );
  }, []);

  const keys = useMemo(() => {
    const section_items = [
      "keys_forest",
      "keys_fire",
      "keys_water",
      "keys_shadow",
      "keys_spirit",
      "keys_botw",
      "keys_gtg",
    ];
    return section_items.map((name) =>
      items.find((item) => item.name === name)
    );
  }, []);

  const sometimesIcons = useMemo(() => {
    return items.find((item) => item.name === "sometimes").icons;
  }, []);

  const alwaysHints = useMemo(() => {
    const section_items = [
      "gs_30",
      "sometimes",
      "skull_mask",
      "sometimes",
      "gs_40",
      "sometimes",
      "biggoron",
      "sometimes",
      "gs_50",
      "sometimes",
      "frogs",
      "sometimes",
    ];
    return section_items.map((name) => {
      const item = items.find((item) => item.name === name);
      item.size = [20, 20];
      return item;
    });
  }, []);

  const gold_skulls = useMemo(() => {
    return items.find((item) => item.name === "gold_skulls");
  }, []);

  return (
    <div className={styles.tracker}>
      <div className={styles.items}>
        <ItemsTable items={section_2} columns={3} padding={2} />
        <ItemsTable items={section_1} columns={7} padding={2} />
      </div>
      <div className={styles.medallions}>
        <ItemsTable items={dungeons} columns={9} padding={4} />
      </div>
      <div className={styles.songs}>
        <ItemsTable items={songs} columns={6} padding={2} />
        <ItemsTable items={keys} columns={4} padding={1} />
      </div>
      <div className={styles.sometimes}>
        <div>
          <SometimesHint icons={sometimesIcons} />
          <SometimesHint icons={sometimesIcons} />
          <SometimesHint icons={sometimesIcons} />
          <SometimesHint icons={sometimesIcons} />
          <SometimesHint icons={sometimesIcons} />
        </div>
        <div className={styles.always}>
          <ItemsTable items={alwaysHints} columns={4} padding={2} />
          <Item
            type={gold_skulls.type}
            name={gold_skulls.name}
            label={gold_skulls.label}
            size={gold_skulls.size}
            icons={gold_skulls.icons}
            countConfig={gold_skulls.countConfig}
          />
        </div>
      </div>
      <div className={styles.locations}>
        <LocationHint backgroundColor="#4a8ab6" color="#fff" margin="2px 0" />
        <LocationHint backgroundColor="#4a8ab6" color="#fff" margin="2px 0" />
        <LocationHint backgroundColor="#4a8ab6" color="#fff" margin="2px 0" />
        <LocationHint backgroundColor="#4a8ab6" color="#fff" margin="2px 0" />
        <LocationHint backgroundColor="#4a8ab6" color="#fff" margin="2px 0" />
        <div style={{ margin: "1rem" }} />
        <LocationHint
          backgroundColor="#c6445c"
          color="#fff"
          margin="2px 0"
          width={150}
          showBoss={false}
          showItems={false}
        />
        <LocationHint
          backgroundColor="#c6445c"
          color="#fff"
          margin="2px 0"
          width={150}
          showBoss={false}
          showItems={false}
        />
        <LocationHint
          backgroundColor="#c6445c"
          color="#fff"
          margin="2px 0"
          width={150}
          showBoss={false}
          showItems={false}
        />
      </div>
      <div className={styles.version}>
        <Footer showGitHub={false} opacity={0.5} />
      </div>
    </div>
  );
};

export default Tracker;
