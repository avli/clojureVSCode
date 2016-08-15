'use strict';

import * as vscode from 'vscode';
import {
    nREPLClient
} from './nreplClient';

export class ClojureCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable < vscode.CompletionList > {
        return new Promise < vscode.CompletionList > ((resolve, reject) => {

            console.log('In item provider...');
            let document = vscode.window.activeTextEditor.document;

            let lineText = document.lineAt(position.line).text;
            let words: string[] = lineText.split(' ');
            let currentWord = words[words.length - 1].replace(/^[\('\[\{]+|[\)\]\}]+$/g, '');

            if (currentWord[currentWord.length - 1] === '.') {
                currentWord = currentWord.slice(0, currentWord.length - 1);
            }

            console.log(currentWord);

            let nrepl = new nREPLClient('127.0.0.1', 62898);
            nrepl.complete(currentWord, (completions) => {
                let suggestions = [];
                completions.completions.forEach(element => {
                    suggestions.push({
                        label: element.candidate,
                        kind: vscode.CompletionItemKind.Text
                    })
                });

                console.log(suggestions);

                let completionList: vscode.CompletionList = new vscode.CompletionList(suggestions, true);

                resolve(completionList);

            });
        })
    }

    private joinWithPoints(words: string[]): string {
        if (!words) return '';

        if (words.length === 1) {
            return words[0];
        }

        let s = '.';
        for (let i = 0; i < words.length - 1; i++) {
            s = s + words[i] + '.';
        }
        return s + words[words.length - 1];
    }
}