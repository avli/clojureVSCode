# clojureVSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/avli.clojure.svg)](https://marketplace.visualstudio.com/items?itemName=avli.clojure)

[Clojure](https://clojure.org) and [ClojureScript](https://clojurescript.org) support for Visual Studio Code.

If you are a ClojureScript user, please read [this section](https://github.com/avli/clojureVSCode#clojurescript-project-setup) carefully.

I'm trying, believe me!

## Quickstart

Make sure that [Leiningen](https://leiningen.org/) is installed on your machine, open a Clojure file or project, wait until the extension will start nREPL and connect to it - now all the goodies should work :-)

## Supported Features

* Code completion

![Code completion example](https://github.com/avli/clojureVSCode/raw/master/images/code%20completion%20example.png)

* Code navigation

![Code navigationtion example](https://github.com/avli/clojureVSCode/raw/master/images/code%20navigation%20example.png)

* Interaction with REPL
* Showing documentation on hover
* Code formatting ([cljfmt](https://github.com/weavejester/cljfmt))
* Function signatures

![Code completion example](https://github.com/avli/clojureVSCode/raw/master/images/function%20signature%20example.png)

## Features That Are not Supported (but Nice to Have)

* Linting
* [Debug](https://github.com/indiejames/vscode-clojure-debug)

## ClojureScript Project Setup

The extension has the experimental support of ClojureScript. The example of a ClojureScript project setup can be found [here](https://github.com/avli/clojurescript-example-project). Checkout the project `profile.clj` file to learn what dependencies you need.

The embedded nREPL **does not** support ClojureScript, consider to use the "clojureVSCode.autoStartNRepl" setting. You will need to run an nREPL manually and execute the following commands inside it:

```clojure
(require 'cljs.repl.node)
(cemerick.piggieback/cljs-repl (cljs.repl.node/repl-env))
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

## License

[MIT](https://raw.githubusercontent.com/avli/clojureVSCode/master/LICENSE.txt)
