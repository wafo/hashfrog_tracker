const { useMemo, useEffect } = require("react");
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

const Layout = props => {
  useEffect(() => {
    document.title = "HashFrog - Tracker";
  }, []);

  const { state: layoutContext } = useLayout();

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
          const element = elementsJSON.find(x => x.id === component.elementId);
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
          const elements = component.elements.map(x => {
            return elementsJSON.find(element => element.name === x || element.id === x);
          });
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
          const element = elementsJSON.find(x => x.id === component.elementId);
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
          const element = elementsJSON.find(x => x.id === component.elementId);
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
                {...(element && element.icons && { itemsIcons: element.icons })}
              />
            </div>
          );
        }
        case "hinttable": {
          const element = elementsJSON.find(x => x.id === component.elementId);
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
  }, [renderLayout.components]);

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
      {!props.hideFooter && <div className="ps-1"><Footer showGitHub={false} opacity={0.5} /></div>}
    </div>
  );
};

export default Layout;
