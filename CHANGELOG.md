# Version 0.10.1

Fixes the issue with the "Eval" command.

# Version 0.10.0

Adds integration with Clojure unit test framework.

![Test results UI demo](https://user-images.githubusercontent.com/448001/39921203-ee8e30b6-5511-11e8-843a-690dd8624b87.gif)

# Version 0.9.8

Temporary removes `refactor-nrepl` from the dependencies of the embedded nREPL at least untile [this issue](https://github.com/clojure-emacs/refactor-nrepl/issues/206) won't be fixed.

# Version 0.9.7

Fixes the behavior of nREPL connection. If a remote nREPL is closed evaluation of code will show the message about it and the connection indicator will be removed.

# Version 0.9.6

Adds the [Connecting to the REPL](https://github.com/avli/clojureVSCode#connecting-to-the-repl) section to README.md and Slightly changes the behavior of the nREPL output channel only bringing it to the foreground on error.

# Version 0.9.5

Adds a channel for nREPL output to the Output Window.

# Version 0.9.4

Adds the `:headless` option to the embedded nREPL and [clojure-warrior](https://marketplace.visualstudio.com/items?itemName=tonsky.clojure-warrior) to the extension recommendations.

# Version 0.9.3

Adds support of `cljfmt` options.

# Version 0.9.2

Adds Clojure 1.9 support.

# Version 0.9.1

Adds a configuration option for formatting code on save.

# Version 0.9.0

Adds experimental ClojureScript support. Please check out [README.md](https://github.com/avli/clojureVSCode#clojurescript-project-setup) to learn how to use the extension for ClojureScript.

# Version 0.8.2

Fixes the issue with unescaping newlines that are parts of a string [64](https://github.com/avli/clojureVSCode/issues/64).

# Version 0.8.1

Adds a configuration option to disable an embedded nREPL start.

# Version 0.8.0

Adds code formatting support [57](https://github.com/avli/clojureVSCode/issues/57).

# Version 0.7.10

Adds workaround for the hanging Java process issue on the Windows platform [56](https://github.com/avli/clojureVSCode/issues/56).

# Version 0.7.9

Hotfix that detaches nREPL process on UNIX and non-detached one on Windows [56](https://github.com/avli/clojureVSCode/issues/56).

# Version 0.7.8

Fixes the troubles with a hanging Java process [56](https://github.com/avli/clojureVSCode/issues/56).

# Version 0.7.7

Fixes the error with embedded nREPL on Windows.

# Version 0.7.6

Does code refactoring and minor nREPL connection indicator UI fixes.

# Version 0.7.5

Fixes the `Unable to start nREPL` bug [47](https://github.com/avli/clojureVSCode/issues/47).

# Version 0.7.4

Fixes the nREPL connection indicator behavior [42](https://github.com/avli/clojureVSCode/issues/42).

# Version 0.7.3

Fixes typos in documentation.

# Version 0.7.2

Fixes README.md formatting to display correctly on the Visual Studio Marketplace web-site.

# Version 0.7.1

Fixes the links to the images in README.md.

# Version 0.7.0

Adds embedded nREPL functionality – no need to connect manually anymore.
[21](https://github.com/avli/clojureVSCode/issues/21).

# Version 0.6.1

Adds the forgotten changelog for the version 0.6.0 :-)

# Version 0.6.0

Changes the behavior of the `Eval` command - now it shows compilation errors in the `Output` panel [28](https://github.com/avli/clojureVSCode/issues/28).

# Version 0.5.4

Fixes possible bug with missing return from the `provideDefinition` function [#26](https://github.com/avli/clojureVSCode/issues/26).

# Version 0.5.3

Cleans up the documentation a little

# Version 0.5.2

Improves better support of special form signatures.

# Version 0.5.1

Updates the information about the supported features.

# Version 0.5.0

Adds signature helper [#6](https://github.com/avli/clojureVSCode/issues/8).

# Version 0.4.3

Fixes the issue when only one output line is printed [#9](https://github.com/avli/clojureVSCode/issues/9).

# Version 0.4.2

Shows output of the "Eval" command [#5](https://github.com/avli/clojureVSCode/issues/5).

# Version 0.4.0

The first version public version.
