import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { nreplClient } from './nreplClient';

export function clojureRunAllTests(outputChannel: vscode.OutputChannel): void {
    if (!cljConnection.isConnected()) {
        vscode.window.showWarningMessage('You should connect to nREPL first to refresh code.');
        return;
    }

    const editor = vscode.window.activeTextEditor;    
    cljConnection.sessionForFilename(editor.document.fileName).then(session => {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'running tests'}, p => {
            return new Promise((resolve, reject) => {
                p.report({message: 'Running all tests in project...' });

                let response = nreplClient.runAllTests();
                response.then(respObjs => {                
                    if (!!respObjs[0].ex)
                        vscode.window.showErrorMessage('Compilation error');

                    handleTestOutput(respObjs, session.id);
                    p.report({message: "Finished running all tests in project"})
                    resolve();
                })
            });
        });
    });
}

let diagnostics: vscode.DiagnosticCollection
let status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

function diagnose(symbol, { line, ns, session }, message) {
    nreplClient.info(symbol, ns, session).then(info => {
        let uri = vscode.Uri.parse(info['file']);
        let diags = diagnostics.get(uri) || [];
        let dRange = new vscode.Range(line - 1, 1, line - 1, 100000);
        let diag = new vscode.Diagnostic(dRange, message, vscode.DiagnosticSeverity.Error);
        diags = diags.concat(diag);
        diagnostics.set(uri, diags);
    })            
}

function handleTestOutput(response: any, session: string) {
    diagnostics = vscode.languages.createDiagnosticCollection("test results")
    diagnostics.clear()

    for (let {err, summary, results} of response) {
        if (err) {
            console.log(err);
            // TODO display in console
        }

        if (summary) {
            status.text = `Ran ${summary.test} assertions, in ${summary.var} test functions. ${summary.fail} failures, ${summary.error} errors.`;
            status.show();
        }

        for (let ns in results) {
            let testResults = results[ns];
            for (let symbol in testResults) {
                for (let { type, ...testResult } of testResults[symbol]) {
                    if (type == "fail") {
                        let {context, actual, expected} = testResult;                        
                        diagnose(symbol, testResult, `Actual: ${actual} Expected: ${expected}`);
                    }
                    if (type == "error") {
                        let {error} = testResult;                        
                        diagnose(symbol, testResult, error);                        
                    }
                }
            }
        }
    }
}
