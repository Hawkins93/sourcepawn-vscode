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
import { basename } from "path";

import { descriptionToMD } from "../../spUtils";
import { SPItem } from "./spItems";

export class EnumStructItem implements SPItem {
  name: string;
  filePath: string;
  description: string;
  kind = CompletionItemKind.Struct;
  range: Range;
  fullRange: Range;

  constructor(name: string, file: string, description: string, range: Range) {
    this.name = name;
    this.filePath = file;
    this.description = description;
    this.range = range;
  }

  toCompletionItem(): CompletionItem {
    return {
      label: this.name,
      kind: this.kind,
      detail: basename(this.filePath),
    };
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
    if (!this.description) {
      return undefined;
    }
    return new Hover([
      { language: "sourcepawn", value: this.name },
      descriptionToMD(this.description),
    ]);
  }

  toDocumentSymbol(): DocumentSymbol | undefined {
    if (this.fullRange === undefined) {
      return undefined;
    }
    return new DocumentSymbol(
      this.name,
      this.description,
      SymbolKind.Struct,
      this.fullRange,
      this.range
    );
  }
}
