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
} from './clojureProvider'


export class ClojureDefinitionProvider extends ClojureProvider implements vscode.DefinitionProvider {

    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable < vscode.Definition > {
        return new Promise((resolve, reject) => {
            let wordRange = document.getWordRangeAtPosition(position);
            let currentWord: string;
            currentWord = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
            let ns = this.getNamespace(document.getText());

            let nrepl = this.getNREPL();
            nrepl.info(currentWord, ns, (info) => {
                if (!info.file) {
                    vscode.window.showInformationMessage(`Can't find definition for ${currentWord}.`);
                    reject();
                }
                let uri = vscode.Uri.parse(info.file);
                let pos = new vscode.Position(info.line - 1, info.column)
                let definition = new vscode.Location(uri, pos);
                console.log(info);
                resolve(definition);
            });
        })
    }
}