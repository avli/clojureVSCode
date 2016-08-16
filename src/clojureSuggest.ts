'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    nREPLClient
} from './nreplClient';

let mappings = {
    'nil': vscode.CompletionItemKind.Value,
    'macro': vscode.CompletionItemKind.Value,
    'class': vscode.CompletionItemKind.Class,
    'keyword': vscode.CompletionItemKind.Keyword,
    'namespace': vscode.CompletionItemKind.Module,
    'function': vscode.CompletionItemKind.Function,
    'special-form': vscode.CompletionItemKind.Keyword,
    'var': vscode.CompletionItemKind.Variable
}

export class ClojureCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable < vscode.CompletionList > {
        return new Promise < vscode.CompletionList > ((resolve, reject) => {

            let document = vscode.window.activeTextEditor.document;

            let lineText = document.lineAt(position.line).text;
            let words: string[] = lineText.split(' ');
            let currentWord = words[words.length - 1].replace(/^[\('\[\{]+|[\)\]\}]+$/g, '');

            console.log(currentWord);

            let currentWordLength: number = currentWord.length;
            let currentWordContainsDotOrSlash: boolean = false;

            function buildInsertText(suggestion: string): boolean | string {
                if (suggestion[0] === ':') return suggestion.slice(1);

                let idxOfLastDot = currentWord.lastIndexOf('.');
                let idxOfLastSlash = currentWord.lastIndexOf('/');

                if ((idxOfLastDot === -1) && (idxOfLastSlash === -1)) {
                    return false;
                }

                currentWordContainsDotOrSlash = true;

                if (idxOfLastDot > idxOfLastSlash) {
                    return currentWord.slice(idxOfLastDot + 1) + suggestion.slice(currentWordLength);
                } else {
                    return currentWord.slice(idxOfLastSlash + 1) + suggestion.slice(currentWordLength);
                }
            }

            let nrepl = new nREPLClient('127.0.0.1', this.getNREPLPort());
            nrepl.complete(currentWord, (completions) => {
                let suggestions = [];
                completions.completions.forEach(element => {
                    suggestions.push({
                        label: element.candidate,
                        kind: mappings[element.type] || vscode.CompletionItemKind.Text,
                        insertText: buildInsertText(element.candidate)
                    })
                });

                let completionList: vscode.CompletionList = new vscode.CompletionList(suggestions, !currentWordContainsDotOrSlash);

                resolve(completionList);

            });
        })
    }

    public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable<vscode.CompletionItem> {
        return new Promise < vscode.CompletionItem > ((resolve, reject) => {
            console.log(item);
            let nrepl = new nREPLClient('127.0.0.1', this.getNREPLPort());
            // Not sure why but it works with clojure.core as a namespace.
            // XXX: Figure out why.
            nrepl.info(item.label, 'clojure.core', (info) => {
                item.documentation = info.doc;
                resolve(item);
            })
        })
    }

    private getNREPLPort(): number {
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
}