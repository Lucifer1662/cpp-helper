import * as vscode from "vscode";


export async function GetDocument(uri: string) {
    return await vscode.workspace.openTextDocument(uri);
}

export async function GetSymbolsDoc(document: vscode.TextDocument) {
    let symbolss = await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider",
        document.uri
    );

    if (symbolss !== undefined)
        return symbolss as vscode.DocumentSymbol[];

    return [];
}

export async function GetSymbolsActiveDoc() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return GetSymbolsDoc(editor.document);
    }

    return [];
}

export async function GetSymbols(uri: string) {
    return GetSymbolsDoc(await GetDocument(uri));
}

export function ActiveDoc() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return editor.document;
    }

    return undefined;
}


export function ActivePos() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return editor.selection.active
    }

    return undefined;
}



export function IsHeader(document: vscode.TextDocument): boolean {
    return document.fileName.endsWith(".h");
  }
  
