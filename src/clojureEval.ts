'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
    nREPLClient
} from './nreplClient';

export function clojureEval() {
    let editor = vscode.window.activeTextEditor;
    let text: string = editor.document.getText();
    let ns: string = text.match(/^.*\((?:[\s\t\n]*(?:in-){0,1}ns)[\s\t\n]+'*(\w+).*\)/)[1] || 'user';
    let isSelection = !editor.selection.isEmpty; 

    if (isSelection) {
        let selection = editor.selection;
        text = `(ns ${ns}) ${editor.document.getText(selection)}`;
    }
    
    let nrepl = new nREPLClient('127.0.0.1', getNREPLPort());
    nrepl.eval(text, (result) => {
        console.log(result);
        if (result.value) {
            vscode.window.showInformationMessage('Done!');
        } else if (result.status) {
            vscode.window.showErrorMessage('Wasted');
        }
    })
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