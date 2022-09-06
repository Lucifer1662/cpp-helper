import * as vscode from "vscode";
import { ActiveDoc, ActivePos, GetSymbolsUri, MatchesAtCursor, lenMatch, GetSymbols, GetSymbolsDoc } from './util';
import { findDeepestClassToken } from "./Symbol";


interface Symbol {
    symbol: vscode.DocumentSymbol,
    doc: vscode.TextDocument
}

async function GetInheritedClasses(idPositions: vscode.Position[], source: vscode.TextDocument) {
    let classes: Symbol[] = [];
    for (let index = 0; index < idPositions.length; index++) {
        const location: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDeclarationProvider",
            source.uri,
            idPositions[index]
        );


        if (location.length > 0) {
            const symbols = await GetSymbolsUri(location[0].uri);

            const classSymbol = findDeepestClassToken(symbols, location[0].range.start);
            if (classSymbol) {
                classes.push({
                    symbol: classSymbol,
                    doc: await vscode.workspace.openTextDocument(location[0].uri)
                });
            }
        }
    }

    return classes;
}

const brackets = ["{", "<", "[", "(", "}", ">", "]", ")"];
const brackToIndex: any = {
    "{": 0,
    "}": 0,
    "<": 1,
    ">": 1,
    "[": 2,
    "]": 2,
    "(": 3,
    ")": 3,
}

const brackIsOpen: any = {
    "{": true,
    "}": false,
    "<": true,
    ">": false,
    "[": true,
    "]": false,
    "(": true,
    ")": false,
}

export function indexOfButIgnoreBrackets(text: string, needle: string) {
    const stack = [0, 0, 0, 0];

    for (let i = 0; i < text.length - needle.length; i++) {
        const c = text[i];

        if (text.substring(i, i + needle.length) === needle && stack.every(x => x === 0)) {
            return i;
        }

        if (brackets.includes(c)) {
            stack[brackToIndex[c]] += brackIsOpen[c] ? 1 : -1;
            if (stack.includes(-1))
                return -1;
        }
    }

    return -1;
}

async function GetAllInheritedClasses(classSymbol: Symbol): Promise<Symbol[]> {
    const text = classSymbol.doc.getText(classSymbol.symbol.range);
    const start = text.indexOf(":") + 1;
    const end = text.indexOf("{");
    if (start >= end)
        return []

    const inheritedText = text.substring(start, end);


    const lookups: number[] = [0];
    let examine = inheritedText;
    for (; ;) {
        const comma = indexOfButIgnoreBrackets(examine, ",");
        if (comma === -1)
            break;
        examine = examine.substring(comma + 1);
        lookups.push(comma + 1);
    }

    let inheritedIndex: number[] = [];

    lookups.forEach(lookup => {
        const ms = [...inheritedText.substring(lookup).matchAll(/[^\s]+/g)];
        for (let index = 0; index < ms.length; index++) {
            let i = ms[index].index;
            if (i !== undefined
                && ms[index][0] !== "public"
                && ms[index][0] !== "protected"
                && ms[index][0] !== "private") {

                inheritedIndex.push(i);
                break
            }
        }
    })

    const positions = inheritedIndex.map((lookup) => classSymbol.doc.positionAt(classSymbol.doc.offsetAt(classSymbol.symbol.range.start) + start + lookup))

    const classes = await GetInheritedClasses(positions, classSymbol.doc);

    const recurseClasses = (await Promise.all(
        classes.map(GetAllInheritedClasses)))
        .flatMap(s => s);

    return [...classes, ...recurseClasses];
}



function GetFunctionsForClass(classSymbol: Symbol) {
    return classSymbol.symbol.children
        .filter(child => child.kind === 5)
        .map(child => classSymbol.doc.getText(child.range));
}


function GetFunctions(classes: Symbol[]) {
    return classes.flatMap(classSymbol => GetFunctionsForClass(classSymbol));
}

function GetVirtualFunctions(classes: Symbol[]) {
    return GetFunctions(classes).filter(child => child.startsWith("virtual"));
}

function GetFunctionDeclaration(func: string) {
    const squiggle = indexOfButIgnoreBrackets(func, "{");
    const equal = func.lastIndexOf("=");

    if (squiggle === -1 && equal === -1) {
        return func.trim();
    } else if (squiggle !== -1 && equal !== -1) {
        return func.substring(0, Math.min(squiggle, equal)).trim();
    } else if (squiggle !== -1) {
        return func.substring(0, squiggle).trim();
    } else {
        return func.substring(0, equal).trim();
    }
}


class AddMissingFunctions {
    source: vscode.TextDocument;
    srcSymbols: vscode.DocumentSymbol[] = [];
    public workEdits = new vscode.WorkspaceEdit();
    externalIncludeDirectories: string[] = [];
    classSymbol?: vscode.DocumentSymbol;
    selection: vscode.Position;


    constructor(
        source: vscode.TextDocument,
        srcSymbols: vscode.DocumentSymbol[] = [],
        selection: vscode.Position,
    ) {
        this.source = source;
        this.srcSymbols = srcSymbols;
        this.classSymbol = findDeepestClassToken(srcSymbols, selection);
        this.selection = selection;

    }

    public async AddFunctionsForMatch() {
        if (this.classSymbol) {
            const pos = this.selection;
            const classSymbol = this.classSymbol;

            const classes = await GetInheritedClasses([pos], this.source);

            classes.push(...(await Promise.all(
                classes.map(GetAllInheritedClasses)))
                .flatMap(s => s));


            const insertAt = this.source.positionAt(
                this.source.getText(this.classSymbol.range).lastIndexOf("}")
                + this.source.offsetAt(this.classSymbol.range.start));

            let content = "";


            const alreadyExistingFuncs = GetFunctionsForClass({ symbol: classSymbol, doc: this.source }).map(GetFunctionDeclaration);
            let newFuncs = (await GetVirtualFunctions(classes));
            newFuncs = [...new Set(newFuncs)].map(GetFunctionDeclaration);

            newFuncs.filter(func =>
                !alreadyExistingFuncs.includes(func)
            )
                .forEach(func => {
                    content += "\n" + func + "{}\n";
                });

            this.workEdits.insert(this.source.uri, insertAt, content);
        }
    }

}

export class AddMissingFunctionsCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {

        const adder = new AddMissingFunctions(source, await GetSymbolsDoc(source), range.start);

        let identifiers = MatchesAtCursor(adder.source);
        if (identifiers.length === 0)
            return undefined;

        await adder.AddFunctionsForMatch();

        if (adder.workEdits.entries().length === 0)
            return undefined;

        const fix = new vscode.CodeAction("Add base virtual functions", vscode.CodeActionKind.QuickFix);
        fix.edit = adder.workEdits;
        fix.command = {
            command: "editor.action.goToLocations",
            title: "Include All",
            arguments: [source.uri, fix.edit.entries()[0][1][0].range.start, [], 'goto']
        } as vscode.Command;

        return [fix];
    }

}

