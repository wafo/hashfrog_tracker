import { Fragment, useMemo } from "react";

import LayoutID from "../utils/layout-id";
import { splitIntoChunk } from "../utils/utils";
import Element from "./Element";

const ElementsTable = props => {
  const {
    columns = 1,
    elements = [], // array of elements from elements.json it will fill the table by rows
    elementsSize = null, // [0, 0] optional
    padding = 1, // for td
    hidden = false
  } = props;

  const rows = useMemo(() => {
    const itemComponents = elements.map((element, index) => (
      <td key={`${index}-${element.id}`} style={{ padding }}>
        <Element {...element} id={LayoutID.getID()} size={elementsSize || element.size} />
      </td>
    ));

    const splitArray = splitIntoChunk(itemComponents, columns);

    return splitArray.map((rows, index) => <tr key={index}>{rows}</tr>);
  }, [columns, elements, padding, elementsSize]);

  return (
    <Fragment>
      <table style={{ borderSpacing: 0 }} hidden={hidden}>
        <tbody>{rows}</tbody>
      </table>
    </Fragment>
  );
};

export default ElementsTable;
