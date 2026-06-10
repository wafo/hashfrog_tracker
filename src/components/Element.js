import _ from "lodash";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useElement, useItems, useLabelSelect } from "../context/trackerContext";

// Base Icons
import icon_check from "../assets/icons/check_16x16.png";
import icon_hashfrog from "../assets/icons/hash_frog_bw_32x32.png";
import icon_unknown from "../assets/icons/unknown_16x16.png";

const nestedStyles = {
  position: "absolute",
  left: "50%",
  transform: "translate(-50%, 0)",
  bottom: "-6px",
};

const Element = props => {
  const {
    id = "7d6ff858445845e5b95db3254e34b0dc",
    name = "Item",
    label = "",
    labelStartingIndex = 0,
    labelBackgroundColor,
    type = "simple", // simple, counter, label, nested
    size = [25, 25], // width, height
    customStyle = {},
    icons = [],
    countConfig = [0, 5], // min, max
    receiver = false, // if draggin overrides item
    dragCurrent = false, // if dragging should default or drag the current selected
    selectedStartingIndex = 0, // on which of the icons we start
    items = [],
    hidden = false
  } = props;

  const { markCounter, markItem, startingIndex: trackerContextStartingIndex, startingItem } = useItems(items, id);
  useElement(id, startingItem);
  const labelSelect = useLabelSelect();

  const [selected, setSelected] = useState(trackerContextStartingIndex || selectedStartingIndex);
  const [counter, setCounter] = useState(0);
  const [iconHash, setIconHash] = useState(null);
  const [draggedIcon, setDraggedIcon] = useState(null);
  const hasUserInteracted = useRef(false);

  // Whenever a change in icon list is detected, reset the selection.
  // Only reset if icons actually changed AND we don't have a starting item.
  useEffect(() => {
    const hash = icons.reduce((acc, cv) => {
      return (acc += cv);
    }, "");

    if (iconHash !== null && hash !== iconHash && trackerContextStartingIndex === 0) {
      setSelected(0);
    }

    setIconHash(hash);
  }, [icons, iconHash, name, trackerContextStartingIndex]);

  // Sync selected state when starting items change
  useEffect(() => {
    if (trackerContextStartingIndex > 0) {
      // This element should claim the starting item
      setSelected(trackerContextStartingIndex);
    } else if (!hasUserInteracted.current) {
      // Another element claimed the item and user hasn't interacted - reset to uncollected
      setSelected(0);
    }
  }, [trackerContextStartingIndex]);

  const icon = useMemo(() => {
    return icons[selected];
  }, [icons, selected]);

  const clickHandler = useCallback(
    event => {
      event.preventDefault();
      event.stopPropagation();

      // Track that user has interacted with this element
      hasUserInteracted.current = true;

      const isCounter = !["simple", "nested", "label"].includes(type);
      let updated = isCounter ? counter : selected;

      if (event.nativeEvent.type === "click") {
        if (!isCounter) { updated = updated < icons.length - 1 ? ++updated : updated; }
        if (isCounter) { updated = updated === countConfig[1] ? updated : ++updated; }
      } else if (event.nativeEvent.type === "contextmenu") {
        if (!isCounter) { updated = updated > 0 ? --updated : updated; }
        if (isCounter) { updated === countConfig[0] ? updated : --updated; }
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
        markItem(items[updated], id);
      } else {
        markCounter(updated, name);
      }
    },
    [id, icons, type, countConfig, selected, items, markCounter, markItem, counter, name],
  );

  const wheelHandler = useCallback(
    event => {
      // event.preventDefault();
      if (type !== "counter") { return; }

      const { deltaY } = event;
      if (deltaY !== 0) {
        const newVal = _.clamp(counter + (deltaY > 0 ? 1 : -1), countConfig[0], countConfig[1]);
        setCounter(newVal);
        markCounter(newVal, name);
      }
    },
    [type, countConfig, markCounter, counter, name],
  );

  const dragHandler = useCallback(
    event => {
      let dragIcon = draggedIcon ? draggedIcon : icons[1] || icons[0];
      if (dragCurrent) { dragIcon = icons[selected]; }
      const item = JSON.stringify({ icon: dragIcon });
      event.dataTransfer.setData("item", item);
    },
    [dragCurrent, icons, selected, draggedIcon],
  );

  const dropHandler = useCallback(
    event => {
      event.preventDefault();

      if (receiver) {
        const item = event.dataTransfer.getData("item");
        const { icon: droppedIcon } = JSON.parse(item);
        setDraggedIcon(droppedIcon);
        setSelected(0) //reset selected so if the dragged item gets cleared, the user will see the hashfrog
      }
    },
    [receiver],
  );

  return (
    <Fragment>
      <div
        id={id}
        className="element"
        style={{
          width: size[0],
          height: size[1],
          ...customStyle,
        }}
        onClick={clickHandler}
        onContextMenu={clickHandler}
        onWheel={wheelHandler}
        onDragStart={dragHandler}
        onDragEnter={e => e.preventDefault()}
        onDragOver={e => e.preventDefault()}
        onDrop={dropHandler}
        draggable
        hidden={hidden}
      >
        <img className="element-icon" src={draggedIcon || icon || icon_hashfrog} alt={name} />
        {type === "counter" && <CounterLabel counter={counter} />}
        {type === "label" && (
          <ElementLabel
            label={label}
            labelStartingIndex={labelStartingIndex}
            labelBackgroundColor={labelBackgroundColor}
            onLabelChange={(value) => labelSelect(id, name, value)}
          />
        )}
        {type === "nested" && (
          <Element
            name={`${name}_nested`}
            type="simple"
            icons={[icon_unknown, icon_check]}
            size={[16, 16]}
            customStyle={nestedStyles}
            receiver
          />
        )}
      </div>
    </Fragment>
  );
};

const ElementLabel = ({ label, labelStartingIndex, labelBackgroundColor, onLabelChange }) => {
  const [index, setIndex] = useState(labelStartingIndex);

  const display = useMemo(() => {
    if (Array.isArray(label)) {
      return label[index];
    }
    return null;
  }, [label, index]);

  const handleOnWheel = useCallback(
    event => {
      const { deltaY } = event;
      const max = label.length - 1 || 0;
      if (deltaY > 0) {
        setIndex(prev => {
          if (prev === max) { return prev; }
          if (onLabelChange) { onLabelChange(label[++prev]); }
          return prev;
        });
      } else if (deltaY < 0) {
        setIndex(prev => {
          if (prev === 0) { return prev; }
          if (onLabelChange) { onLabelChange(label[--prev]); }
          return prev;
        });
      }
    },
    [label, onLabelChange],
  );

  const handleOnClick = useCallback(
    event => {
      event.preventDefault();
      event.stopPropagation();
      const max = label.length - 1 || 0;
      if (event.nativeEvent.type === "click") {
        setIndex(prev => {
          if (prev === max) { return prev; }
          if (onLabelChange) { onLabelChange(label[++prev]); }
          return prev;
        });
      } else if (event.nativeEvent.type === "contextmenu") {
        setIndex(prev => {
          if (prev === 0) { return prev; }
          if (onLabelChange) { onLabelChange(label[--prev]); }
          return prev;
        });
      }
    },
    [label, onLabelChange],
  );

  if (!label) { return null; }
  if (typeof label === "string") {
    return <label className="element-label">{label}</label>;
  } else if (Array.isArray(label)) {
    return (
      <label
        className="element-label"
        onWheel={handleOnWheel}
        onClick={handleOnClick}
        onContextMenu={handleOnClick}
        style={labelBackgroundColor ? { backgroundColor: labelBackgroundColor } : {}}
      >
        {display}
      </label>
    );
  }
};

const CounterLabel = ({ counter }) => {
  return <label className="element-counter">{counter}</label>;
};

export default Element;
