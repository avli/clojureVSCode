'use strict';

import * as vscode from 'vscode';

import { nREPLClient } from './nreplClient';
import { getNamespace } from './clojureProvider';

export function clojureEval(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    evaluate(context, outputChannel, false);
}

export function clojureEvalAndShowResult(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    evaluate(context, outputChannel, true);
}

function evaluate(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel, showResults: boolean) {
    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;

    let text: string = editor.document.getText();
    if (!selection.isEmpty) {
        const ns: string = getNamespace(text);
        text = `(ns ${ns})\n${editor.document.getText(selection)}`;
    }

    const port = context.workspaceState.get<number>('port');
    const host = context.workspaceState.get<string>('host');
    if ((!port) || (!host)) {
        vscode.window.showInformationMessage('You should connect to nREPL first to evaluate code.')
        return;
    }
    const nrepl = new nREPLClient(port, host);

    const filename = editor.document.fileName;

    nrepl.evalFile(text, filename)
        .then(respObjs => {
            if (!!respObjs[0].ex)
                return handleError(nrepl, outputChannel, selection, showResults, respObjs[0].session);

            return handleSuccess(outputChannel, showResults, respObjs);
        })
        .then(() => nrepl.close());
}

function handleError(nrepl: nREPLClient, outputChannel: vscode.OutputChannel, selection: vscode.Selection, showResults: boolean, session: string) {
    if (!showResults)
        vscode.window.showErrorMessage('Compilation error');

    return nrepl.stacktrace(session)
        .then(stacktraceObjs => {
            const stacktraceObj = stacktraceObjs[0];

            let errLine = stacktraceObj.line - 1;
            let errChar = stacktraceObj.column - 1;

            if (!selection.isEmpty) {
                errLine += selection.start.line;
                errChar += selection.start.character;
            }

            outputChannel.appendLine(`${stacktraceObj.class} ${stacktraceObj.message}`);
            outputChannel.appendLine(` at ${stacktraceObj.file}:${errLine}:${errChar}`);

            stacktraceObj.stacktrace.forEach(trace => {
                if (trace.flags.indexOf('tooling') > -1)
                    outputChannel.appendLine(`    ${trace.class}.${trace.method} (${trace.file}:${trace.line})`);
            });

            outputChannel.show();
        });
}

function handleSuccess(outputChannel: vscode.OutputChannel, showResults: boolean, respObjs: any[]) {
    if (!showResults) {
        vscode.window.showInformationMessage('Successfully compiled');
    } else {
        respObjs.forEach(respObj => {
            if (respObj.out)
                outputChannel.append(respObj.out);
            if (respObj.value)
                outputChannel.appendLine(`=> ${respObj.value}`);
            outputChannel.show();
        });
    }
}
