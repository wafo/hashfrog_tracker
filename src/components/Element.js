import { Fragment, useCallback, useMemo, useState } from "react";
import { useItem } from "../context/trackerContext";

const baseURL = process.env.PUBLIC_URL;

const styles = {
  container: {
    position: "relative",
    cursor: "pointer",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  label: {
    position: "absolute",
    bottom: "-10px",
    left: "50%",
    transform: "translate(-50%, 0)",
    textAlign: "center",
    fontSize: "12px",
    whiteSpace: "nowrap",
    backgroundColor: "#000",
    width: "fit-content",
    padding: "0.1rem 0",
    minWidth: "100%",
    fontWeight: 700,
  },
  counter: {
    fontSize: "14px",
    fontWeight: 400,
    position: "absolute",
    bottom: "-2px",
    right: 0,
    cursor: "pointer",
  },
};

const nestedStyles = {
  position: "absolute",
  left: "50%",
  transform: "translate(-50%, 0)",
  bottom: "-5px",
};

const Element = (props) => {
  const {
    name = "Item",
    label = "",
    labelStartingIndex = 0,
    type = "simple", // simple, counter, label, nested
    size = [25, 25], // width, height
    customStyle = {},
    icons = [],
    countConfig = [0, 5], // min, max
    receiver = false, // if draggin overrides item
    selectedStartingIndex = 0, // on which of the icons we start
    items = [],
  } = props;

  const itemContext = useItem();

  const [selected, setSelected] = useState(selectedStartingIndex);
  const [counter, setCounter] = useState(0);
  const [draggedIcon, setDraggedIcon] = useState(null);

  const icon = useMemo(() => {
    return `${baseURL}/icons/${icons[selected]}`;
  }, [icons, selected]);

  const clickHandler = useCallback(
    (event) => {
      event.preventDefault();

      const isCounter = !["simple", "nested", "label"].includes(type);
      let updated = isCounter ? counter : selected;

      if (event.nativeEvent.type === "click") {
        if (!isCounter)
          updated = updated < icons.length - 1 ? ++updated : updated;
        if (isCounter)
          updated = updated === countConfig[1] ? updated : ++updated;
      } else if (event.nativeEvent.type === "contextmenu") {
        if (!isCounter) updated = updated > 0 ? --updated : updated;
        if (isCounter) updated === countConfig[0] ? updated : --updated;
      }

      // Canceling draggedIcon
      if (!isCounter) {
        setDraggedIcon(null);
        setSelected(updated);
      } else {
        setCounter(updated);
      }

      // For context
      if (!isCounter) {
        itemContext.markItem(items, items[updated]);
      }
    },
    [icons, type, countConfig, selected, items, itemContext, counter]
  );

  const dragHandler = useCallback(
    (event) => {
      const dragIcon = `${baseURL}/icons/${icons[1] || icons[0]}`;
      const item = JSON.stringify({ icon: dragIcon });
      event.dataTransfer.setData("item", item);
    },
    [icons]
  );

  const dropHandler = useCallback(
    (event) => {
      event.preventDefault();
      if (receiver) {
        const item = event.dataTransfer.getData("item");
        const { icon } = JSON.parse(item);
        setDraggedIcon(icon);
      }
    },
    [receiver]
  );

  return (
    <Fragment>
      <div
        id={name}
        className=""
        style={{
          width: size[0],
          height: size[1],
          ...styles.container,
          ...customStyle,
        }}
        onClick={clickHandler}
        onContextMenu={clickHandler}
        onDragStart={dragHandler}
        onDragEnter={(e) => e.preventDefault()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={dropHandler}
        draggable
      >
        <img src={draggedIcon || icon} alt={name} style={styles.img} />
        {type === "counter" && <CounterLabel counter={counter} />}
        {type === "label" && (
          <ElementLabel label={label} labelStartingIndex={labelStartingIndex} />
        )}
        {type === "nested" && (
          <Element
            name={`${name}_nested`}
            type="simple"
            icons={["unknown_16x16.png"]}
            size={[16, 16]}
            customStyle={nestedStyles}
            receiver
          />
        )}
      </div>
    </Fragment>
  );
};

const ElementLabel = ({ label, labelStartingIndex }) => {
  const [index, setIndex] = useState(labelStartingIndex);

  const display = useMemo(() => {
    if (Array.isArray(label)) {
      return label[index];
    }
    return null;
  }, [label, index]);

  const handleOnWheel = useCallback(
    (event) => {
      const { deltaY } = event;
      const max = label.length - 1 || 0;
      if (deltaY > 0) {
        setIndex((prev) => (prev === max ? prev : ++prev));
      } else if (deltaY < 0) {
        setIndex((prev) => (prev === 0 ? prev : --prev));
      }
    },
    [label]
  );

  if (!label) return null;
  if (typeof label === "string") {
    return <label style={styles.label}>{label}</label>;
  } else if (Array.isArray(label)) {
    return (
      <label style={styles.label} onWheel={handleOnWheel}>
        {display}
      </label>
    );
  }
};

const CounterLabel = ({ counter }) => {
  return <label style={styles.counter}>{counter}</label>;
};

export default Element;
