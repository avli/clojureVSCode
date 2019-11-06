import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { cljParser } from '../src/cljParser';

const testFolderLocation = '/../../test/documents/';

suite('cljParser.getNamespace', () => {
    let cases = [
        ['user', ''],
        ['foo', '(ns foo)'],
        ['foo', '\n(ns foo)'],
        ['foo', '\t(ns foo)'],
        ['foo', '\t(ns\tfoo)'],
        ['foo-bar', '(ns foo-bar)'],
        ['bar', '(ns bar)'],
        ['baz', '(ns baz "docstring")'],
        ['qux', `(ns qux
                    "docstring")`],
        ['foo.bar', '(ns foo.bar)'],
        ['foo.bar-baz', '(ns foo.bar-baz)'],
        ['foo.bar', `(ns foo.bar
                        (:refer-clojure :exclude [ancestors printf])
                        (:require (clojure.contrib sql combinatorics))
                        (:use (my.lib this that))
                        (:import (java.util Date Timer Random)
                            (java.sql Connection Statement)))`],
        ['bar', '(in-ns \'bar)'],
    ];
    for (let [want, input] of cases) {
        test(`getNamespace("${input}") should be "${want}"`, () => {
            assert.equal(cljParser.getNamespace(input), want);
        });
    }
});

suite('cljParser.getCurrentBlock', () => {
    // title, line, character, expected
    let cases: [string, number, number, string | undefined][] = [
        ['Position on the same line', 16, 9, '(prn "test")'],
        ['Position at the middle of multiline block', 22, 5,
            '(->> numbers\n' +
            '      (map inc)\n' +
            '      (prn))'],
        ['Ignore inline clj comments', 19, 16,
            '(let [numbers [1 2 3]\n' +
            '        VAL (atom {:some "DATA"})]\n' +
            '  ; missing left bracket prn "hided text") in comment\n' +
            '    (prn [@VAL])\n' +
            '    (->> numbers\n' +
            '      (map inc)\n' +
            '      (prn)))'],
        ['Comment form will be evaluated', 27, 14, '(prn "COMMENT")'],
        ['Eval only outside bracket from right side', 23, 11, '(prn)'],
        ['Eval only outside bracket from left side', 28, 5,
            '(comp #(str % "!") name)'],
        ['Eval only round bracket block', 20, 12, '(prn [@VAL])'],
        ['Eval when only inside of the block', 24, 0, undefined],
        ['Begin of file', 0, 0,
            '(ns user\n' +
            '    (:require [clojure.tools.namespace.repl :refer [set-refresh-dirs]]\n' +
            '              [reloaded.repl :refer [system stop go reset]]\n' +
            '              [myproject.config :refer [config]]\n' +
            '              [myproject.core :refer [new-system]]))'],
        ['End of file', 37, 0, undefined]
    ];
    testBlockSelection('Eval current block', cljParser.getCurrentBlock, 'evalBlock.clj', cases);
});

suite('cljParser.getOuterBlock', () => {
    // title, line, character, expected
    let cases: [string, number, number, string | undefined][] = [
        ['Get outermost block of function definition', 11, 20,
            '(defn new-system-dev\n' +
            '  []\n' +
            '  (let [_ 1]\n' +
            '    (new-system (config))))'],
        ['Outer block from outside left bracket', 8, 0,
            '(defn new-system-dev\n' +
            '  []\n' +
            '  (let [_ 1]\n' +
            '    (new-system (config))))'],
        ['Outer block from outside right bracket', 28, 38,
            '(comment\n' +
            '  (do\n' +
            '    #_(prn "COMMENT")\n' +
            '    ((comp #(str % "!") name) :test)))'],
        ['Outer block not found', 24, 0, undefined],
        ['Begin of file', 0, 0,
            '(ns user\n' +
            '    (:require [clojure.tools.namespace.repl :refer [set-refresh-dirs]]\n' +
            '              [reloaded.repl :refer [system stop go reset]]\n' +
            '              [myproject.config :refer [config]]\n' +
            '              [myproject.core :refer [new-system]]))'],
        ['End of file', 37, 0, undefined],
    ];
    testBlockSelection('Eval outer block', cljParser.getOuterBlock, 'evalBlock.clj', cases);
});

function testBlockSelection(
    title: string,
    getBlockFn: CallableFunction,
    fileName: string,
    cases: [string, number, number, string | undefined][]) {

    test(title, async () => {
        const editor = await getEditor(fileName);

        for (let [title, line, character, expected] of cases) {
            const currentPosition = new vscode.Position(line, character);
            editor.selection = new vscode.Selection(currentPosition, currentPosition);
            let blockSelection = getBlockFn(editor);
            blockSelection = blockSelection ? editor.document.getText(blockSelection) : blockSelection;
            assert.equal(blockSelection, expected, title)
        };
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

async function getEditor(fileName: string): Promise<vscode.TextEditor> {
    const uri = vscode.Uri.file(path.join(__dirname + testFolderLocation + fileName)),
        document = await vscode.workspace.openTextDocument(uri),
        editor = await vscode.window.showTextDocument(document);
    await sleep(500);
    return editor;
};
