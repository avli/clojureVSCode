'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
    nREPLClient
} from './nreplClient';

import {
    ClojureProvider
} from './clojureProvider';

interface ErrorDescription {
    position: vscode.Position,
        message: string
}

export class ClojureEvaluator extends ClojureProvider {

    public eval() {

        let editor = vscode.window.activeTextEditor;
        let text: string = editor.document.getText();
        let ns = this.getNamespace(text);
        let isSelection = !editor.selection.isEmpty;

        if (isSelection) {
            let selection = editor.selection;
            text = `(ns ${ns}) ${editor.document.getText(selection)}`;
        }

        let diagnostics = vscode.languages.createDiagnosticCollection('Compilation Errors');
        diagnostics.clear();
        let nrepl = this.getNREPL();
        nrepl.eval(text, (result) => {
            console.log(result);
            if (result.value) {
                vscode.window.showInformationMessage('Successfully compiled')
                diagnostics.clear();
            } else if (result.status) {
                nrepl.stacktrace(result.session, (stackteace) => {
                    vscode.window.showErrorMessage('Compilation error')
                    let errorDescription = this.parseError(stackteace.err);
                    let errLine = errorDescription.position.line;
                    let errChar = errorDescription.position.character;
                    let errMsg = errorDescription.message;
                    editor.selection = new vscode.Selection(errorDescription.position, errorDescription.position);
                    let errLineLength = editor.document.lineAt(errLine).text.length;
                    diagnostics.set(vscode.window.activeTextEditor.document.uri, [new vscode.Diagnostic(new vscode.Range(errLine, 0, errLine, errLineLength), errMsg, vscode.DiagnosticSeverity.Error)]);
                })
            }
        })
    }

    public parseError(error: string): ErrorDescription {
        let m = error.match(/(\d+):(\d+)/);
        if (m) {
            let [line, char] = [Number.parseInt(m[1]), Number.parseInt(m[2])];
            return {
                position: new vscode.Position(line - 1, char),
                message: error
            }
        } else {
            // TODO
        }
    }

}

export function clojureEval(context: vscode.ExtensionContext) {

    let editor = vscode.window.activeTextEditor;
    let text: string = editor.document.getText();
    let ns: string = text.match(/^.*\((?:[\s\t\n]*(?:in-){0,1}ns)[\s\t\n]+'?(\w+)[\s\S]*\)[\s\S]*/)[1] || 'user';
    let isSelection = !editor.selection.isEmpty;

    if (isSelection) {
        let selection = editor.selection;
        text = `(ns ${ns}) ${editor.document.getText(selection)}`;
    }

    let port = context.workspaceState.get < number > ('port');
    let host = context.workspaceState.get < string > ('host');

    if ((!port) || (!host)) {
        vscode.window.showInformationMessage('You should connect to nREPL first to evaluate code.')
        return;
    }

    let filename = editor.document.fileName;

    let nrepl = new nREPLClient(port, host);
    let diagnostics = vscode.languages.createDiagnosticCollection('Compilation Errors');
    diagnostics.clear();
    nrepl.evalFile(text, filename, (result) => {
        console.log(result);
        if (result.value) {
            vscode.window.showInformationMessage('Successfully compiled')
            diagnostics.clear();
        } else if (result.status) {
            nrepl.stacktrace(result.session, (stackteace) => {
                vscode.window.showErrorMessage('Compilation error')
                let errorDescription = parseError(stackteace.err);
                let errLine = errorDescription.position.line;
                let errChar = errorDescription.position.character;
                let errMsg = errorDescription.message;
                editor.selection = new vscode.Selection(errorDescription.position, errorDescription.position);
                let errLineLength = editor.document.lineAt(errLine).text.length;
                diagnostics.set(vscode.window.activeTextEditor.document.uri, [new vscode.Diagnostic(new vscode.Range(errLine, 0, errLine, errLineLength), errMsg, vscode.DiagnosticSeverity.Error)]);
            })
        }
    })
}

function parseError(error: string): ErrorDescription {
    let m = error.match(/(\d+):(\d+)/);
    if (m) {
        let [line, char] = [Number.parseInt(m[1]), Number.parseInt(m[2])];
        return {
            position: new vscode.Position(line - 1, char),
            message: error
        }
    } else {
        // TODO
    }
}

function getNREPLPort(): number {
    let nreplPort: number;
    let projectDir = vscode.workspace.rootPath;
    let globalNREPLFile = path.join(os.homedir(), '.lein', 'repl-port');

    if (!projectDir) {
        nreplPort = Number.parseInt(fs.readFileSync(globalNREPLFile, 'utf-8'))
    }

    if (projectDir) {
        let localNREPLFile = path.join(projectDir, '.nrepl-port');
        if (fs.existsSync(localNREPLFile)) {
            nreplPort = Number.parseInt(fs.readFileSync(localNREPLFile, 'utf-8'))
        } else {
            nreplPort = Number.parseInt(fs.readFileSync(globalNREPLFile, 'utf-8'))
        }
    }

    return nreplPort;
}