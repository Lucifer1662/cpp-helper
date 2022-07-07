import * as vscode from "vscode";
import { reservedWords } from "./reservedWords";
import { ActiveDoc, ActivePos, configName, FindIncludeLocation, getConfiguration, GetIncludePositions, GetIncludes, GetTail, InternalIncludes } from './util';
import { cppStdMap } from './cppStdMap'
const cppStdsIds = Object.keys(cppStdMap);

class AddIncludes {
    source: vscode.TextDocument;
    srcSymbols: vscode.DocumentSymbol[] = [];
    public workEdits = new vscode.WorkspaceEdit();
    externalIncludeDirectories: string[] = [];
    giveAll: boolean;
    constructor(
        source: vscode.TextDocument,
        srcSymbols: vscode.DocumentSymbol[] = [],
        giveAll: boolean = false,
    ) {
        this.source = source;
        this.srcSymbols = srcSymbols;
        const config = getConfiguration();
        this.externalIncludeDirectories = config.externalIncludeFolders;
        this.giveAll = giveAll;
    }

    private AddInternalIncludes(includes: string[], insertAt: vscode.Position) {
        const text = this.source.getText();
        includes.map(include => GetTail(include, "/")).forEach(name => {
            const res = text.match(`#include\\s*"${name}"`);
            if (res === null || res.length === 0)
                this.workEdits.insert(this.source.uri, insertAt, `#include "${name}"\n`)
        });
    }

    private AddExternalIncludes(includes: string[], insertAt: vscode.Position) {
        const text = this.source.getText();
        includes.map(include => GetTail(include, "/")).forEach(name => {
            const res = text.match(`#include\\s*<${name}>`);
            if (res === null || res.length === 0)
                this.workEdits.insert(this.source.uri, insertAt, `#include <${name}>\n`)
        });
    }

    public async MatchesAtCursor() {
        const pos = ActivePos()
        if (pos) {
            let line = this.source.lineAt(pos.line);

            const index = this.source.offsetAt(pos) - this.source.offsetAt(new vscode.Position(pos.line, 0));

            let identifiers = this.GetElligibleMatches(line.text);
            identifiers = identifiers.filter(id => {
                if (id.index) {
                    const len = Math.max(...id.filter(s => s !== undefined).map(s => s.length))
                    return id.index <= index && index < id.index + len;
                }
                return false;
            });

            return identifiers;
        }
        return [];
    }

    public async AddIncludeAtCursor() {
        let identifiers = await this.MatchesAtCursor();
        this.AddIncludeForMatch(identifiers);
    }

    public async AddIncludeForMatch(identifiers: RegExpMatchArray[]) {
        const pos = ActivePos()
        if (pos) {
            if (identifiers.length > 0) {
                await this.AddIncludesFor([pos], [identifiers[0].toString()]);
            }
        }
    }

    public async AddIncludes() {
        try {
            let text = this.source.getText();

            const identifiers = this.GetElligibleMatches(text);

            const idPositions = identifiers.filter(i => i.index !== undefined)
                //@ts-ignore
                .map((i) => i.index + i.length - 1)
                .map((i) => this.source.positionAt(i));

            await this.AddIncludesFor(idPositions, identifiers.map(s => s.toString()));

        } catch (e) { }
    }

    private GetElligibleMatches(text: string) {

        const invalids = [...text.matchAll(new RegExp(`(?:\\/\\/(?:\\\\\\n|[^\\n])*\\n)|(?:\\/\\*[\\s\\S]*?\\*\\/)|((?:R"([^(\\\\\\s]{0,16})\\([^)]*\\)\\2")|(?:@"[^"]*?")|(?:"(?:\\?\\?'|\\\\\\\\|\\\\"|\\\\\\n|[^"])*?")|(?:'(?:\\\\\\\\|\\\\'|\\\\\\n|[^'])*?'))`, 'g'))]
        let matches = [...text.matchAll(new RegExp("[_|A-Z|a-z]+[:|_|A-Z|a-z|0-9]+", 'g'))];

        matches = matches.filter(match =>
            invalids.every(invalid => {
                if (!match.index)
                    return false;
                if (invalid.index) {
                    const len = Math.max(...invalid.filter(s => s !== undefined).map(s => s.length))
                    //check that the match is outside the invalids range
                    const outside = invalid.index > match.index || match.index >= invalid.index + len;
                    return outside;
                } else {
                    return true;
                }
            })
        );

        if (matches) {
            try {
                matches = matches.filter((s) => !reservedWords.includes(s.toString()));

                //remove include matches
                const includePositions = GetIncludes(this.source.getText());
                matches = matches.filter((s) => !includePositions.includes(s.toString()));

                const identifiers = [... new Set(matches)];
                return identifiers;

            } catch (e) { }
        }

        return []
    }


    private async AddIncludesFor(idPositions: vscode.Position[], identifiers: string[]) {

        let uris: vscode.Uri[] = [];
        let stds: string[] = []

        for (let index = 0; index < identifiers.length; index++) {

            const stdidentifier = identifiers[index].replace("std::", "");
            const isStd = cppStdsIds.includes(stdidentifier)
            if (isStd) {
                stds.push(cppStdMap[stdidentifier]);
            }

            if(!isStd || this.giveAll){
                const location: vscode.Location[] = await vscode.commands.executeCommand(
                    "vscode.executeDeclarationProvider",
                    this.source.uri,
                    idPositions[index]
                );

                if(this.giveAll){
                    uris.push(...location.map(l => l.uri));
                }else if(location.length > 0) {
                    uris.push(location[0].uri);
                }
            }

        }

        uris = uris.filter(uri => uri.toString() !== this.source.uri.toString())
        uris = uris.filter(uri => !uri.path.endsWith(".c") && !uri.path.endsWith(".cpp"))

        const paths = uris;

        const workspaceFolders = vscode.workspace.workspaceFolders?.map(folder => folder.uri) || [];

        let localPaths: string[] = []
        let externalPaths: string[] = [];

        let ignoreFolderss = workspaceFolders.map(wf => this.externalIncludeDirectories.map(ed => wf.toString() + "/" + ed));
        let ignoreFolders: string[] = []
        if (ignoreFolderss.length > 0) {
            ignoreFolders = ignoreFolderss.reduce((l, r) => [...l, ...r]);
        }

        //have to use .toString instead .path as drive letters are inconsientally capitalized 
        paths.forEach(path => {
            const isOutsideWorkspace = workspaceFolders.every((wf => !path.toString().startsWith(wf.toString())));
            if (isOutsideWorkspace) {
                externalPaths.push(path.path);
            } else {
                const matchesExternalIncludeIgnore = ignoreFolders.some((ignore => path.toString().startsWith(ignore)));
                if (matchesExternalIncludeIgnore) {
                    externalPaths.push(path.path);
                } else {
                    localPaths.push(path.path);
                }

            }
        })

        // let localPaths = paths.filter(path => workspaceFolders.some((wf => path.toString().startsWith(wf.toString())))).map(u => u.path)
        // let externalPaths = paths.filter(path => workspaceFolders.every((wf => !path.toString().startsWith(wf.toString())))).map(u => u.path)

        externalPaths = [ ...stds, ...externalPaths];
        externalPaths = [... new Set(externalPaths)]
        localPaths = [... new Set(localPaths)]

        const insertPos = FindIncludeLocation(this.source);
        this.AddExternalIncludes(externalPaths, insertPos);
        this.AddInternalIncludes(localPaths, insertPos);
    }

    public async CreateAll() {

        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();

        await this.AddIncludes();

        //apply edits
        vscode.workspace.applyEdit(this.workEdits);
    }

    public async CreateAt() {

        //create new work edits
        this.workEdits = new vscode.WorkspaceEdit();

        await this.AddIncludeAtCursor();
        //apply edits
        vscode.workspace.applyEdit(this.workEdits);
    }


}


export async function addIncludes() {
    await CreateAddIncludes().CreateAll();
}

export async function addIncludeFor() {
    await CreateAddIncludes().CreateAt();
}

export function CreateAddIncludes() {
    const source = ActiveDoc();

    if (!source)
        throw "no active text exitor window";

    return new AddIncludes(source);
}


export class AddIncludeCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {
        
        const source = ActiveDoc();

        if (!source)
            throw "no active text exitor window";
    
        const adder = new AddIncludes(source, [], true);


        let identifiers = await adder.MatchesAtCursor();
        if (identifiers.length === 0)
            return undefined;

        await adder.AddIncludeForMatch(identifiers);

        return adder.workEdits.get(document.uri).map(edit => {
            const fix = new vscode.CodeAction(edit.newText, vscode.CodeActionKind.QuickFix);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.set(document.uri, [edit]);
            return fix;
        })


    }

}


