import * as vscode from "vscode";


export interface Symbol {
    symbol: vscode.DocumentSymbol;
    scope: string[];
    parentChain: vscode.DocumentSymbol[];
    content: string;
    isDeclaration: boolean;
    document: vscode.TextDocument;
}


function createSymbol(document: vscode.TextDocument, scope: string[], symbol: vscode.DocumentSymbol,
    parentChain: vscode.DocumentSymbol[]) {
    const content = document.getText(symbol.range);
    const isDeclaration = IsFunctionDecOrImpl(content);

    let additionalScope: string[] = [];
    if (symbol.kind == 11) {
        additionalScope = symbol.detail.split("::");
    }
    const newScope = [...scope, ...additionalScope];
    return {
        scope: newScope, parentChain, symbol,
        content, isDeclaration, document,
    };
}



export function findToken(
    symbols: vscode.DocumentSymbol[],
    document: vscode.TextDocument,
    pos: vscode.Position,
    scope: string[] = [],
    parentChain: vscode.DocumentSymbol[] = [],
): Symbol | undefined {
    return symbols
        .map((symbol) => {
            if (symbol.range.contains(pos)) {
                if (symbol.children.length == 0) {
                    return createSymbol(document, scope, symbol, parentChain);
                } else {
                    let myScope = [...scope, symbol.name];
                    return findToken(symbol.children, document, pos, myScope, [...parentChain, symbol]);
                }
            }
            return undefined;
        })
        .filter((s) => s !== undefined)[0];
}

export function findElligbleTokens(
    symbols: vscode.DocumentSymbol[],
    document: vscode.TextDocument,
    scope: string[] = [],
    parentChain: vscode.DocumentSymbol[] = [],
): Symbol[] {
    return symbols.map((symbol) => {
        console.log(symbol);
        if (symbol.children.length == 0) {
            if (symbol.kind === 5) {
                return [createSymbol(document, scope, symbol, parentChain)];
            }
        } else {
            let myScope = [...scope, symbol.name];
            return findElligbleTokens(symbol.children, document,myScope, [...parentChain, symbol]);
        }
        return [];
    }).reduce((l, r) => [...l, ...r]);
}


export function GetBodyContent(s: Symbol): string | undefined {
    var ret = GetBody(s);
    return ret ? s.document.getText(ret) : undefined;
}

export function GetBody(s: Symbol): vscode.Range | undefined {
    if (s.isDeclaration) {
        return undefined;
    }

    var start = s.document.positionAt(
        s.document.offsetAt(s.symbol.range.start) + s.content.indexOf("{")
    );
    var end = s.document.positionAt(
        s.document.offsetAt(s.symbol.range.start) +
        s.content.lastIndexOf("}") +
        1
    );

    return new vscode.Range(start, end);
}

export function IsFunctionDecOrImpl(content: string) {
    return content.endsWith(";");
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
            else if (symbol.kind === 4 || symbol.kind === 22) {
                console.log({ found: symbol })
                return symbol
            }
        }
        return undefined;
    }).filter((s) => s !== undefined)[0];
}

export function findDeepestClassTokenWithScope(
    symbols: vscode.DocumentSymbol[],
    pos: vscode.Position,
    scope: string [] = []
): [vscode.DocumentSymbol, string[]] | undefined {
    if (symbols.length === 0)
        return undefined;

    return symbols.map((symbol) => {
        if (symbol.range.contains(pos)) {
            const deeperClass = findDeepestClassTokenWithScope(symbol.children, pos, [...scope, symbol.name]);
            if (deeperClass)
                return deeperClass;
            else if (symbol.kind === 4 || symbol.kind == 22) {
                console.log({ found: symbol })
                return [symbol, scope] as [vscode.DocumentSymbol, string[]];
            }
        }
        return undefined;
    }).filter((s) => s !== undefined)[0];
}


export function GetAttributes(classSymbol: vscode.DocumentSymbol) {
    return classSymbol.children.filter(s => s.kind === 7);
}

