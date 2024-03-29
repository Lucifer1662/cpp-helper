import * as vscode from "vscode";
import { indexOfButIgnoreBrackets } from "./AddMissingFunctions";
import { findDeepestClassTokenWithScope, GetAttributes } from "./Symbol";
import { ActiveDoc, GetSymbolsDoc, ActivePos, RemoveSemi, extractAround, getConfiguration } from './util';



class CreateConstructor {
    source: vscode.TextDocument;
    srcSymbols: vscode.DocumentSymbol[] = [];
    selection: vscode.Position;
    workEdits = new vscode.WorkspaceEdit();
    classSymbol?: vscode.DocumentSymbol;
    classScope: string = "";
    attributes: vscode.DocumentSymbol[] = [];


    constructor(
        source: vscode.TextDocument,
        srcSymbols: vscode.DocumentSymbol[] = [],
        selection: vscode.Position,
    ) {
        this.source = source;
        this.srcSymbols = srcSymbols;
        this.selection = selection;
        let deepClass = findDeepestClassTokenWithScope(srcSymbols, selection);
        if (deepClass) {
            this.classSymbol = deepClass[0];
            deepClass[1].push(this.classSymbol.name);
            this.classScope = deepClass[1].reduce((l, r) => l + "::" + r) + "::";
            this.attributes = GetAttributes(this.classSymbol);
            this.attributes = this.attributes.sort((l,r)=>this.source.offsetAt(l.range.start)-this.source.offsetAt(r.range.start))
        }
    }

    IsInsideClass(){
        return this.classSymbol !== undefined;
    }


    async GetContent(symbol: vscode.DocumentSymbol) {
        const p = ActivePos();
        if (p) {
            let hints = await vscode.commands.executeCommand(
                "vscode.executeHoverProvider",
                this.source.uri,
                symbol.selectionRange.start
            );


            try {
                //@ts-ignore
                let content: string[] = hints.map(h => h.contents.map(w => w.value).filter(w => w.startsWith("```cpp"))).reduce((l, r) => [...l, ...r]);
                if (content.length > 0 && !content[0].includes("<error-type>")) {
                    let res = extractAround(content[0], "```cpp\n", "\n```");
                    if(res.startsWith("template")){
                        res = res.replace("template", "")
                        res = res.substring(indexOfButIgnoreBrackets(res, " ")+1)
                    }
                    res = res.replace(new RegExp(this.classScope, 'g'), "");
                    return res;
                }
            } catch (e) {}
                const text = this.source.getText(symbol.range);
                return text.replace(";", "");;
        }

    }

    async GetContents() {
        let contents: string[] = []
        for (let i = 0; i < this.attributes.length; i++) {
            const c = await this.GetContent(this.attributes[i])
            if(c)
                contents.push(c);
        }
        return contents;
    }


    public async CreateConstructor() {
        if (this.classSymbol) {
            var content = "";
            content += this.classSymbol.name
            content += "("


            const variables: string[] = await this.GetContents()

            variables.forEach((variable, index) => {
                content += variable;
                if (index != this.attributes.length - 1) {
                    content += ","
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

        await this.CreateConstructor();

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




export class CreateConstructorCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        if(getConfiguration().fastQuickFix){
            const fix = new vscode.CodeAction("Create Constructor", vscode.CodeActionKind.QuickFix);
            fix.command = { command: "cpp-helper.moveImplementation", title: "Create Constructor" } as vscode.Command;
            return [fix];
        }
        
        const createConstructor = await CreateCreateConstructor();

        if(!createConstructor.IsInsideClass()){
            return undefined;
        }

        await createConstructor.CreateConstructor();

        const fix = new vscode.CodeAction("Create Constructor", vscode.CodeActionKind.QuickFix);
        fix.edit =  createConstructor.workEdits;
        return [fix];

    }

}