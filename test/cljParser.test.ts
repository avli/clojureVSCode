import * as assert from 'assert';
import {cljParser} from '../src/cljParser';

suite('cljParser', () => {
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
