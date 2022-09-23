const { parser } = require("../parser/grammar.js");
const { serialize } = require("../generator/serialize.js");
const { BuildError } = require("../utils.js");
const { isMetaProperty } = require("../utils");
const fs = require("fs");
const { EventEmitter } = require("events");

function filterMetaProperties(machine) {
    delete machine._serialize;
    for (const state in machine.transitions) {
        for (const transitionName in machine.transitions[state]) {
            if (isMetaProperty(transitionName)) {
                delete machine.transitions[state][transitionName];
            }
        }
    }
    return machine;
}

function build(src, { emitFile, target, name } = {}) {
    const unpackedRules = parser.parse(src);
    const { initial, transitions, transitionsFound } = unpackedRules;
    const ret = {};

    const machine = {
        stack: ["Z"],
        state: initial,
        emitter: new EventEmitter(),
        transitions,

        dispatch: function(actionName) {
            const stackValue = this.stack.pop();
            let transitionActionName;

            const stackMatch = (t) => {
                if (t === "_" && !stackValue) {
                    return true;
                }
                return t === stackValue;
            }

            for (const key in this.transitions[this.state]) {
                if (key.startsWith(`${actionName},`)) {
                    const [, stackTransition] = key.split(",");

                    if (!stackTransition || stackMatch(stackTransition)) {
                        transitionActionName = key;
                        break;
                    }
                }
            }

            try {
                const action = this.transitions[this.state][transitionActionName];
                action.call(this);
                this.emitter.emit("transition", this.state, actionName, this.stack)
            } catch(e) {
                if (!transitionsFound.includes(actionName)) {
                    throw BuildError(`Invalid action: '${actionName}' from state '${this.state}'`);
                }
            }
        },

        consume: function(states, f = token => token) {
            for (const s of states) {
                const transitionName = f(s);
                this.dispatch(transitionName);
            }
            return this;
        },

        stackIsInitial: function({ reset } = {reset: false}) {
            const isInitial = this.stack.length === 1 && this.stack[0] === "Z";
            if (reset) {
                this.reset();
            }
            return isInitial;
        },

        reset: function() {
            this.stack = ["Z"];
            this.state = initial;
            return this;
        },

        subscribe: function(cb) {
            this.emitter.on("transition", (state, action, stack) => cb(state, action, stack));
        },

        _serialize: function(f, { target, name } = { target: "node" }) {
            const serialized = serialize.call(this, initial, transitions, transitionsFound, { target, name });
            if (f) {
                fs.writeFile(f, serialized, (err) => {
                    if (err) {
                        throw BuildError(`Could not write to file: ${err}`);
                    }
                });
            }
            return serialized;
        }
    };

    if (emitFile && typeof emitFile === "string") {
        ret.src = machine._serialize(emitFile, { target, name })
    } else if (emitFile) {
        ret.src = machine._serialize(null, { target, name });
    }
    ret.machine = filterMetaProperties(machine);
    return ret;
}

function inline(strings, ...values) {
    return build(String.raw({ raw: strings }, ...values)).machine;
}

module.exports = { build, inline };