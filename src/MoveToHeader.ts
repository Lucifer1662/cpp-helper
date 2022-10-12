import { TextEncoder } from "util";
import * as vscode from "vscode";
import { GetDocument, ActiveDoc, ActiveSelection, GetSymbolsDoc, FindIncludeLocation, getConfiguration } from './util';



class MoveToHeader {
    source: vscode.TextDocument;
    destination?: vscode.TextDocument;
    destinationUri: string;
    destinationName: string;
    selection: vscode.Range;
    workEdits = new vscode.WorkspaceEdit();

    constructor(
        source: vscode.TextDocument,
        destinationUri: string,
        destinationName: string,
        selection: vscode.Range,
    ) {
        this.source = source;
        this.destinationUri = destinationUri;
        this.destinationName = destinationName;
        this.selection = selection;
    }


    private RemoveFromSource() {
        this.workEdits.delete(this.source.uri, this.selection);
    }

    private async CopyToDest(scope: string[]) {

        let lineNumber = 0;
        try {
            this.destination = await GetDocument(this.destinationUri);
            lineNumber = this.destination.lineCount + 1;
        } catch (e) {
            this.workEdits.createFile(vscode.Uri.file(this.destinationUri));
        }

        //if it is a new file
        if (!this.destination) {
            var fileContent = "#pragma once\n\n";
            this.workEdits.insert(vscode.Uri.file(this.destinationUri), new vscode.Position(0, 0), fileContent);
        }

        var content = "";

        if (scope.length > 0) {
            content += "\nnamespace "

            scope.forEach((s, index) => {
                content += s;
                if (index != scope.length - 1) {
                    content += "::";
                }
            })

            content += " {\n"
        }

        content += this.source.getText(this.selection);

        if (scope.length > 0) {
            content += "\n}"
        }

        this.workEdits.insert(vscode.Uri.file(this.destinationUri), new vscode.Position(lineNumber, 0), content)
    }

    private AddHeadersToSource() {
        let insertionPos = FindIncludeLocation(this.source);

        let content = `#include "${this.destinationName}"\n`;

        this.workEdits.insert(this.source.uri, insertionPos, content)
    }

    public async Move() {

        const symbols = await GetSymbolsDoc(this.source)
        const scopes = findDeepestNamespace(symbols, this.selection);

        //copy to cpp
        await this.CopyToDest(scopes);

        //add header to source
        this.AddHeadersToSource();

        //remove from header
        this.RemoveFromSource();
    }


    public async MoveApply() {
        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();

        await this.Move();

        //apply edits
        vscode.workspace.applyEdit(this.workEdits);
    }

}


export async function moveToHeader() {
    await (await CreateMoveToHeader()).MoveApply();
}


export async function CreateMoveToHeader(): Promise<MoveToHeader> {
    const source = ActiveDoc();
    const selection = ActiveSelection();

    if (selection === undefined) {
        throw "no selection";
    }

    if (source) {
        let name = await vscode.window.showInputBox({
            placeHolder: "Destination",
            prompt: "Enter destination file",
            value: ""
        });
        if (name) {
            name = name.replace(".h", "");

            const path = source.uri.path.substring(0, source.uri.path.lastIndexOf("/")) + "/" + name + ".h";
            return new MoveToHeader(source, path, name + ".h", selection);
        } else {
            throw "no name provided";
        }
    } else {
        throw "no active text editor window";
    }

}


function findDeepestNamespace(
    symbols: vscode.DocumentSymbol[],
    selection: vscode.Range,
    scope: string[] = []
): string[] {
    return symbols
        .map((symbol) => {
            if (symbol.range.contains(selection) &&
                !symbol.range.isEqual(selection) &&
                symbol.kind === 2) {
                let deepest = findDeepestNamespace(symbol.children, selection, [...scope, symbol.name]);
                if (deepest.length === 0) {
                    deepest = [...scope, symbol.name];
                }
                return deepest;
            } else {
                return [];
            }
        }).filter((s) => s.length !== 0)[0] || [];
}



export class MoveToHeaderCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        if (range.start.isEqual(range.end)) {
            return undefined;
        }

        if(getConfiguration().fastQuickFix){
            const fix = new vscode.CodeAction("Move to header", vscode.CodeActionKind.QuickFix);
            fix.command = { command: "cpp-helper.moveToHeader", title: "Move to header" } as vscode.Command;
            return [fix];
        }

        const fix = new vscode.CodeAction("Move to header", vscode.CodeActionKind.QuickFix);
        fix.command = { command: "cpp-helper.moveToHeader", title: "Move to header" } as vscode.Command;
        return [fix];
    }

}
