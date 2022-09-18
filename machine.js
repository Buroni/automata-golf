const parser = require("./weird.js");
const fs = require("fs");


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
        const { name } = state;
        const transitionObj = {
            [transition.name]: function () {
                this.state = nextState.name;
            }
        };
        if (!this.transitions[name]) {
            this.transitions[name] = transitionObj;
        } else {
            this.transitions[name] = {...this.transitions[name], ...transitionObj};
        }
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

function build(src) {
    const rules = parser.parse(snippet);
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

    return {
        state: initial,
        transitions,
        dispatch: function(actionName) {
            const action = this.transitions[this.state][actionName];

            if (action) {
                action.call(this);
            } else {
                console.log(`Invalid action: ${action}`);
            }
        },
    }
}

const snippet = `
(s1) -f> s2 <f> s3 -g> s4;
s2 -g> s6;
`;

const machine = build(snippet);

// fs.writeFile("./fsm.js", serialize(machine), (err) => {
//     if (err) {
//         throw BuildError(`Could not write to file: ${err}`);
//     }
// });

// console.log(machine.state);
// machine.dispatch("f");
// console.log(machine.state);
// machine.dispatch("f");
// console.log(machine.state);
// machine.dispatch("f");
// console.log(machine.state);