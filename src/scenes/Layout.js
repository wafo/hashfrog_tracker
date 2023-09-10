import { useCallback, useEffect, useMemo, useState } from "react";

import { useLayout } from "../context/layoutContext";

// Components
import Element from "../components/Element";
import ElementsTable from "../components/ElementsTable";
import Footer from "../components/Footer";
import LocationHint from "../components/LocationHint";
import SometimesHint from "../components/SometimesHint";

// Data
import HintsTable from "../components/HintsTable";
import Label from "../components/Label";
import elementsJSON from "../data/elements.json";
import LayoutID from "../utils/layout-id";
import { isBase64, splitNameBase64 } from "../utils/utils";

const baseURL = process.env.PUBLIC_URL;

const Layout = props => {
  const { state: layoutContext } = useLayout();

  const renderLayout = useMemo(() => {
    if (props.layout) return props.layout;
    return layoutContext;
  }, [props.layout, layoutContext]);

  const layoutConfig = useMemo(() => {
    return renderLayout.layoutConfig;
  }, [renderLayout]);

  const elements = useMemo(() => {
    if (props.layout) {
      return [...elementsJSON, ...(props.layout.elements || [])];
    }
    return [...elementsJSON, ...(layoutContext?.elements || [])];
  }, [layoutContext, props.layout]);

  const [cachedIcons, setCachedIcons] = useState(null);

  const getCacheIcons = useCallback(async () => {
    let icons = elements.reduce((accumulator, element) => {
      return [...accumulator, ...element.icons];
    }, []);
    icons = [...new Set(icons)];

    icons = await Promise.all(
      icons.map(icon => {
        // Checking for base64 image coming from the json
        if (isBase64(icon)) {
          return new Promise(resolve => {
            const { name, file } = splitNameBase64(icon);
            resolve({ icon: name, image: file });
          });
        }
        return fetch(`${baseURL}/icons/${icon}`)
          .then(response => response.blob())
          .then(image => ({
            icon,
            image: URL.createObjectURL(image),
          }));
      }),
    );
    icons = icons.reduce((accumulator, image) => {
      accumulator[image.icon] = image.image;
      return accumulator;
    }, {});

    setCachedIcons(icons);
    return icons;
  }, [elements]);

  const getCacheElement = useCallback(
    id => {
      // Destructuring to create new element,
      // otherwise on repeated elements it rips
      // because on next search it will loop through already cached icons.
      let element = elements.find(element => element.name === id || element.id === id);
      if (!element) element = elements[0]; // Fallback to hashfrog
      element = { ...element };
      if (!cachedIcons) element.icons = [];
      if (cachedIcons)
        element.icons = element.icons.map(icon => {
          // Checking for base64 coming from the json
          if (isBase64(icon)) {
            const { name } = splitNameBase64(icon);
            return cachedIcons[name];
          }
          return cachedIcons[icon];
        });
      if (layoutConfig?.backgroundColor) element.labelBackgroundColor = layoutConfig.backgroundColor;
      return element;
    },
    [cachedIcons, elements, layoutConfig.backgroundColor],
  );

  const getUserBossElementIcons = userBossElements => ({...(userBossElements && {bossElementsIcons: userBossElements.reduce((acc, element) => {
    acc.push(...element.icons);

    return acc;
  }, [])})})

  useEffect(() => {
    document.title = "HashFrog - Tracker";
    getCacheIcons();
  }, [getCacheIcons]);

  LayoutID.reset();
  const toRender = useMemo(() => {
    return renderLayout.components.map(component => {
      switch (component.type) {
        case "element": {
          const element = getCacheElement(component.elementId);
          const [top, left] = component.position;
          return (
            <div key={component.id} className="layout-component" style={{ top, left }}>
              <Element
                {...element}
                id={LayoutID.getID()}
                size={component.size}
                receiver={component.receiver}
                dragCurrent={component.dragCurrent}
                selectedStartingIndex={component.selectedStartingIndex}
                countConfig={component.countConfig}
                labelStartingIndex={component.labelStartingIndex}
                hidden={component.hidden}
              />
            </div>
          );
        }
        case "table": {
          const elements = component.elements.map(x => getCacheElement(x));
          const [top, left] = component.position;
          return (
            <div key={component.id} className="layout-component" style={{ top, left }}>
              <ElementsTable
                id={component.id}
                elements={elements}
                elementsSize={component.elementsSize}
                columns={component.columns}
                padding={component.padding}
                hidden={component.hidden}
              />
            </div>
          );
        }
        case "sometimeshint": {
          const element = getCacheElement(component.elementId);
          const [top, left] = component.position;
          return (
            <div key={component.id} className="layout-component" style={{ top, left }}>
              <SometimesHint
                id={component.id}
                width={component.width}
                color={component.color}
                backgroundColor={component.backgroundColor}
                icons={element.icons}
                labels={component.labels}
                showIcon={component.showIcon}
                inverted={component.inverted}
                dual={component.dual}
                hidden={component.hidden}
              />
            </div>
          );
        }
        case "locationhint": {
          const element = getCacheElement(component.elementId);
          const bossElement = getCacheElement("9e6f493869f84c19b23081bdb92bc621");

          const userBossElements = component.bossElements ? component.bossElements.map(x => getCacheElement(x)) : null;

          const [top, left] = component.position;
          return (
            <div key={component.id} className="layout-component" style={{ top, left }}>
              <LocationHint
                id={component.id}
                width={component.width}
                color={component.color}
                backgroundColor={component.backgroundColor}
                showBoss={component.showBoss}
                showItems={component.showItems}
                labels={component.labels}
                bossReceiver={component.bossReceiver}
                {...getUserBossElementIcons(userBossElements)}
                hidden={component.hidden}
                {...(bossElement && bossElement.icons && { bossIcons: bossElement.icons })}
                {...(element && element.icons && { itemsIcons: element.icons })}
              />
            </div>
          );
        }
        case "hinttable": {
          const element = getCacheElement(component.elementId);
          const bossElement = getCacheElement("9e6f493869f84c19b23081bdb92bc621");
          const [top, left] = component.position;

          const userBossElements = component.bossElements ? component.bossElements.map(x => getCacheElement(x)) : null;

          return (
            <div key={component.id} className="layout-component" style={{ top, left }}>
              <HintsTable
                id={component.id}
                hintType={component.hintType}
                hintNumber={component.hintNumber}
                columns={component.columns}
                width={component.width}
                padding={component.padding}
                labels={component.labels}
                color={component.color}
                backgroundColor={component.backgroundColor}
                icons={element.icons}
                bossIcons={bossElement.icons}
                showIcon={component.showIcon}
                inverted={component.inverted}
                showBoss={component.showBoss}
                showItems={component.showItems}
                bossReceiver={component.bossReceiver}
                dual={component.dual}
                {...getUserBossElementIcons(userBossElements)}
                hidden={component.hidden}
              />
            </div>
          );
        }
        case "label": {
          const [top, left] = component.position;
          return (
            <div key={component.id} className="layout-component" style={{ top, left }}>
              <Label
                id={component.id}
                color={component.color}
                backgroundColor={component.backgroundColor}
                padding={component.padding}
                text={component.text}
                fontSize={component.fontSize}
                hidden={component.hidden}
              />
            </div>
          );
        }
        default:
          return null;
      }
    });
  }, [renderLayout.components, getCacheElement]);

  const layoutStyles = useMemo(() => {
    const styles = {
      width: layoutConfig.width,
      height: layoutConfig.height,
      backgroundColor: layoutConfig.backgroundColor,
    };
    if (props.editing) {
      styles.border = "1px dashed #ffff0025";
    }
    return styles;
  }, [props.editing, layoutConfig]);

  return (
    <div className="layout" style={props.editing ? {} : { backgroundColor: layoutConfig.backgroundColor }}>
      <div className="layout-content" style={layoutStyles}>
        {toRender}
      </div>
      {!props.hideFooter && (
        <div className="ps-1">
          <Footer showGitHub={false} opacity={0.5} />
        </div>
      )}
    </div>
  );
};

export default Layout;
