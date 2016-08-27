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

export class ClojureHoverProvider extends ClojureProvider implements vscode.HoverProvider {

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable < vscode.Hover > {
        return new Promise < vscode.Hover > ((resolve, reject) => {
            let wordRange = document.getWordRangeAtPosition(position);
            if (wordRange === undefined) {
                resolve(new vscode.Hover('Docstring not found'));
            } else {
                let currentWord: string;
                currentWord = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
                let ns = this.getNamespace(document.getText());

                let nrepl = this.getNREPL();
                nrepl.info(currentWord, ns, (info) => {
                    if (info.doc) {
                        resolve(new vscode.Hover(info.doc));
                    }
                    reject();
                });
            }
        });
    }
}