# clojureVSCode

[Clojure](https://clojure.org) support for Visual Studio Code.

I'm trying, believe me!

# How to Use?

This extension relies on [Cider nREPL](https://github.com/clojure-emacs/cider-nrepl). 
This means you will need to add it to your ``profiles.clj``. Put the following content to your
 `~/.lein/profiles.clj`:

```clojure
{:user {:plugins  [[cider/cider-nrepl "0.12.0-SNAPSHOT"]
       :dependencies [[org.clojure/tools.nrepl "0.2.12"]]}}
```

When you open a project the extension tries to connect to an nREPL automatically.
Otherwise you may run `Connect to nREPL` command through the Visual Studio Code 
command pallet.  

# Supported Features

Code completion

Code navigation

Interaction with REPL

# Troubleshooting

## I don't see completions from the current namespace!

You should eval the file first using the `Eval` command.

## How to understand if I'm connected to an nREPL?

If you see a `nrepl://nreplhost:nreplport` status bar item, most likely you 
are connected :)

# License

[MIT](https://raw.githubusercontent.com/avli/clojureVSCode/master/LICENSE.txt)
