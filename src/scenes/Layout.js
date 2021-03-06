import { useCallback, useState, useMemo, useEffect } from "react";
import { useLayout } from "../context/layoutContext";
// Components
import Element from "../components/Element";
import ElementsTable from "../components/ElementsTable";
import Footer from "../components/Footer";
import LocationHint from "../components/LocationHint";
import SometimesHint from "../components/SometimesHint";
// Data
import elementsJSON from "../data/elements.json";
import HintsTable from "../components/HintsTable";
import Label from "../components/Label";

const baseURL = process.env.PUBLIC_URL;

const Layout = props => {
  const { state: layoutContext } = useLayout();

  /** ************************** */
  /** CACHE FOR ICONS */
  /** ************************** */
  const [cachedIcons, setCachedIcons] = useState(null);

  const getCacheIcons = useCallback(async () => {
    let icons = elementsJSON.reduce((accumulator, element) => {
      return [...accumulator, ...element.icons];
    }, []);
    icons = [...new Set(icons)];

    icons = await Promise.all(
      icons.map(icon =>
        fetch(`${baseURL}/icons/${icon}`)
          .then(response => response.blob())
          .then(image => ({
            icon,
            image: URL.createObjectURL(image),
          })),
      ),
    );
    icons = icons.reduce((accumulator, image) => {
      accumulator[image.icon] = image.image;
      return accumulator;
    }, {});

    setCachedIcons(icons);
    return icons;
  }, []);

  const getCacheElement = useCallback(
    id => {
      // Destructuring to create new element,
      // otherwise on repeated elements it rips
      // because on next search it will loop through already cached icons.
      let element = elementsJSON.find(element => element.name === id || element.id === id);
      if (!element) return null;
      element = { ...element };
      if (!cachedIcons) element.icons = [];
      if (cachedIcons) element.icons = element.icons.map(icon => cachedIcons[icon]);
      return element;
    },
    [cachedIcons],
  );

  useEffect(() => {
    document.title = "HashFrog - Tracker";
    getCacheIcons();
  }, [getCacheIcons]);

  /** ************************** */
  /** RENDERING LAYOUT */
  /** ************************** */
  const renderLayout = useMemo(() => {
    if (props.layout) return props.layout;
    return layoutContext;
  }, [props.layout, layoutContext]);

  const layoutConfig = useMemo(() => {
    return renderLayout.layoutConfig;
  }, [renderLayout]);

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
                id={component.id}
                size={component.size}
                receiver={component.receiver}
                dragCurrent={component.dragCurrent}
                selectedStartingIndex={component.selectedStartingIndex}
                countConfig={component.countConfig}
                labelStartingIndex={component.labelStartingIndex}
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
              />
            </div>
          );
        }
        case "locationhint": {
          const element = getCacheElement(component.elementId);
          const bossElement = getCacheElement("9e6f493869f84c19b23081bdb92bc621");
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
    <div className="layout">
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
