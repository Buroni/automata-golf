const { parser } = require("../parser/grammar.js");
const { serialize } = require("../generator/serialize.js");
const { BuildError } = require("../utils.js");
const { isMetaProperty } = require("../utils");
const fs = require("fs");
const { EventEmitter } = require("events");

function filterMetaProperties(machine) {
    /**
     * Remove object properties related to source code generation, that are only used
     * during build and shouldn't be on the public machine object.
     *
     * These are properties prefixed with '@@' or '_'
     */
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
    /**
     * Parses the given source and generates a machine.
     *
     * emitFile:
     *  If `emitFile` is left out, returns the machine object as `{ machine }`.
     *  If `emitFile` is `true`, returns the source code too as `{ machine, src }`.
     *  If `emitFile` is a file path string, writes the source to that path and returns `{ machine, src }`.
     *
     * target:
     *  Target environment for source code emission: either 'node' or 'browser'.
     *  If target is 'browser', then `name` should also be defined as this determines the name of the window object.
     *
     * name:
     *  The name of the window object when target is 'browser'.
     *
     *  NOTE: All code used in methods on the `machine` object should originate from the object, so that the
     *        object can be serialized correctly. E.g. `require` or using a resource defined elsewhere in this file
     */
    const unpackedRules = parser.parse(src);
    const { initial, transitions, transitionsFound } = unpackedRules;
    const ret = {};

    const machine = {
        stack: ["Z"],
        state: initial,
        emitter: new EventEmitter(),
        transitions,

        dispatch: function(transitionName) {
            /**
             * Performs a transition in the machine from a given transition token.
             * e.g. `dispatch("f")` moves the state from `s0` to `s1` in `s0 -f> s1`
             */
            const stackValue = this.stack.pop();
            // E.g. the transition for `f,a` if the requested transition is `f` and `a` is on top of the stack
            const transitionStateComposite = this._findCompositeKey(transitionName, stackValue);

            try {
                const action = this.transitions[this.state][transitionStateComposite];
                action.call(this);
            } catch(e) {
                if (!transitionsFound.includes(transitionName)) {
                    throw BuildError(`Invalid action: '${transitionName}' from state '${this.state}'`);
                }
            }
            this.emitter.emit("transition", this.state, transitionName, this.stack);
        },

        consume: function(states, f = token => token) {
            /**
             * Dispatches each token in an iterable `states` value
             */
            for (const s of states) {
                const transitionName = f(s);
                this.dispatch(transitionName);
            }
            return this;
        },

        stackIsInitial: function({ reset } = {reset: false}) {
            /**
             * Checks if stack is `[Z]`
             */
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
            /**
             * Converts the object instance to a string for writing to file.
             * Note this property is removed in the public `machine` object.
             */
            const serialized = serialize.call(this, initial, transitions, transitionsFound, { target, name });
            if (f) {
                fs.writeFile(f, serialized, (err) => {
                    if (err) {
                        throw BuildError(`Could not write to file: ${err}`);
                    }
                });
            }
            return serialized;
        },

        _stackMatch: function(t, stackValue) {
            /**
             * If transition stack value is empty then check if stack is empty,
             * otherwise perform equality check.
             */
            if (t === "_" && !stackValue) {
                return true;
            }
            return t === stackValue;
        },

        _findCompositeKey: function(transitionName, stackValue) {
            /**
             * Given a transition name e.g. `f`, finds the composite {transition},{state} transition
             * for the current stack value if it exists.
             *
             * For example if the requested transition is `f` and the current value atop the stack is `a`,
             * then the method matches and returns transition `f,a`.
             */
            for (const key in this.transitions[this.state]) {
                if (key.startsWith(`${transitionName},`)) {
                    const [, stackTransition] = key.split(",");
                    if (!stackTransition || this._stackMatch(stackTransition, stackValue)) {
                        return key;
                    }
                }
            }
        }
    };

    if (emitFile && typeof emitFile === "string") {
        ret.src = machine._serialize(emitFile, { target, name })
    } else if (emitFile) {
        // Don't write src to file
        ret.src = machine._serialize(null, { target, name });
    }
    ret.machine = filterMetaProperties(machine);
    return ret;
}

function inline(strings, ...values) {
    return build(String.raw({ raw: strings }, ...values)).machine;
}

module.exports = { build, inline };