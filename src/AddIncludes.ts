import * as vscode from "vscode";
import { ActiveDoc, ActivePos, FindIncludeLocation, getConfiguration, GetElligibleMatches, GetIncludes, GetTail, MatchesAtCursor, plainTextInRegex } from './util';
import { cppStdMap } from './cppStdMap'
const cppStdsIds = Object.keys(cppStdMap);


function longestMatch(l: string, r: string) {
    let index = 0;
    for (; index < l.length || index < r.length; index++) {
        if (l[index] !== r[index]) {
            break;
        }
    }

    const end = index;
    let res = l.substring(0, end);

    res = res.substring(0, res.lastIndexOf("/") + 1);

    return res;
}

function backslashesNeeded(s: string, local: string) {

    const numBackslashes = (local.substring(s.length).match(new RegExp("/", 'g')) || []).length;

    let slashes = ""
    for (let index = 0; index < numBackslashes; index++) {
        slashes += "../";
    }
    return slashes;
}


export async function GetIncludesFor(idPositions: vscode.Position[], identifiers: string[], giveAll: boolean, source: vscode.TextDocument) {

    let uris: vscode.Uri[] = [];
    let stds: string[] = []

    for (let index = 0; index < identifiers.length; index++) {

        const stdidentifier = identifiers[index].replace("std::", "");
        const isStd = cppStdsIds.includes(stdidentifier)
        if (isStd) {
            stds.push(cppStdMap[stdidentifier]);
        }


        if (!isStd || giveAll) {
            const location: vscode.Location[] = await vscode.commands.executeCommand(
                "vscode.executeDeclarationProvider",
                source.uri,
                idPositions[index]
            );

            if (giveAll) {
                uris.push(...location.map(l => l.uri));
            } else if (location.length > 0) {
                uris.push(location[0].uri);
            }
        }

    }

    uris = uris.filter(uri => uri.toString() !== source.uri.toString())
    uris = uris.filter(uri => !uri.path.endsWith(".c") && !uri.path.endsWith(".cpp"))

    const paths = uris;

    const workspaceFolders = vscode.workspace.workspaceFolders?.map(folder => folder.uri) || [];

    let localPaths: string[] = []
    let externalPaths: string[] = [];

    const config = getConfiguration();

    let ignoreFolderss = workspaceFolders.map(wf => config.externalIncludeFolders.map(ed => wf.toString() + "/" + ed));
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

    externalPaths = externalPaths.map(include => GetTail(include, "include/"))

    externalPaths = [...stds, ...externalPaths];
    externalPaths = [... new Set(externalPaths)]
    localPaths = [... new Set(localPaths)];

    source.uri.toString();


    localPaths = localPaths.map(s => vscode.Uri.parse(s, undefined)).map(uri => GetTail(uri.toString(), workspaceFolders[0].toString() + "/"))

    const local = GetTail(source.uri.toString(), workspaceFolders[0].toString() + "/")

    const longestMatches = localPaths.map(p => longestMatch(p, local));
    const backslashes = longestMatches.map(s => backslashesNeeded(s, local));

    const trimmedLocalPaths = localPaths.map((p,i)=>p.substring(longestMatches[i].length));
    const newLocalPaths = trimmedLocalPaths.map((p, i) => backslashes[i] + p);

    return { localPaths: newLocalPaths, externalPaths };

}

export function findExternalInclude(text: string, name: string) {
    const plain = plainTextInRegex(name);
    return text.match(`#include\\s*<${plain}>`) || [];
}

export function findInternalInclude(text: string, name: string) {
    const plain = plainTextInRegex(name);
    return text.match(`#include\\s*"${plain}"`) || [];
}

export function findExternalIncludeAll(text: string, name: string) {
    const plain = plainTextInRegex(name);
    return [...text.matchAll(new RegExp(`#include\\s*<${plain}>`, 'g'))];
}

export function findInternalIncludeAll(text: string, name: string) {
    const plain = plainTextInRegex(name);
    try {
        return [...text.matchAll(new RegExp(`#include\\s*"${plain}"`, 'g'))];
    } catch (e) {}
    return [];
}

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
        this.giveAll = giveAll;
    }

    private AddInternalIncludes(includes: string[], insertAt: vscode.Position) {
        const text = this.source.getText();
        includes.forEach(name => {
            try {
                const res = findInternalInclude(text, name);
                if (res.length === 0)
                    this.workEdits.insert(this.source.uri, insertAt, `#include "${name}"\n`)
            } catch (e) { }
        });
    }

    private AddExternalIncludes(includes: string[], insertAt: vscode.Position) {
        const text = this.source.getText();
        includes.forEach(name => {
            try {
                const res = findExternalInclude(text, name);
                if (res.length === 0)
                    this.workEdits.insert(this.source.uri, insertAt, `#include <${name}>\n`)
            } catch (e) { }

        });
    }


    public async AddIncludeAtCursor() {
        let identifiers = MatchesAtCursor(this.source);
        await this.AddIncludeForMatch(identifiers);
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

            const identifiers = GetElligibleMatches(text, this.source.getText());

            const idPositions = identifiers.filter(i => i.index !== undefined)
                //@ts-ignore
                .map((i) => i.index + i.length - 1)
                .map((i) => this.source.positionAt(i));

            await this.AddIncludesFor(idPositions, identifiers.map(s => s.toString()));

        } catch (e) { }
    }





    private async AddIncludesFor(idPositions: vscode.Position[], identifiers: string[]) {

        const { localPaths, externalPaths } = await GetIncludesFor(idPositions, identifiers, this.giveAll, this.source);

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

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {

        const adder = new AddIncludes(source, [], true);


        let identifiers = MatchesAtCursor(adder.source);
        if (identifiers.length === 0)
            return undefined;

        await adder.AddIncludeForMatch(identifiers);

        return adder.workEdits.get(source.uri).map(edit => {
            const fix = new vscode.CodeAction(edit.newText, vscode.CodeActionKind.QuickFix);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.set(source.uri, [edit]);
            return fix;
        })


    }

}


