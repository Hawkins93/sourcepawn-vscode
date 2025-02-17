import {
  CompletionItemKind,
  Range,
  CompletionItem,
  SignatureInformation,
  Hover,
  DocumentSymbol,
  SymbolKind,
  LocationLink,
} from "vscode";
import { URI } from "vscode-uri";

import { SPItem } from "./spItems";
import { globalIdentifier } from "../../Misc/spConstants";

export class VariableItem implements SPItem {
  name: string;
  filePath: string;
  kind = CompletionItemKind.Variable;
  parent: string;
  range: Range;
  type: string;
  enumStructName: string;

  constructor(
    name: string,
    file: string,
    parent: string,
    range: Range,
    type: string,
    enumStruct: string
  ) {
    this.name = name;
    this.filePath = file;
    this.parent = parent;
    this.range = range;
    this.type = type;
    this.enumStructName = enumStruct;
  }

  toCompletionItem(lastFuncName?: string): CompletionItem | undefined {
    if (
      lastFuncName === undefined ||
      [lastFuncName, globalIdentifier].includes(this.parent)
    ) {
      return {
        label: this.name,
        kind: this.kind,
      };
    }
    return undefined;
  }

  toDefinitionItem(): LocationLink {
    return {
      targetRange: this.range,
      targetUri: URI.file(this.filePath),
    };
  }

  toSignature() {
    return undefined;
  }

  toHover(): Hover | undefined {
    if (this.type === "") {
      return undefined;
    }
    return new Hover([
      { language: "sourcepawn", value: `${this.type} ${this.name};` },
    ]);
  }

  toDocumentSymbol(): DocumentSymbol {
    return new DocumentSymbol(
      this.name,
      this.type,
      SymbolKind.Variable,
      this.range,
      this.range
    );
  }
}
