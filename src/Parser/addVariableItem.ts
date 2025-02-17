﻿import { Parser } from "./spParser";
import { VariableItem } from "../Backend/Items/spVariableItem";
import { PropertyItem } from "../Backend/Items/spPropertyItem";
import { State } from "./stateEnum";
import { globalIdentifier } from "../Misc/spConstants";

export function addVariableItem(
  parser: Parser,
  name: string,
  line: string,
  type: string,
  funcName?: string,
  isParamDef = false
): void {
  if (line === undefined) {
    return;
  }
  let range = parser.makeDefinitionRange(name, line);
  let scope: string = globalIdentifier;
  let enumStructName: string;
  if (parser.state.includes(State.EnumStruct)) {
    enumStructName = parser.state_data.name;
  }
  if (parser.lastFuncLine !== 0) {
    scope = parser.lastFuncName;
  }
  if (funcName !== undefined) {
    scope = funcName;
  }
  // Custom key name for the map so the definitions don't override each others
  let mapName = name + scope + enumStructName;
  if (
    (parser.state.includes(State.EnumStruct) ||
      parser.state.includes(State.Methodmap)) &&
    (parser.state.includes(State.Function) || isParamDef)
  ) {
    parser.completions.set(
      mapName + parser.lastFuncName,
      new VariableItem(name, parser.file, scope, range, type, enumStructName)
    );
  } else if (parser.state.includes(State.EnumStruct)) {
    parser.completions.set(
      mapName,
      new PropertyItem(
        parser.state_data.name,
        name,
        parser.file,
        line,
        "",
        range,
        type
      )
    );
  } else {
    parser.completions.set(
      mapName,
      new VariableItem(name, parser.file, scope, range, type, globalIdentifier)
    );
  }
}
