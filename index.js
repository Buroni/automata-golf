const parser = require("./parser/grammar.js");
const fs = require("fs");

function filterMetaProperties(machine) {
    for (const state in machine.transitions) {
        for (const transitionName in machine.transitions[state]) {
            if (transitionName.startsWith("$$")) {
                delete machine.transitions[state][transitionName];
            }
        }
    }
    return machine;
}

function BuildError(msg) {
    throw `FSM build error: ${msg}`;
}
BuildError.prototype = Error.prototype;

function emit(machine, f) {
    let src = `var fsm = {
    stack: [],
    state: '${machine.state}',
    dispatch: function(actionName) {
        var action = this.transitions[this.state][actionName];

        if (action) {
            action.call(this);
        } else {
            console.log('Invalid action: \\'' + action + '\\' from state \\'' + name + '\\'');
        }
    },
    consume: function(states, f = function(token) { return token; }) {
        for (var i = 0; i < states.length; i++) {
            var transitionName = f(states[i]);
            this.dispatch(transitionName);
        }
    },
    transitions: {
`;
    for (const [name, transitions] of Object.entries(machine.transitions)) {
        const transitionSrc = [];
        for (const key in transitions) {
            if (key.startsWith("$$src")) {
                transitionSrc.push(transitions[key])
            }
        }
        src += `        ${name}: { ${transitionSrc.join(", ")} },\n`;
    }

    src += "}\n};"
    src += "\nmodule.exports = fsm;\n";

    if (f) {
        fs.writeFile(f, src, (err) => {
            if (err) {
                throw BuildError(`Could not write to file: ${err}`);
            }
        });
    }
    return src;
}

function build(src, { emitFile, strictActions } = {}) {
    const unpackedRules = parser.parse(src);
    const { initial, transitions } = unpackedRules;
    const ret = {};

    const machine = {
        stack: [],
        state: initial,
        transitions,
        dispatch: function(actionName) {
            const stackValue = this.stack.pop();
            // console.log("--", actionName, stackValue)
            let transitionActionName;
            for (const key in this.transitions[this.state]) {
                if (key.startsWith(actionName)) {
                    // console.log(key, actionName)
                    const [, stackTransition] = key.split(",");
                    if (!stackTransition || stackTransition === stackValue) {
                        transitionActionName = key;
                        break;
                    }
                }
            }

            try {
                const action = this.transitions[this.state][transitionActionName];
                action.call(this);
            } catch(e) {
                if (strictActions) {
                    throw BuildError(`Invalid action: '${actionName}' from state '${this.state}'`);
                }
            }
        },
        consume: function(states, f = token => token) {
            for (const s of states) {
                const transitionName = f(s);
                this.dispatch(transitionName);
            }
        }
    };

    if (emitFile && typeof emitFile === "string") {
        ret.src = emit(machine, emitFile);
    } else if (emitFile) {
        ret.src = emit(machine);
    }
    ret.machine = filterMetaProperties(machine);
    return ret;
}

function inline(strings, ...values) {
    return build(String.raw({ raw: strings }, ...values)).machine;
}

function main() {
    const args = process.argv.slice(2);

    if (args.length > 0) {
        const inFile = args[0];
        const outArg = args[1];
        const emitFile = outArg.endsWith(".js") ? outArg : `${outArg}.js`;

        let src;
        try {
            src = fs.readFileSync(inFile, "utf-8");
        } catch(e) {
            throw `An error occurred while reading source file: ${e}`;
        }
        build(src, { emitFile });
    }
}

main();

module.exports = { build, inline };
