'use strict';
var vscode = require('vscode');
var clojureMode_1 = require('./clojureMode');
var clojureSuggest_1 = require('./clojureSuggest');
function activate(context) {
    console.log('Congratulations, your extension "vscode-nrepl" is now active!');
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(clojureMode_1.CLOJURE_MODE, new clojureSuggest_1.ClojureCompletionItemProvider(), '/', '.'));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=clojureMain.js.map