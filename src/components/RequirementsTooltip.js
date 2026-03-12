import React, { useMemo } from "react";

import { getRequirementsStructure, updateRequirementsOwnership } from "../utils/expression-converter";

const RequirementsTooltip = ({ locationName, items }) => {
  // Compute the requirements once based on starting items only
  const baseStructure = useMemo(() => {
    return getRequirementsStructure(locationName);
  }, [locationName]);

  // Update styling based on current tracked items
  const { clauses, satisfied } = useMemo(() => {
    return updateRequirementsOwnership(baseStructure, items);
  }, [baseStructure, items]);

  // If all requirements are satisfied, show "Nothing"
  if (satisfied || clauses.length === 0) {
    return (
      <div className="requirements-tooltip">
        <ul>
          <li className="owned">Nothing</li>
        </ul>
      </div>
    );
  }

  // Render the inner content of a compound item: subItems joined by
  // "and", followed by optional nestedOr in parentheses.
  const renderCompoundContent = (compound, withOuterParens) => {
    const hasNestedOr = compound.nestedOr && compound.nestedOr.length > 0;
    return (
      <>
        {withOuterParens && <span className="operator">(</span>}
        {compound.subItems.map((subItem, subIndex) => (
          <React.Fragment key={subItem.name}>
            {renderItem(subItem, false)}
            {subIndex < compound.subItems.length - 1 && (
              <span className="operator"> and </span>
            )}
          </React.Fragment>
        ))}
        {hasNestedOr && (
          <>
            <span className="operator"> and </span>
            <span className="operator">(</span>
            {compound.nestedOr.map((nestedItem, nestedIndex) => (
              <React.Fragment key={nestedItem.name}>
                {renderItem(nestedItem, true)}
                {nestedIndex < compound.nestedOr.length - 1 && (
                  <span className="operator"> or </span>
                )}
              </React.Fragment>
            ))}
            <span className="operator">)</span>
          </>
        )}
        {withOuterParens && <span className="operator">)</span>}
      </>
    );
  };

  // Render an item. Compound items with subItems are expanded inline;
  // needsParens wraps compound content in parentheses for disambiguation.
  const renderItem = (item, needsParens) => {
    if (item.isCompound && item.subItems) {
      return renderCompoundContent(item, needsParens);
    }
    return (
      <span className={item.owned ? "owned" : "missing"}>
        {item.displayName}
      </span>
    );
  };

  return (
    <div className="requirements-tooltip">
      <ul>
        {clauses.map((clause, clauseIndex) => {
          const hasMultipleItems = clause.items.length > 1;
          return (
            <li key={clauseIndex}>
              {clause.items.map((item, itemIndex) => (
                <React.Fragment key={item.name}>
                  {renderItem(item, hasMultipleItems && item.isCompound)}
                  {itemIndex < clause.items.length - 1 && (
                    <span className="operator"> or </span>
                  )}
                </React.Fragment>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RequirementsTooltip;
