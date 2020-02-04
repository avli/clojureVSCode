# clojureVSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/avli.clojure.svg)](https://marketplace.visualstudio.com/items?itemName=avli.clojure) [![Build Status](https://travis-ci.org/avli/clojureVSCode.svg?branch=master)](https://travis-ci.org/avli/clojureVSCode)

[Clojure](https://clojure.org) and [ClojureScript](https://clojurescript.org) support for Visual Studio Code.

If you are a ClojureScript user, please read [this section](#clojurescript-project-setup) carefully.

I'm trying, believe me!

## Quickstart

Make sure that [Leiningen](https://leiningen.org/) is installed on your machine, open a Clojure file or project, wait until the extension starts the nREPL (see status on the bottom of the VSCode window) and [connect to it](#connecting-to-the-repl) - now all the goodies should work :-)

Doesn't work? Not exactly what you need? See the [Manual Configuration section](#manual-configuration)!

## Supported Features

* Code completion

![Code completion example](https://github.com/avli/clojureVSCode/raw/master/images/code%20completion%20example.png)

* Code navigation

![Code navigationtion example](https://github.com/avli/clojureVSCode/raw/master/images/code%20navigation%20example.png)

* Interaction with REPL
* Showing documentation on hover
* Code formatting ([cljfmt](https://github.com/weavejester/cljfmt))
* Function signatures
* Integration with the Clojure unit test framework

![Code completion example](https://github.com/avli/clojureVSCode/raw/master/images/function%20signature%20example.png)

## Features That Are not Supported (but Nice to Have)

* Linting
* [Debug](https://github.com/indiejames/vscode-clojure-debug)

## Connecting to the REPL

- Open a terminal (either the one embedded in VSCode or a separate one)
- Change directory to the root directory of the Clojure project (where the REPL started by clojureVSCode will have updated the hidden file `.nrepl-port`)
- with lein, do `lein repl :connect`.

## Evaluating code in the REPL

`Clojure: Eval` (in the command palette) will compile the current file in the editor and load it in the REPL.

## Manual Configuration

The method from the [Quickstart section](#Quickstart) utilizes the so-called embedded nREPL that is run as an internal process. Sometimes you need more control on your development environment. In this case you can disable the automatical firing of the embedded nREPL by setting the

```json

"clojureVSCode.autoStartNRepl": true

```

option in your VSCode settings globally or per-project and connect manually to whichever REPL instance you want by "Clojure: Connect to a running nREPL" command. Note, that in order to make the autocompletion, go to definition, and formatting functionality work you have to write necessary dependencies in your `profiles.clj`. Put the following content to your `~/.lein/profiles.clj` for macOS and Linux:

```clojure
{:user {:plugins  [[cider/cider-nrepl "0.22.1"]]
        :dependencies [[cljfmt "0.5.7"]]}}
```

Alternatively, you can put the code above to your project `project.clj` file.

## Contributed Configuration

The extension contributes the configuration parameters listed in the table below.

| Parameter                      | Description |
|--------------------------------|-------------|
|`clojureVSCode.autoStartNRepl`  | Whether to start an nREPL when opening a file or project. |
|`clojureVSCode.formatOnSave`    | Format files with [cljfmt](https://github.com/weavejester/cljfmt) on save. |
|`clojureVSCode.cljfmtParameters`| Formatting parameters passed to `cljfmt` each time it runs, e.g. `:indentation? true :remove-surrounding-whitespace? false` |
|`clojureVSCode.showResultInline`    | Show evaluation result inline. |

## ClojureScript Project Setup

The extension has the experimental support of ClojureScript. The example of a ClojureScript project setup can be found [here](https://github.com/avli/clojurescript-example-project). Checkout the project `profile.clj` file to learn what dependencies you need.

The embedded nREPL **does not** support ClojureScript, consider to use the "clojureVSCode.autoStartNRepl" setting. You will need to run an nREPL manually and execute the following commands inside it:

```clojure
(require 'cljs.repl.node)
(cider.piggieback/cljs-repl (cljs.repl.node/repl-env))
```

After that you can connect to the nREPL using the "Clojure: Connect to a running nREPL" command. Now you can evaluate you ClojureScript code and use the other extension facilities.


## How to Contribute

Open an [issue](https://github.com/avli/clojureVSCode/issues) if you want to propose new features and ideas or to report bugs. If you want to help with some code and looking for a place to start, please check out the [How to Contribute](https://github.com/avli/clojureVSCode/wiki/Contribution) wiki page.

## Thanks

- [Thiago Almeida](https://github.com/fasfsfgs)
- [Mike Ball](https://github.com/mikeball)
- [Egor Yurtaev](https://github.com/yurtaev)
- [Mark Hansen](https://github.com/mhansen)
- [Fabian Achammer](https://github.com/fachammer)
- [Nikita Prokopov](https://github.com/tonsky)
- [Alessandro Decina](https://github.com/alessandrod)
- [Marc O'Morain](https://github.com/marcomorain)
- [Andrey Bogoyavlensky](https://github.com/abogoyavlensky)

## License

[MIT](https://raw.githubusercontent.com/avli/clojureVSCode/master/LICENSE.txt)
