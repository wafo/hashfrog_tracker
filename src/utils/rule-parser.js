import { parse } from "acorn";
import _ from "lodash";

/**
 * Parses a logic rule string into an AST node.
 * @param {string} ruleString - The rule string.
 * @returns {object} The parsed AST expression statement.
 */
export function parseRule(ruleString) {
  const rule = _.flow(
    _.trim,
    str => _.replace(str, / and /g, " && "),
    str => _.replace(str, / or /g, " || "),
    str => _.replace(str, /not /g, "! "),
  )(ruleString);

  return parse(rule, { ecmaVersion: 2020 }).body[0];
}

export default parseRule;
