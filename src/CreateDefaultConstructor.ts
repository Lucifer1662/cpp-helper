import * as vscode from "vscode";
import { findDeepestClassToken } from "./Symbol";
import { ActiveDoc, GetSymbolsDoc, ActivePos, RemoveSemi } from './util';



class CreateDefaultConstructor {
    source: vscode.TextDocument;
    srcSymbols: vscode.DocumentSymbol[] = [];
    selection: vscode.Position;
    workEdits = new vscode.WorkspaceEdit();
    classSymbol?: vscode.DocumentSymbol;


    constructor(
        source: vscode.TextDocument,
        srcSymbols: vscode.DocumentSymbol[] = [],
        selection: vscode.Position,
    ) {
        this.source = source;
        this.srcSymbols = srcSymbols;
        this.selection = selection;
        this.classSymbol = findDeepestClassToken(srcSymbols, selection);
    }

    IsInsideClass(){
        return this.classSymbol !== undefined;
    }

    GetContent(symbol: vscode.DocumentSymbol) {
        return this.source.getText(symbol.range);
    }


    CreateDefaultConstructor() {
        if (this.classSymbol) {
            var content = "";
            const name = this.classSymbol.name;

            content += `${name}() = default;\n`
            content += `${name}(const ${name}&) = default;\n`
            content += `${name}(${name}&&) = default;\n`
            content += `${name}& operator=(const ${name}&) = default;\n`


            this.workEdits.insert(this.source.uri, this.selection, content)
        }
    }

    async Create() {

        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();

        this.CreateDefaultConstructor();

        //apply edits
        vscode.workspace.applyEdit(this.workEdits);
    }

}


export async function createDefaultConstr() {
    await (await CreateCreateDefaultConstructor()).Create();
}

export async function CreateCreateDefaultConstructor(): Promise<CreateDefaultConstructor> {
    const source = ActiveDoc();
    const cursor = ActivePos();

    if (!source)
        throw "no active text exitor window";

    if (!cursor)
        throw "no active cursor exitor window";

    return new CreateDefaultConstructor(source, await GetSymbolsDoc(source), cursor);
}




export class CreateDefaultConstructorCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        const createConstructor = await CreateCreateDefaultConstructor();

        if(!createConstructor.IsInsideClass()){
            return undefined;
        }

        await createConstructor.CreateDefaultConstructor();

        const fix = new vscode.CodeAction("Create Default Constructor", vscode.CodeActionKind.QuickFix);
        fix.edit =  createConstructor.workEdits;
        return [fix];

    }

}

