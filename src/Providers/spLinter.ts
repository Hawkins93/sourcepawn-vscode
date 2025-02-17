import {
  extensions,
  TextDocument,
  workspace as Workspace,
  Range,
} from "vscode";
import { openSync, writeSync, unlink, closeSync } from "fs";
import { join, extname, dirname } from "path";
import { execFile } from "child_process";

import { getAllPossibleIncludeFolderPaths } from "../Backend/spFileHandlers";
import { parseSPCompErrors } from "./Linter/parseSPCompErrors";
import { findMainPath } from "../spUtils";
import { TimeoutFunction } from "./Linter/throttles";
import { compilerDiagnostics } from "./Linter/compilerDiagnostics";
import { throttles } from "./Linter/throttles";

/**
 * Lint a TextDocument object and add its diagnostics to the
 * @param  {TextDocument} document    The document to lint.
 * @returns void
 */
export function refreshDiagnostics(document: TextDocument): void {
  // Check if the user specified not to enable the linter for this file.
  const range = new Range(0, 0, 1, 0);
  const text = document.getText(range);

  // Check if the setting to activate the linter is set to true.
  const workspaceFolder = Workspace.getWorkspaceFolder(document.uri);
  const enableLinter: boolean = Workspace.getConfiguration(
    "sourcepawn",
    workspaceFolder
  ).get<boolean>("enableLinter");

  // Stop early if linter is disabled.
  if (
    text === "" ||
    /\/\/linter=false/.test(text) ||
    !enableLinter ||
    extname(document.fileName) !== ".sp"
  ) {
    compilerDiagnostics.set(document.uri, []);
    return;
  }

  const tmpPath = join(
    extensions.getExtension("Sarrus.sourcepawn-vscode").extensionPath,
    "tmpCompiled.smx"
  );
  const tmpFile = join(__dirname, "temp.sp");
  const spcomp =
    Workspace.getConfiguration("sourcepawn", workspaceFolder).get<string>(
      "SpcompPath"
    ) || "";

  if (!spcomp) {
    return;
  }

  // Get the previous instance of spcomp if it exists
  let throttle = throttles[document.uri.path];
  if (throttle === undefined) {
    throttle = new TimeoutFunction();
    throttles[document.uri.path] = throttle;
  }

  // Cancel the previous instance and start a new one.
  throttle.cancel();
  throttle.start(() => {
    const mainPath = findMainPath(document.uri);

    // Separate the cases if we are using mainPath or not.
    let scriptingFolder: string;
    let filePath: string;
    if (mainPath !== undefined) {
      scriptingFolder = dirname(mainPath);
      filePath = mainPath;
    } else {
      scriptingFolder = dirname(document.uri.fsPath);
      let file = openSync(tmpFile, "w", 0o765);
      writeSync(file, document.getText());
      closeSync(file);
      filePath = tmpFile;
    }

    // Generate compiler arguments.
    const compilerArgs = [
      "-i" +
        Workspace.getConfiguration("sourcepawn", workspaceFolder).get(
          "SourcemodHome"
        ) || "",
      "-i" + scriptingFolder,
      "-i" + join(scriptingFolder, "include"),
      "-v0",
      filePath,
      "-o" + tmpPath,
    ];

    // Add a space at the beginning of every element, for security.
    Workspace.getConfiguration("sourcepawn", workspaceFolder)
      .get<string[]>("linterCompilerOptions")
      .forEach((e) => compilerArgs.push(" " + e));

    // Add the optional includes folders.
    getAllPossibleIncludeFolderPaths(document.uri, true).forEach((e) =>
      compilerArgs.push(`-i${e}`)
    );

    // Run the blank compile.
    execFile(spcomp, compilerArgs, (error, stdout) => {
      // If it compiled successfully, delete the temporary files.
      if (!error) {
        unlink(tmpPath, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
      parseSPCompErrors(
        stdout,
        compilerDiagnostics,
        mainPath === undefined ? document.uri.fsPath : undefined
      );
    });
  }, 300);
}
