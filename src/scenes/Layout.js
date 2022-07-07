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
              <Element {...element} size={component.size} />
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
                width={component.width}
                color={component.color}
                backgroundColor={component.backgroundColor}
                icons={element.icons}
                labels={component.labels}
                showIcon={component.showIcon}
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
        default:
          return null;
      }
    });
  }, [renderLayout.components]);

  return (
    <div className="layout">
      <div
        className="layout-content"
        style={{
          width: layoutConfig.width,
          height: layoutConfig.height,
          backgroundColor: layoutConfig.backgroundColor,
        }}
      >
        {toRender}
      </div>
      {!props.hideFooter && <Footer showGitHub={false} opacity={0.5} />}
    </div>
  );
};

export default Layout;
