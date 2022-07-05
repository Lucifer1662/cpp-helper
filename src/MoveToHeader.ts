import { TextEncoder } from "util";
import * as vscode from "vscode";
import { GetDocument, ActiveDoc, ActiveSelection, GetSymbolsDoc, FindIncludeLocation } from './util';



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


    async GetDestination() {
        if (this.destination)
            return this.destination;
        try {
            return this.destination = await GetDocument(this.destinationUri);
        } catch (e) {
            var fileContent = "#pragma once\n\n";

            var enc = new TextEncoder();
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(this.destinationUri),
                enc.encode(fileContent)
            );
        }

        //if it fails again throw exception
        return this.destination = await vscode.workspace.openTextDocument(this.destinationUri);

    }


    private RemoveFromSource() {
        this.workEdits.delete(this.source.uri, this.selection);
    }

    private CopyToDest(scope: string[]) {
        if (this.destination) {
            var content = "";

            if (scope.length > 0) {
                content += "namespace "

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

            this.workEdits.insert(vscode.Uri.file(this.destinationUri), new vscode.Position(this.destination.lineCount + 1, 0), content)
        }
    }

    private AddHeadersToSource(){
        let insertionPos = FindIncludeLocation(this.source);

        let content = `#include "${this.destinationName}"\n`;

        this.workEdits.insert(this.source.uri, insertionPos, content)
    }



    public async Move() {
        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();

        await this.GetDestination();

        const symbols = await GetSymbolsDoc(this.source)
        const scopes = findDeepestNamespace(symbols, this.selection);

        //copy to cpp
        this.CopyToDest(scopes);

        //add header to source
        this.AddHeadersToSource();

        //remove from header
        this.RemoveFromSource();

        //apply edits
        vscode.workspace.applyEdit(this.workEdits);
    }

}


export async function moveToHeader() {
    await (await CreateMoveToHeader()).Move();
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

