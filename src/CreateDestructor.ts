import * as vscode from "vscode";
import { findDeepestClassToken } from "./Symbol";
import { GetSymbolsDoc } from "./util";


class CreateDestructor {
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


    CreateDefaultConstructor(isVirtual: boolean) {
        this.workEdits = new vscode.WorkspaceEdit();

        if (this.classSymbol) {
            var content = "";
            const name = this.classSymbol.name;

            if(isVirtual){
                content += "virtual "
            }

            content += `~${name}() = default;\n`

            this.workEdits.insert(this.source.uri, this.selection, content)
        }
    }

}







export class CreateDestructorCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        
       const createConstructor = new CreateDestructor(source, await GetSymbolsDoc(source), range.start);


        if(!createConstructor.IsInsideClass()){
            return undefined;
        }

        await createConstructor.CreateDefaultConstructor(false);
        const fix = new vscode.CodeAction("Create Destructor", vscode.CodeActionKind.QuickFix);
        fix.edit =  createConstructor.workEdits;

        await createConstructor.CreateDefaultConstructor(true);
        const fixVirtual = new vscode.CodeAction("Create Virtual Destructor", vscode.CodeActionKind.QuickFix);
        fixVirtual.edit =  createConstructor.workEdits;
        return [fix, fixVirtual];

    }

}
