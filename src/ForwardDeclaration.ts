import { TextEncoder } from "util";
import * as vscode from "vscode";
import { GetDocument, MatchesAtCursor, FindIncludeLocation, lenMatch, plainTextInRegex } from './util';

import { findExternalIncludeAll, findInternalIncludeAll, GetIncludesFor } from "./AddIncludes";



export class ForwardDeclarationCodeAction implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
    ];

    public async provideCodeActions(source: vscode.TextDocument, range: vscode.Range): Promise<vscode.CodeAction[] | undefined> {

        const uri = source.uri.path.substring(0, source.uri.path.lastIndexOf(".")) + ".cpp";

        let identifiers = MatchesAtCursor(source);
        if (identifiers.length === 0)
            return undefined;

        const ids = [identifiers[0]]

        const { localPaths, externalPaths } = await GetIncludesFor([range.start], ids.map(id => id.toString()), true, source);

        const locals = localPaths.map(p => {
            return findInternalIncludeAll(source.getText(), p);
        }).reduce((l, r) => 
        [...l, ...r], []);

        const externs = externalPaths.map(p => {
            return findExternalIncludeAll(source.getText(), p);
        }).reduce((l, r) => [...l, ...r], []);

        const toBeDeleted = [...locals, ...externs];

        const edits = new vscode.WorkspaceEdit();
        toBeDeleted.forEach(include => {
            if (include.index !== undefined)
                edits.delete(source.uri,
                    new vscode.Range(
                        source.positionAt(include.index),
                        source.positionAt(include.index + lenMatch(include))
                    ));
        });

        edits.insert(source.uri, FindIncludeLocation(source), "struct " + ids[0].toString() + ";\n");

        try {
            const cppDestination = await GetDocument(uri);
            toBeDeleted
            .filter(s=>cppDestination.getText().match(plainTextInRegex(s.toString())) === null)
            .forEach(include=>{
                edits.insert(cppDestination.uri, FindIncludeLocation(cppDestination), include.toString());
            });

        } catch (e) {}


        const fix = new vscode.CodeAction("Forward declare", vscode.CodeActionKind.QuickFix);
        fix.edit =  edits;
        return [fix];

    }

}


