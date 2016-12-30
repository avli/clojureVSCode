# clojureVSCode

[Clojure](https://clojure.org) support for Visual Studio Code.

I'm trying, believe me!

![Workflow](/images/workflow.gif)

# Supported Features

Code completion

Code navigation

Interaction with REPL

Showing documentation on hover

# Features That Are Not Supported (But Nice to Have)

Function signatures

Linting

[Debug](https://github.com/indiejames/vscode-clojure-debug)

# Before you start

This extension relies on [Cider nREPL](https://github.com/clojure-emacs/cider-nrepl).
This means you will need to add it to your ``profiles.clj``. Put the following content to your
 `~/.lein/profiles.clj`:

```clojure
{:user {:plugins  [[cider/cider-nrepl "0.13.0"]]
       :dependencies [[org.clojure/tools.nrepl "0.2.12"]]}}
```

# Getting Started Walkthrough

1. Create a Clojure project you wish to connect to. For this guide we will use Leinigen
   ```bash
      lein new hello-vscode
   ```

2. Start a REPL in your terminal, and note the port the REPL is lisening on

```bash
  $ cd hello-vscode
  $ lein repl
  nREPL server started on port 45247 on host 127.0.0.1 - nrepl://127.0.0.1:45247
  REPL-y 0.3.7, nREPL 0.2.12
  Clojure 1.8.0
```

   Note the port that your nREPL is lisening on, in this case **45247** because you may need it later.


3. Now Let's Connect to the REPL.

  * Open the project folder in VS Code.

  * Open a clojure source file such as `src/hello_clojure/core.clj`

    If you have a repl running, the connection should be made automatically and you should see a repl indicator the status bar that looks like `nrepl://localhost:45247`.

    If you see the indicator, good news you're connected. Please move onto next step.

  * If you DO NOT see the connection indicator, or if you'd like to connect to a remote repl, we will need to create the connection manually.

    Open the command pallet and select the command `Clojure: Connect to nREPL`

    You should then be prompted for an nREPL port, enter the port noted in step #2, `45247`.

    You should then be prompted for the host of the REPL. In this example we will enter `localhost`.

    You should then get a message showing successful connection to the nREPL!



4. Eval a file. The repl needs to have it's namespace initialized and set so it can know about and show things like your docstrings.

  * Open a Clojure source file

  * Open the command pallet, and select the command `Clojure: Eval`.

    This should evaluate the entire file, and a file successfully compiled notification should be shown.


5. Eval a selected expression

  * Show the output window by using the View / Output from menu bar if it's not already visible.

  * Select a block of code you wish to evaluate.

  * Open the command pallet, and select the command `Clojure: Eval and show the result`.

  * Results from the REPL should be printed to the output window named `Evaluation Results`



7. All done, you're ready to code some Clojure :)


# Troubleshooting

## Code completion doesn't work, what I'm doing wrong?

Most likely you forgot to add `cider-nrepl` to the list of dependencies. Please,
consult `How to Use?` section.

## I don't see completions from the current namespace!

You should eval the file first using the `Eval` command.

## How to understand if I'm connected to nREPL?

If you see a `nrepl://nreplhost:nreplport` status bar item, most likely you
are connected :)

# Thanks

- [Thiago Almeida](https://github.com/fasfsfgs)
- [Mike Ball](https://github.com/mikeball)
- [Egor Yurtaev](https://github.com/yurtaev)

# License

[MIT](https://raw.githubusercontent.com/avli/clojureVSCode/master/LICENSE.txt)
