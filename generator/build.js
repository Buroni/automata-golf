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

function build(src, { emitFile, target, name, strictTransitions } = {}) {
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
    if (typeof strictTransitions === "undefined") {
        strictTransitions = true;
    }

    const unpackedRules = parser.parse(src);
    const { initial, transitions, transitionsFound, acceptStates } = unpackedRules;
    const ret = {};

    const machine = {
        stack: [],
        state: initial,
        input: [],
        emitter: new EventEmitter(),
        transitions,
        acceptStates,

        consume: function(input) {
            if (typeof input === "string") {
                input = input.split("");
            }
            return this._consume(...input);
        },

        _consume: function(head, ...tail) {
            /**
             * Dispatches each token in an iterable `states` value
             */

            this.input.shift();

            if (!head) {
                return this;
            }

            const stackValue = this.stack.pop();
            const compositeKey = this._findCompositeKey(head, stackValue);
            const epsilonCompositeKey = this._findCompositeKey("_", stackValue);
            const stateTransitions = this.transitions[this.state];

            if (!stateTransitions || !(stateTransitions[compositeKey] || stateTransitions[epsilonCompositeKey])) {
                this.halted = true;
                return this;
            }
            this.halted = false;

            const actions = []
                .concat(stateTransitions[compositeKey] || [])
                .concat(stateTransitions[epsilonCompositeKey] || []);

            if (actions.length === 1) {
                actions[0].fn.call(this);
                this._consume(...tail);
            } else {
                const snapshot = this._clone();
                for (const action of actions) {
                    action.fn.call(snapshot);
                    snapshot._consume(...tail);
                    if (snapshot._inAcceptState()) {
                        Object.assign(this, snapshot);
                        break;
                    }
                }
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
            this.emitter.on("transition", (state, action, stackTop) => cb(state, action, stackTop));
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
            // TODO - simplify
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
        },

        _inAcceptState: function() {
            // TODO - need to check if halted?
            if (this.halted) {
                return false;
            }
            const { input, stack, state } = this;
            return !input.length && (!stack.length || this.acceptStates.includes(state));
        },

        _clone: function() {
            return {
                ...this,
                stack: [...this.stack],
                state: this.state,
                emitter: null,
                halted: false,
            };
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