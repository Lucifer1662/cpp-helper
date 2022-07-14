// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { AddIncludeCodeAction, addIncludeFor, addIncludes } from "./AddIncludes";
import { buildAndReportGcc, GccTerminalLinkProvider } from "./buildGcc";
import { createConstr } from "./CreateConstructor";
import { createDefaultConstr } from "./CreateDefaultConstructor";
import { ForwardDeclarationCodeAction } from "./ForwardDeclaration";
import { MoveImpAll, MoveImplCodeAction, MoveImpSelection } from "./MoveImpl";
import { moveToHeader } from "./MoveToHeader";
import { diagnostics, getConfiguration } from "./util";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  const config = getConfiguration();

  config.haveInContextMenu.forEach(cm => {
    vscode.commands.executeCommand('setContext', 'cpp-helper.' + cm + ".cm", true)
  })

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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.addIncludes",
      (args) => {
        addIncludes();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cpp-helper.addIncludeFor",
      (args) => {
        addIncludeFor();
      }
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new AddIncludeCodeAction(), {
      providedCodeActionKinds: AddIncludeCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new ForwardDeclarationCodeAction(), {
      providedCodeActionKinds: ForwardDeclarationCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new MoveImplCodeAction(), {
      providedCodeActionKinds: MoveImplCodeAction.providedCodeActionKinds
    }));


  context.subscriptions.push(diagnostics);
  vscode.window.registerTerminalLinkProvider(new GccTerminalLinkProvider())

  context.subscriptions.push(vscode.commands.registerCommand('cpp-helper.gccErrors', () => {
    buildAndReportGcc();
  }));
}



// this method is called when your extension is deactivated
export function deactivate() { }
