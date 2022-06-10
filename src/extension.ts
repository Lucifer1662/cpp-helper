// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { createConstr } from "./CreateConstructor";
import { MoveImpAll, MoveImpSelection } from "./MoveImpl";

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
}

// this method is called when your extension is deactivated
export function deactivate() { }
