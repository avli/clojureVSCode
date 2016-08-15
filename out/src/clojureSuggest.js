'use strict';
var vscode = require('vscode');
var nreplClient_1 = require('./nreplClient');
var ClojureCompletionItemProvider = (function () {
    function ClojureCompletionItemProvider() {
    }
    ClojureCompletionItemProvider.prototype.provideCompletionItems = function (document, position, token) {
        return new Promise(function (resolve, reject) {
            console.log('In item provider...');
            var document = vscode.window.activeTextEditor.document;
            var lineText = document.lineAt(position.line).text;
            var words = lineText.split(' ');
            var currentWord = words[words.length - 1].replace(/^[\('\[\{]+|[\)\]\}]+$/g, '');
            if (currentWord[currentWord.length - 1] === '.') {
                currentWord = currentWord.slice(0, currentWord.length - 1);
            }
            console.log(currentWord);
            var nrepl = new nreplClient_1.nREPLClient('127.0.0.1', 62898);
            nrepl.complete(currentWord, function (completions) {
                var suggestions = [];
                completions.completions.forEach(function (element) {
                    suggestions.push({
                        label: element.candidate,
                        kind: vscode.CompletionItemKind.Text
                    });
                });
                console.log(suggestions);
                var completionList = new vscode.CompletionList(suggestions, true);
                resolve(completionList);
            });
        });
    };
    ClojureCompletionItemProvider.prototype.joinWithPoints = function (words) {
        if (!words)
            return '';
        if (words.length === 1) {
            return words[0];
        }
        var s = '.';
        for (var i = 0; i < words.length - 1; i++) {
            s = s + words[i] + '.';
        }
        return s + words[words.length - 1];
    };
    return ClojureCompletionItemProvider;
}());
exports.ClojureCompletionItemProvider = ClojureCompletionItemProvider;
//# sourceMappingURL=clojureSuggest.js.map