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

export function clojureEval(context: vscode.ExtensionContext, outputChannel?: vscode.OutputChannel) {

    let editor = vscode.window.activeTextEditor;
    let text: string = editor.document.getText();
    let ns: string;
    let match = text.match(/^[\s\t]*\((?:[\s\t\n]*(?:in-){0,1}ns)[\s\t\n]+'?([\w.\-\/]+)[\s\S]*\)[\s\S]*/);
    match ? ns = match[1] : ns = 'user';
    let selection = editor.selection;
    let isSelection = !selection.isEmpty;

    if (isSelection) {
        text = `(ns ${ns}) ${editor.document.getText(selection)}`;
    }

    let port = context.workspaceState.get < number > ('port');
    let host = context.workspaceState.get < string > ('host');

    if ((!port) || (!host)) {
        vscode.window.showInformationMessage('You should connect to nREPL first to evaluate code.')
        return;
    }

    let filename = editor.document.fileName;

    let nrepl1 = new nREPLClient(port, host);
    let diagnostics = vscode.languages.createDiagnosticCollection('Compilation Errors');
    diagnostics.clear();
    nrepl1.evalFile(text, filename, (result) => {
        console.log(result);
        if (result.value) {
            diagnostics.clear();
            if (outputChannel) {
                outputChannel.appendLine(`=> ${result.value}`);
                outputChannel.show();
            } else {
                vscode.window.showInformationMessage('Successfully compiled');
            }
        } else if (result.ex) {
            let nrepl2 = new nREPLClient(port, host);
            nrepl2.stacktrace(result.session, (stackteace) => {
                vscode.window.showErrorMessage('Compilation error');
                let errLine = stackteace.line - 1;
                let errChar = stackteace.column - 1;
                let errFile = stackteace.file;
                let errFileUri: vscode.Uri;
                if (errFile) {
                    errFileUri = vscode.Uri.file(errFile);
                } else {
                    errFileUri = vscode.window.activeTextEditor.document.uri;
                }
                let errMsg = stackteace.message;

                // Adjust error position if selection has been evaluated
                if (isSelection) {
                    errLine = errLine + selection.start.line;
                    errChar = errChar + selection.start.character;
                }

                let errPos = new vscode.Position(errLine, errChar);
                editor.selection = new vscode.Selection(errPos, errPos);
                let errLineLength = editor.document.lineAt(errLine).text.length;

                diagnostics.set(errFileUri, [new vscode.Diagnostic(new vscode.Range(errLine, errChar, errLine, errLineLength), errMsg, vscode.DiagnosticSeverity.Error)]);
                nrepl2.close(() => {});
            })

        }
    })
}