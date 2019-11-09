(ns user
    (:require [clojure.tools.namespace.repl :refer [set-refresh-dirs]]
              [reloaded.repl :refer [system stop go reset]]
              [myproject.config :refer [config]]
              [myproject.core :refer [new-system]]))

(set-refresh-dirs "dev" "src" "test")

(defn new-system-dev
  []
  (let [_ 1]
    (new-system (config))))

(reloaded.repl/set-init! #(new-system-dev))

(comment
  (prn "test")  ; block in comment (prn "comment") some extra text;
  (let [numbers [1 2 3]
        VAL (atom {:some "DATA"})]
  ; missing left bracket prn "hided text") in comment
    (prn [@VAL])
    (->> numbers
      (map inc)
      (prn))))

(comment
  (do
    #_(prn "COMMENT")
    ((comp #(str % "!") name) :test)))

(comment
  (go)
  (reset)
  (stop)
  (keys system))

(prn "THE WHOLE FILE HAS BEEN EVALUATED")
