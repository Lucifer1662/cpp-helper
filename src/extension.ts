// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { AddAllIncludeCodeAction, AddIncludeCodeAction, addIncludeFor, addIncludes } from "./AddIncludes";
import { AddMissingFunctionsCodeAction } from "./AddMissingFunctions";
import { createConstr, CreateConstructorCodeAction } from "./CreateConstructor";
import { createDefaultConstr, CreateDefaultConstructorCodeAction } from "./CreateDefaultConstructor";
import { CreateDestructorCodeAction } from "./CreateDestructor";
import { ForwardDeclarationCodeAction } from "./ForwardDeclaration";
import { MoveImpAll, MoveImplCodeAction, MoveImpSelection } from "./MoveImpl";
import { moveToHeader, MoveToHeaderCodeAction } from "./MoveToHeader";
import { getConfiguration } from "./util";

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
    vscode.commands.registerCommand(
      "cpp-helper.addMissingVirtualFunctions",
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

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new CreateConstructorCodeAction(), {
      providedCodeActionKinds: CreateConstructorCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new CreateDefaultConstructorCodeAction(), {
      providedCodeActionKinds: CreateDefaultConstructorCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new CreateDestructorCodeAction(), {
      providedCodeActionKinds: CreateDestructorCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new AddAllIncludeCodeAction(), {
      providedCodeActionKinds: AddAllIncludeCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new MoveToHeaderCodeAction(), {
      providedCodeActionKinds: MoveToHeaderCodeAction.providedCodeActionKinds
    }));

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider('cpp', new AddMissingFunctionsCodeAction(), {
      providedCodeActionKinds: AddMissingFunctionsCodeAction.providedCodeActionKinds
    }));





}



// this method is called when your extension is deactivated
export function deactivate() { }
