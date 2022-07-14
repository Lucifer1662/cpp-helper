import * as vscode from "vscode";
import * as cp from "child_process";
import { diagnostics, getConfiguration, lenMatch, outputChan } from "./util";




const terminalName = "Gcc Build";

let globalTerminal : vscode.Terminal | undefined = undefined;


export async function buildAndReportGcc() {

    const writeEmitter = new vscode.EventEmitter<string>();

    const show = async () => {
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Gcc building",
            cancellable: true
        }, async (progress, token) => {
            const workspaceFolders = vscode.workspace.workspaceFolders?.map(folder => folder.uri) || [];
            let cmds = getConfiguration().buildAndReportGccCmds;

           

            if (workspaceFolders.length > 0 && cmds.length > 0) {
                cmds = cmds.map(cmd => cmd.replace("${workspaceFolder}", workspaceFolders[0].fsPath))
                let cmd = cmds[0];
                if (cmd) {
                    progress.report({
                        message: 'Running: ' + cmd
                    });
                    const controller = new AbortController();
                    const { signal } = controller;
                    const process = cp.exec(cmd, { signal, cwd: workspaceFolders[0].fsPath}, (err, res) => {
                        const text = parseResponse(err?.message || res);
                        writeEmitter.fire(text);
                        outputChan.append("Res: " + res);
                        outputChan.append("Err: " + err?.message || "");
                    });

                    process.stdout?.on("data", (data)=>{
                        writeEmitter.fire(data);
                    });
                    process.stdout?.on("error", (data)=>{
                        writeEmitter.fire(data.message);
                    })


                    token.onCancellationRequested(() => {
                        controller.abort();
                    });

                }
            }


            const p = new Promise<void>(resolve => {
                setTimeout(() => {
					resolve();
				}, 2500);
            });

            return p;
        });




    }

    let line = '';
    const pty = {
        onDidWrite: writeEmitter.event,
        open: show,
        close: () => { /* noop*/ },
        handleInput: (data: string) => {
            show();
        }
    };
    
    if(globalTerminal == undefined){
        globalTerminal = vscode.window.createTerminal({ name: terminalName, pty });
    }

    if(globalTerminal){
        globalTerminal.show();
    }


    return;

}


function colorText(text: string, colorIndex: number): string {
    return `\x1b[3${colorIndex}m${text}\x1b[0m`;
}


function colorTextPred(text: string, pred: (c: string) => number): string {
    let output = '';
    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        if (char === ' ' || char === '\r' || char === '\n') {
            output += char;
        } else {
            output += `\x1b[3${pred(char)}m${char}\x1b[0m`;
        }
    }
    return output;
}



function setColour(colours: number[], index: number, length: number, colour: number) {
    for (let i = index; i < index + length; i++) {
        if (colours[i] === 0) {
            colours[i] = colour;
        }
    }
}

function matchSetColour(text: string, colours: number[], regex: RegExp, colour: number) {
    try {
        const matches = [...text.matchAll(regex)];

        matches.forEach((match) => {
            if (match.index !== undefined) {
                setColour(colours, match.index, lenMatch(match), colour)
            }
        })
    } catch (e) {

    }
}

function applyColour(text: string, colours: number[]) {
    if (colours.length === 0)
        return "";

    let output = '';
    let currentColour = colours[0];
    let startColor = 0;
    for (let i = 1; i < text.length; i++) {
        if (colours[i] !== currentColour || i == text.length - 1) {
            output += colorText(text.substring(startColor, i), currentColour);
            currentColour = colours[i];
            startColor = i;
        }
    }

    return output;
}

const codeExampleRegex = / +\d*\s+\|.*/g;


function colorContent(text: string): string {
    let colors = Array(text.length).fill(0);

    //paths
    matchSetColour(text, colors, /[:a-zA-Z0-9\\-_/\.\+]*:(\d+| )/g, 5);

    //code example
    matchSetColour(text, colors, codeExampleRegex, 3);

    //plain text
    matchSetColour(text, colors, /([^\u2019:\n])*\u2018/g, 4);
    matchSetColour(text, colors, /\u2018/g, 4);
    matchSetColour(text, colors, /\u2019(.)*/g, 4);



    return applyColour(text, colors);
}

const lineDelim = ", Line: ";


function parseResponse(text: string) {

    const matches = [...text.matchAll(new RegExp("((.*):(\\d+):(\\d+): ((error)|(note)): ).*", 'g'))];

    let notes = [];
    let errors: any = [];

    let lines: string[] = [];

    matches.forEach((m, i) => {
        if (m.index === undefined)
            return;

        const line = Number.parseInt(m[3]);
        const character = Number.parseInt(m[4]);

        if (m[5] === 'error') {
            let nextIndex = -1;
            if (matches.length > i + 1 && matches[i + 1].index !== undefined) {
                nextIndex = matches[i + 1].index as number;
            }


            const content = text.substring(m.index + m[1].length, nextIndex - 1);
            let errs = errors[m[2].toString()];
            if (!errs)
                errs = errors[m[2].toString()] = []

            const formattedContent = colorContent(content);

            errs.push({
                message: content.replace(codeExampleRegex, "").replace(/[\n]\s*[\n]+/g, "\n"), severity: vscode.DiagnosticSeverity.Error,
                range: new vscode.Range(
                    new vscode.Position(line - 1, character),
                    new vscode.Position(line - 1, character)),
                source: "Gcc - Luke cpp helper"
            }) as vscode.Diagnostic;

            lines.push(
                colorText("\r\n\r\n---------------------------------Error------------------------------------------", 1) +
                colorText(`\r\n${m[2].toString()}`, 1) +
                colorText(`${lineDelim}${line}`, 2) +
                "\r\n\r\n" + formattedContent + "\r\n"
            );
        }
    });

    outputChan.clear();

    lines = lines.reverse();
    lines.forEach(line => outputChan.appendLine(line));


    diagnostics.clear();
    Object.keys(errors).forEach(key => {
        diagnostics.set(vscode.Uri.file(key), errors[key]);
    });

    return lines.reduce((l, r) => l + r, '');
}



class GccTerminalLink implements vscode.TerminalLink {
    startIndex: number;
    length: number;
    tooltip?: string | undefined;
    uri: vscode.Uri;
    position: vscode.Position;

    constructor(startIndex: number, length: number, uri: vscode.Uri, position: vscode.Position, tooltip?: string) {
        this.startIndex = startIndex;
        this.length = length;
        this.tooltip = tooltip;
        this.uri = uri;
        this.position = position;
    }

    async Go() {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            await vscode.commands.executeCommand('vscode.open', this.uri);
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.selection = new vscode.Selection(this.position, this.position);
                editor.revealRange(new vscode.Range(this.position.translate(3), this.position.translate(-3)));
            }
        }
    }

}


export class GccTerminalLinkProvider implements vscode.TerminalLinkProvider<GccTerminalLink> {

    provideTerminalLinks(context: vscode.TerminalLinkContext, token: vscode.CancellationToken): vscode.ProviderResult<GccTerminalLink[]> {
        if (context.terminal.name === terminalName) {
            const delim = context.line.indexOf(lineDelim);
            if (delim !== -1) {
                const path = context.line.substring(0, delim);
                const line = Number.parseInt(context.line.substring(delim + lineDelim.length)) - 1
                const pos = new vscode.Position(line, 0);
                return [new GccTerminalLink(0, context.line.length, vscode.Uri.file(path), pos, context.line)]
            }

        }
        return [];
    }


    handleTerminalLink(link: GccTerminalLink): vscode.ProviderResult<void> {
        link.Go();
    }
}
