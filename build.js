const parser = require("./fsm.js");
const fs = require("fs");

function SourceMap() {
    this._sourceMap = {};

    this.get = function([stateName, transitionName], fallback = undefined) {
        const sourceMapEntry = this._sourceMap[stateName];
        if (!sourceMapEntry || !sourceMapEntry[transitionName]) {
            return fallback;
        }
        return sourceMapEntry[transitionName];
    }

    this.set = function([stateName, transitionName], v) {
        if (!this._sourceMap[stateName]) {
            this._sourceMap[stateName] = [];
        }
        this._sourceMap[stateName][transitionName] = v;
    }
}

const SOURCE_MAP = new SourceMap();

// https://stackoverflow.com/a/34749873/2744990
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

function BuildError(msg) {
    throw `FSM build error: ${msg}`;
}
BuildError.prototype = Error.prototype;

function TransitionBuilder() {
    this.transitions = {};

    this.addTransition = function(state, transition, nextState) {
        const outSrc = `${transition.name}: function() { this.state = "${nextState.name}"; }`;

        const { name } = state;
        const transitionObj = {
            [transition.name]: function () {
                this.state = nextState.name;
            },
        };

        if (!this.transitions[name]) {
            this.transitions[name] = transitionObj;
        } else {
            Object.assign(this.transitions[name], transitionObj);
        }
        SOURCE_MAP.set([name, transition.name], outSrc);
    }
}

function unpackRule(ruleArr) {
    const builder = new TransitionBuilder();

    ruleArr.forEach((item, i) => {
        if (item.type === "state" && i !== ruleArr.length - 1) {
            const transition = ruleArr[i + 1];
            const nextState = ruleArr[i + 2];

            switch (transition.direction) {
                case "r":
                    builder.addTransition(item, transition, nextState);
                    break;
                case "l":
                    builder.addTransition(nextState, transition, item);
                    break;
                case "lr":
                    builder.addTransition(item, transition, nextState);
                    builder.addTransition(nextState, transition, item);
                    break;
                default:
                    break;
            }
        }
    });

    const initialState = ruleArr.find(r => r.initial);

    return {
        initial: initialState?.name || false,
        transitions: builder.transitions,
    };
}

function emit(machine, f) {
    let src = `var fsm = {
    state: '${machine.state}',
    dispatch: function(actionName) {
        var action = this.transitions[this.state][actionName];

        if (action) {
            action.call(this);
        } else {
            console.log('Invalid action: ' + action);
        }
    },
    consume: function(states, f) {
        for (var i = 0; i < states.length; i++) {
            var transitionName = f(states[i]);
            this.dispatch(transitionName);
        }
    },
    transitions: {
`;
    for (const [name, transitions] of Object.entries(machine.transitions)) {
        const transitionSrc = Object.values(transitions).map(t => SOURCE_MAP.get([name, t.name])).filter(t => t);
        src += `        ${name}: { ${transitionSrc.join(", ")} },\n`;
    }
    src += "}\n};"
    src += "\nmodule.exports = fsm;\n";

    fs.writeFile(f, src, (err) => {
        if (err) {
            throw BuildError(`Could not write to file: ${err}`);
        }
    });
}

function build(src, writeFile) {
    const rules = parser.parse(src);
    const unpackedRules = rules.map(r => unpackRule(r));
    let initial;

    try {
        initial = unpackedRules.find(r => r.initial).initial;
    } catch(e) {
        throw BuildError(
            "No initial state set; wrap desired initial state in parenthesis, e.g. `(s1) -f> s2;`"
        );
    }

    const splitTransitions = unpackedRules.map(r => r.transitions);
    const transitions = splitTransitions.reduce((r,c) => mergeDeep(r, c), {});

    const machine = {
        state: initial,
        transitions,
        dispatch: function(actionName) {
            const action = this.transitions[this.state][actionName];

            if (action) {
                action.call(this);
            } else {
                throw BuildError(`Invalid action: ${action}`);
            }
        },
        consume: function(states, f) {
            for (const s of states) {
                const transitionName = f(s);
                this.dispatch(transitionName);
            }
        }
    }

    if (writeFile) {
        emit(machine, writeFile);
    }

    return machine;
}

function main() {
    const args = process.argv.slice(2);

    if (args.length > 0) {
        const inFile = args[0];
        const outArg = args[1];
        const outFile = outArg.endsWith(".js") ? outArg : `${outArg}.js`;

        let src;
        try {
            src = fs.readFileSync(inFile, "utf-8");
        } catch(e) {
            throw `An error occurred while reading source file: ${e}`;
        }

        build(src, outFile);
    }
}

main();

module.exports = build;