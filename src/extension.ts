// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { createConstr } from "./CreateConstructor";
import { createDefaultConstr } from "./createDefaultConstructor";
import { MoveImpAll, MoveImpSelection } from "./MoveImpl";
import { moveToHeader } from "./MoveToHeader";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.moveImplementation",
      (args) => {
        MoveImpSelection();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.moveAllImplementation",
      (args) => {
        MoveImpAll();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.createConstructor",
      (args) => {
        createConstr();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.createDefaultConstructors",
      (args) => {
        createDefaultConstr();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.moveToHeader",
      (args) => {
        moveToHeader();
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() { }
