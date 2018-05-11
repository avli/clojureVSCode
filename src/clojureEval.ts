import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';
import { TestListener } from './testRunner';

export function clojureEval(outputChannel: vscode.OutputChannel): void {
    evaluate(outputChannel, false);
}

export function clojureEvalAndShowResult(outputChannel: vscode.OutputChannel): void {
    evaluate(outputChannel, true);
}

type TestResults = {
    summary: {
        error: number
        fail: number
        ns: number
        pass: number
        test: number
        var: number
    }
    'testing-ns': string
    'gen-input': any[]
    status?: string[]
    results: {
        [key: string]: { // Namespace
            [key: string]: {
                context: any
                file?: string
                index: number
                line?: number
                message?: string
                ns: string
                type: string
                var: string
                actual?: string
                expected?: string
            }[];
        }
    }
    session: string
}

function runTests(outputChannel: vscode.OutputChannel, listener: TestListener, namespace?: string): void {
    if (!cljConnection.isConnected()) {
        vscode.window.showWarningMessage('You must be connected to an nREPL session to test a namespace.');
        return;
    }

    const promise: Promise<TestResults[]> = nreplClient.runTests(namespace);

    promise.then((responses) => {

        console.log("Test result promise delivery");

        responses.forEach(response => {

            console.log(response);
            console.log(response.results);

            if (response.status && response.status.indexOf("unknown-op") != -1) {
                outputChannel.appendLine("Failed to run tests: the cider.nrepl.middleware.test middleware in not loaded.");
                return;
            }

            for (const ns in response.results) {

                const namespace = response.results[ns];

                outputChannel.appendLine("Results for " + ns)

                for (const varName in namespace) {

                    // Each var being tested reports a list of statuses, one for each
                    // `is` assertion in the test. Here we just want to reduce this
                    // down to a single pass/fail.
                    const statuses = new Set(namespace[varName].map(r => r.type));
                    const passed = (statuses.size == 0) ||
                        ((statuses.size == 1) && statuses.has('pass'));
                    listener.onTestResult(ns, varName, passed);

                    namespace[varName].forEach(r => {
                        if (r.type != 'pass') {
                            outputChannel.appendLine(r.type + " in (" + r.var + ") (" + r.file + ":" + r.line + ")");
                            if (typeof r.message === 'string') {
                                outputChannel.appendLine(r.message);
                            }
                            if (r.expected) {
                                outputChannel.append("expected: " + r.expected)
                            }
                            if (r.actual) {
                                outputChannel.append("  actual: " + r.actual)
                            }
                        }
                    });
                }
            }

            if ('summary' in response) {
                const failed = response.summary.fail + response.summary.error;
                if (failed > 0) {
                    vscode.window.showErrorMessage(failed + " tests failed.")
                } else {
                    vscode.window.showInformationMessage(response.summary.var + " tests passed")
                }
            }
        });

    }).catch((reason): void => {
        const message: string = "" + reason;
        outputChannel.append("Tests failed: ");
        outputChannel.appendLine(message);
    });
}

export function testNamespace(outputChannel: vscode.OutputChannel, listener: TestListener): void {
    const editor = vscode.window.activeTextEditor;
    const ns = cljParser.getNamespace(editor.document.getText()); // log ns and 'starting'
    outputChannel.appendLine("Testing " + ns)
    runTests(outputChannel, listener, ns);
}

export function runAllTests(outputChannel: vscode.OutputChannel, listener: TestListener): void {
    outputChannel.appendLine("Testing all namespaces");
    runTests(outputChannel, listener);
}

function evaluate(outputChannel: vscode.OutputChannel, showResults: boolean): void {
    if (!cljConnection.isConnected()) {
        vscode.window.showWarningMessage('You should connect to nREPL first to evaluate code.');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    const selection = editor.selection;
    let text = editor.document.getText();
    if (!selection.isEmpty) {
        const ns: string = cljParser.getNamespace(text);
        text = `(ns ${ns})\n${editor.document.getText(selection)}`;
    }

    cljConnection.sessionForFilename(editor.document.fileName).then(session => {
        let response;
        if (!selection.isEmpty && session.type == 'ClojureScript') {
            // Piggieback's evalFile() ignores the text sent as part of the request
            // and just loads the whole file content from disk. So we use eval()
            // here, which as a drawback will give us a random temporary filename in
            // the stacktrace should an exception occur.
            response = nreplClient.evaluate(text, session.id);
        } else {
            response = nreplClient.evaluateFile(text, editor.document.fileName, session.id);
        }
        response.then(respObjs => {
            if (!!respObjs[0].ex)
                return handleError(outputChannel, selection, showResults, respObjs[0].session);

            return handleSuccess(outputChannel, showResults, respObjs);
        })
    });
}

function handleError(outputChannel: vscode.OutputChannel, selection: vscode.Selection, showResults: boolean, session: string): Promise<void> {
    if (!showResults)
        vscode.window.showErrorMessage('Compilation error');

    return nreplClient.stacktrace(session)
        .then(stacktraceObjs => {
            const stacktraceObj = stacktraceObjs[0];

            let errLine = stacktraceObj.line !== undefined ? stacktraceObj.line - 1 : 0;
            let errChar = stacktraceObj.column !== undefined ? stacktraceObj.column - 1 : 0;

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
            nreplClient.close(session);
        });
}

function handleSuccess(outputChannel: vscode.OutputChannel, showResults: boolean, respObjs: any[]): void {
    if (!showResults) {
        vscode.window.showInformationMessage('Successfully compiled');
    } else {
        respObjs.forEach(respObj => {
            if (respObj.out)
                outputChannel.append(respObj.out);
            if (respObj.err)
                outputChannel.append(respObj.err);
            if (respObj.value)
                outputChannel.appendLine(`=> ${respObj.value}`);
            outputChannel.show();
        });
    }
    nreplClient.close(respObjs[0].session);
}
