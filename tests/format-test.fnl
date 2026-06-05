;;garbel this file to test it out
(local {: view} (require :fennel))

(fn greet-user [name opts]
  (let [msg (.. "Hello, " name "!")
        loud? opts.loud]
    (if loud? (string.upper msg) msg)))

(local my-profile {:name "Alex"
                   :languages [:fennel :lua :clojure]
                   :active? true})

(when my-profile.active?
  (print (greet-user my-profile.name {:loud true}))
  (each [i lang (ipairs my-profile.languages)]
    (print (.. "Learning: " lang " at index " (tostring i)))))

(fn great-user [x]
  (let [x 30
        y 20]
    (+ x y)))
