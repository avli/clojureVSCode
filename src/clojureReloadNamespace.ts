import * as vscode from 'vscode';
import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { handleError, evaluateText } from './clojureEval';
import {readBooleanConfiguration} from './utils';

export function getReloadOnFileSave() :boolean {
    return readBooleanConfiguration('autoReloadNamespaceOnSave')
}

export function reloadNamespaceCommand(        
    outputChannel: vscode.OutputChannel) {

    if (!cljConnection.isConnected()) {
        vscode.window.showWarningMessage('You should connect to nREPL first to reload namespace.');
        return;
    }

    const textDocument = vscode.window.activeTextEditor.document;
    const fileName = textDocument.fileName;
    if(!fileName.endsWith(".clj")) {
        return;
    }

    const text = textDocument.getText();
    const ns = cljParser.getNamespace(text);
    const commantText = `(require '${ns} :reload)`;    

    evaluateText(outputChannel, false, fileName, commantText)
        .then(respObjs => {
            return (!!respObjs[0].ex)
                    ? handleError(outputChannel, 
                                new vscode.Selection(0,0,0,0), 
                                false, 
                                respObjs[0].session)
                            .then(value=>Promise.reject(value))                            
                    : Promise.resolve();
        })    
}