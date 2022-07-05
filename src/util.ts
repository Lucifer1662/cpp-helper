import * as vscode from "vscode";


export async function GetDocument(uri: string) {
    return await vscode.workspace.openTextDocument(uri);
}

export async function GetSymbolsDoc(document: vscode.TextDocument) {
    let symbolss = await vscode.commands.executeCommand(
        "vscode.executeDocumentSymbolProvider",
        document.uri
    );

    if (symbolss !== undefined)
        return symbolss as vscode.DocumentSymbol[];

    return [];
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
    return s.substring(s.lastIndexOf(del)+1);
}

export const configName = 'lukes-cpp-helper';


export interface Configuration{
    externalIncludeFolders: string[]
}

export function getConfiguration(){
    const config = vscode.workspace.getConfiguration(configName);
    return {
        externalIncludeFolders: config.get<string[]>('externalIncludeFolders'),
    } as Configuration
}