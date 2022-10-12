import * as vscode from "vscode";
import { reservedWords } from "./reservedWords";


export async function GetDocument(uri: string) {
    return await vscode.workspace.openTextDocument(uri);
}

export async function GetSymbolsUri(uri: vscode.Uri) {
    let symbolss = await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider",
        uri
    );

    if (symbolss !== undefined)
        return symbolss as vscode.DocumentSymbol[];

    return [];
}

export async function GetSymbolsDoc(document: vscode.TextDocument) {
    return GetSymbolsUri(document.uri);
}

export async function GetSymbolsActiveDoc() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return GetSymbolsDoc(editor.document);
    }

    return [];
}

export async function GetSymbols(uri: string) {
    return GetSymbolsDoc(await GetDocument(uri));
}

export function ActiveDoc() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return editor.document;
    }

    return undefined;
}


export function ActivePos() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return editor.selection.active
    }

    return undefined;
}

export function ActiveSelection() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        return editor.selection;
    }

    return undefined;
}



export function IsHeader(document: vscode.TextDocument): boolean {
    return document.fileName.endsWith(".h");
}



export function RemoveSemi(statement: string): string {
    return statement.substring(0, statement.lastIndexOf(';'));
}

export function FindIncludeLocation(source: vscode.TextDocument){
    const text = source.getText();
    const includeIndex = text.lastIndexOf("#include");
    const pragmaIndex = text.lastIndexOf("#pragma once");
    
    let index = 0;

    if(includeIndex !== -1){
        index = includeIndex;
    }else if(pragmaIndex !== -1){
        index = pragmaIndex;
    }

    let insertionPos = source.positionAt(index);
    insertionPos = new vscode.Position(insertionPos.line+1, 0);
    return insertionPos;
}

export function extractAround(s:string, lhs: string, rhs:string){
    const start = s.indexOf(lhs)+lhs.length;
    const end = s.lastIndexOf(rhs);
    return s.substring(start, end)
}

export function InternalIncludes(text: string){
    return text.match(new RegExp('#include *".*"', 'g'))?.map(s=>extractAround(s,'"','"')) || [];
}

export function ExternalIncludes(text: string){
    return text.match(new RegExp('#include *<.*>', 'g'))?.map(s=>extractAround(s,'<','>')) || [];
}


export function GetIncludes(text: string){
    return [...InternalIncludes(text), ...ExternalIncludes(text)];
}

export function GetIncludePositions(doc: vscode.TextDocument){
    const includes = GetIncludes(doc.getText());
    const text = doc.getText();
    
    return includes.map(include=>doc.positionAt(text.indexOf(text)));
}

export function GetTail(s:string, del:string){
    return s.substring(s.lastIndexOf(del)+del.length);
}

export const configName = 'lukes-cpp-helper';


export interface Configuration{
    externalIncludeFolders: string[],
    haveInContextMenu: string[],
    fastQuickFix: boolean,
}

export function getConfiguration(){
    const config = vscode.workspace.getConfiguration(configName);
    return {
        externalIncludeFolders: config.get<string[]>('externalIncludeFolders'),
        haveInContextMenu: config.get<string[]>('haveInContextMenu'),
        fastQuickFix: config.get<boolean>('fastQuickFix'),
    } as Configuration
}

function getWords(text :string){
    return [...text.matchAll(new RegExp("[_|A-Z|a-z]+[:|_|A-Z|a-z|0-9]+", 'g'))];
}

export function GetElligibleMatches(text: string, allText: string) {

    const invalids = [...text.matchAll(new RegExp(`(?:\\/\\/(?:\\\\\\n|[^\\n])*\\n)|(?:\\/\\*[\\s\\S]*?\\*\\/)|((?:R"([^(\\\\\\s]{0,16})\\([^)]*\\)\\2")|(?:@"[^"]*?")|(?:"(?:\\?\\?'|\\\\\\\\|\\\\"|\\\\\\n|[^"])*?")|(?:'(?:\\\\\\\\|\\\\'|\\\\\\n|[^'])*?'))`, 'g'))]
    let matches = getWords(text);

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
            const includePositions = GetIncludes(allText);
            matches = matches.filter((s) => !includePositions.includes(s.toString()));

            const identifiers = [... new Set(matches)];
            return identifiers;

        } catch (e) { }
    }

    return []
}

export function lenMatch(match: RegExpMatchArray){
   return Math.max(...match.filter(s => s !== undefined).map(s => s.length));
}


export function MatchesAtCursor(source: vscode.TextDocument) {
    const pos = ActivePos()
    if (pos) {
        let line = source.lineAt(pos.line);

        const index = source.offsetAt(pos) - source.offsetAt(new vscode.Position(pos.line, 0));

        let identifiers = GetElligibleMatches(line.text, source.getText());
        identifiers = identifiers.filter(id => {
            if (id.index !== undefined) {
                const len = lenMatch(id);
                return id.index <= index && index < id.index + len;
            }
            return false;
        });

        return identifiers;
    }
    return [];
}

export function plainTextInRegex(s:string){
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}