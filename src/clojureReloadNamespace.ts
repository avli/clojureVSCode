import * as vscode from 'vscode';
import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';
import { handleError } from './clojureEval';

export function getReloadOnFileSave() {
    const configName = 'autoReloadNamespaceOnSave';
    let editorConfig = vscode.workspace.getConfiguration('editor');
    const globalEditorFormatOnSave = editorConfig && editorConfig.has(configName) && editorConfig.get(configName) === true;
    let clojureConfig = vscode.workspace.getConfiguration('clojureVSCode');
    return ((clojureConfig.autoReloadNamespaceOnSave || globalEditorFormatOnSave));
}

export function reloadNamespaceCommand(        
    outputChannel: vscode.OutputChannel) {

    if (!cljConnection.isConnected()) {
        vscode.window.showWarningMessage('You should connect to nREPL first to reload namespace.');
        return;
    }

    const textDocument = vscode.window.activeTextEditor.document;
    const text = textDocument.getText();
    const ns = cljParser.getNamespace(text);
    const commantText = `(require '${ns} :reload)`;
    const fileName = textDocument.fileName;
    cljConnection.sessionForFilename(fileName).then(session => {
        let response = nreplClient.evaluateFile(commantText, fileName, session.id);
        
        response.then(respObjs => {
            if (!!respObjs[0].ex)
                return handleError(outputChannel, 
                                   new vscode.Selection(0,0,0,0), 
                                   false, 
                                   respObjs[0].session);
        })
    });
}