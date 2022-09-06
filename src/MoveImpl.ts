import { TextEncoder } from "util";
import * as vscode from "vscode";
import { GetDocument, ActiveDoc, GetSymbolsDoc, IsHeader, ActivePos } from './util';

import { Symbol, findElligbleTokens, findToken, GetBody } from './Symbol';


class MoveImpl {
    source: vscode.TextDocument;
    destination?: vscode.TextDocument;
    destinationUri: string;
    srcSymbols: Symbol[] = [];
    dstSymbols: vscode.DocumentSymbol[] = [];
    selection?: vscode.Position;
    workEdits = new vscode.WorkspaceEdit();


    constructor(
        source: vscode.TextDocument,
        destinationUri: string,
        srcSymbols: Symbol[] = [],
        selection?: vscode.Position,
    ) {
        this.source = source;
        this.srcSymbols = srcSymbols.filter((symbol) => {
            return symbol.symbol.kind === 11 || !symbol.isDeclaration
        });
        this.destinationUri = destinationUri;
        this.selection = selection;
    }


    async GetDestinationSymbols() {
        if (this.destination) {
            this.dstSymbols = await GetSymbolsDoc(this.destination);
        }
    }

    async GetDestination() {
        if (this.destination)
            return this.destination;
        try {
            return this.destination = await GetDocument(this.destinationUri);
        } catch (e) {
            // var fileContent = "";
            // let symbol = this.srcSymbols[0];
            // const fileName = symbol.document.fileName.substring(symbol.document.fileName.replace("/", "\\").lastIndexOf("\\") + 1);
            // fileContent += `#include \"${fileName}\"\n\n`;

            // let namespace = ""
            // symbol.parentChain.forEach(p => {
            //     if (p.kind == 2) {
            //         if (namespace != "") namespace += "::"
            //         namespace += p.name
            //     }
            // });

            // if (namespace !== "") {
            //     fileContent += `namespace ${namespace}{\n}\n`
            // }


            // var enc = new TextEncoder();
            // await vscode.workspace.fs.writeFile(
            //     vscode.Uri.file(this.destinationUri),
            //     enc.encode(fileContent)
            // );


        }

        //if it fails again throw excpetion
        return this.destination;

    }


    private RemoveImplFromDeclaration(symbol: Symbol) {
        var deleteRange = GetBody(symbol);
        if (deleteRange) {
            this.workEdits.delete(symbol.document.uri, deleteRange);
            this.workEdits.insert(symbol.document.uri, deleteRange.end, ";");
        }
    }

    private CopyToDest(symbol: Symbol) {
        let pos = { insertAt: new vscode.Position(2, 0), scopeUnFinished: [] } as DeepReturn;
        if (this.destination) {
            pos = InsertionPosition(this.destination, this.dstSymbols, symbol.scope);
        } else {
            var fileContent = "";
            let symbol = this.srcSymbols[0];
            
            const fileName = symbol.document.fileName.substring(symbol.document.fileName.replace(new RegExp("\/",'g'), "\\").lastIndexOf("\\") + 1);
            fileContent += `#include \"${fileName}\"\n\n`;

            let namespace = ""
            symbol.parentChain.forEach(p => {
                if (p.kind == 2) {
                    if (namespace != "") namespace += "::"
                    namespace += p.name
                }
            });

            if (namespace !== "") {
                fileContent += `namespace ${namespace}{\n}\n`
            }

            this.workEdits.createFile(vscode.Uri.file(this.destinationUri));
            this.workEdits.insert(vscode.Uri.file(this.destinationUri), new vscode.Position(0, 0), fileContent);

        }


        const { insertAt, scopeUnFinished } = pos;

        var content = "";

        const matchedScopeArray = symbol.scope.slice(0, symbol.scope.length - scopeUnFinished.length);
        let matchedScope = "";
        matchedScopeArray.forEach((s) => {
            matchedScope += s + "::";
        });

        var full = symbol.document.getText(symbol.symbol.range);

        let tabs = "\n";
        const tabsToRemove = symbol.symbol.range.start.character;

        for (let index = 0; index < tabsToRemove; index++) {
            tabs += " ";
        }

        full = full.replace(new RegExp(tabs, 'g'), "\n");

        full = full.replace(matchedScope, "");

        scopeUnFinished.forEach((s) => {
            if (s !== "")
                content += s + "::";
        });

        let mid = full.indexOf(this.source.getText(symbol.symbol.selectionRange));
        content = "\n\n" + full.substring(0, mid) + content + full.substring(mid);

        content += "\n\n";

        this.workEdits.insert(vscode.Uri.file(this.destinationUri), insertAt, content)
    }

    public isSelectionFunction() {
        return this.srcSymbols.length > 0;
    }

    public async MoveButDoNotApply() {
        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();
        if (this.srcSymbols.length == 0)
            return;

        await this.GetDestination();

        await this.GetDestinationSymbols();

        //copy to cpp
        this.srcSymbols.forEach(symbol => this.CopyToDest(symbol))
        //remove from header
        this.srcSymbols.forEach(symbol => this.RemoveImplFromDeclaration(symbol))

    }

    public async Move() {
        await this.MoveButDoNotApply();

        //apply edits
        vscode.workspace.applyEdit(this.workEdits);

    }

}

export async function MoveImpSelection() {
    await (await CreateMoveImpl(true)).Move();
}

export async function MoveImpAll() {
    await (await CreateMoveImpl(false)).Move();
}

async function CreateMoveImplFrom(source: vscode.TextDocument, selection: vscode.Position): Promise<MoveImpl> {
    if (source) {
        let symbols: Symbol[] = [];
        const s = findToken(await GetSymbolsDoc(source), source, selection);
        if (s) {
            symbols = [s]
        }
        const uri = source.uri.path.substring(0, source.uri.path.lastIndexOf(".")) + ".cpp";
        return new MoveImpl(source, uri, symbols);
    } else
        throw "no active text editor window";

}


export async function CreateMoveImpl(onlySelection: boolean): Promise<MoveImpl> {
    const source = ActiveDoc();
    const cursor = ActivePos();

    if (onlySelection && cursor === undefined) {
        throw "no active cursor";
    }

    if (source) {
        let selection: vscode.Position | undefined = undefined;
        if (onlySelection) {
            selection = cursor;
        }

        let symbols: Symbol[] = [];
        if (selection) {
            const s = findToken(await GetSymbolsDoc(source), source, selection);
            if (s) {
                symbols = [s]
            }
        } else {
            symbols = findElligbleTokens(await GetSymbolsDoc(source), source);
        }

        const uri = source.uri.path.substring(0, source.uri.path.lastIndexOf(".")) + ".cpp";
        return new MoveImpl(source, uri, symbols);
    } else
        throw "no active text editor window";

}



interface DeepReturn {
    insertAt: vscode.Position;
    scopeUnFinished: string[];
}


function InsertionPosition(document: vscode.TextDocument, symbols: vscode.DocumentSymbol[],
    scopes: string[]): DeepReturn {

    var ret = findDeepestNamespace(symbols, scopes);

    if (!ret) {
        return {
            insertAt: new vscode.Position(document.lineCount + 1, 0),
            scopeUnFinished: scopes
        };
    } else {
        ret.insertAt = document.positionAt(document.offsetAt(ret.insertAt) - 1);
        return ret;
    }
}


function findDeepestNamespace(
    symbols: vscode.DocumentSymbol[],
    scopes: string[]
): DeepReturn | undefined {
    if (scopes.length === 0) return undefined;

    let scope = scopes[0];
    let nextScopes = scopes.slice(1);

    return symbols
        .filter((s) => s.name === scope)
        .map((symbol) => {
            if (symbol.children.length == 0) {
                return {
                    insertAt: symbol.range.end,
                    scopeUnFinished: nextScopes,
                } as DeepReturn;
            } else {
                let deepest = findDeepestNamespace(symbol.children, nextScopes);
                if (deepest === undefined) {
                    deepest = {
                        insertAt: symbol.range.end,
                        scopeUnFinished: nextScopes,
                    } as DeepReturn;
                }
                return deepest;
            }
        })
        .filter((s) => s !== undefined)[0];
}


export class MoveImplCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {

        const mover = await CreateMoveImplFrom(source, range.start);
        if (!mover.isSelectionFunction())
            return undefined;


        await mover.MoveButDoNotApply();

        const fix = new vscode.CodeAction("Move to cpp", vscode.CodeActionKind.QuickFix);
        fix.edit = mover.workEdits;
        return [fix];
    }

}
