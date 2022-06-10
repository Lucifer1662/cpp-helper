import * as vscode from "vscode";
import { ActiveDoc, GetSymbolsDoc, ActivePos, RemoveSemi } from './util';



class CreateConstructor {
    source: vscode.TextDocument;
    srcSymbols: vscode.DocumentSymbol[] = [];
    selection: vscode.Position;
    workEdits = new vscode.WorkspaceEdit();
    classSymbol?: vscode.DocumentSymbol;
    attributes: vscode.DocumentSymbol[] = [];


    constructor(
        source: vscode.TextDocument,
        srcSymbols: vscode.DocumentSymbol[] = [],
        selection: vscode.Position,
    ) {
        this.source = source;
        this.srcSymbols = srcSymbols;
        this.selection = selection;
        this.classSymbol = findDeepestClassToken(srcSymbols, selection);
        if (this.classSymbol)
            this.attributes = GetAttributes(this.classSymbol);
    }

    GetContent(symbol: vscode.DocumentSymbol) {
        return this.source.getText(symbol.range);
    }


    private CreateConstructor() {
        if (this.classSymbol) {
            var content = "";
            content += this.classSymbol.name
            content += "("

            this.attributes.forEach((atrib, index) => {
                content += RemoveSemi(this.GetContent(atrib));
                if (index != this.attributes.length - 1) {
                    content += ","
                    content += "\n"

                }
            })


            content += ")\n";

            if (this.attributes.length > 0)
                content += ":";


            this.attributes.forEach((atrib, index) => {
                content += `${atrib.name}(${atrib.name})`; 
                if (index != this.attributes.length - 1) {
                    content += "\n"
                    content += ","
                }
            })


            content += "{}\n"


            this.workEdits.insert(this.source.uri, this.selection, content)
        }
    }

    public async Create() {

        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();

        this.CreateConstructor();

        //apply edits
        vscode.workspace.applyEdit(this.workEdits);
    }

}


export async function createConstr() {
    await (await CreateCreateConstructor()).Create();
}

export async function CreateCreateConstructor(): Promise<CreateConstructor> {
    const source = ActiveDoc();
    const cursor = ActivePos();

    if (!source)
        throw "no active text exitor window";

    if (!cursor)
        throw "no active cursor exitor window";

    return new CreateConstructor(source, await GetSymbolsDoc(source), cursor);
}


export function findDeepestClassToken(
    symbols: vscode.DocumentSymbol[],
    pos: vscode.Position,
): vscode.DocumentSymbol | undefined {
    if (symbols.length === 0)
        return undefined;

    return symbols.map((symbol) => {
        if (symbol.range.contains(pos)) {
            const deeperClass = findDeepestClassToken(symbol.children, pos);
            if (deeperClass)
                return deeperClass;
            else if (symbol.kind === 4) {
                console.log({ found: symbol })
                return symbol
            }
        }
        return undefined;
    }).filter((s) => s !== undefined)[0];
}


function GetAttributes(classSymbol: vscode.DocumentSymbol) {
    return classSymbol.children.filter(s => s.kind === 7);
}

