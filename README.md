# fsm-paths

A domain-specific language (DSL) for creating finite-state machines and pushdown automota. 
Mostly for fun.

In `fsm-paths`, a machine is defined by a series of path statements. 
There's no need to explicitly define states or transitions.

The example below shows a machine with an initial state `s0`, which transitions
via `f` to and from `s1` .

```
# The following are all equivalent:

(s0) -f> s1 -f> s0;

(s0) <f> s1;

(s0) <f- s1;
s1 -f> s0;
```

## Pattern matching

Regex is supported for pattern matching

```
(s0) -f> s1 <f- s2;
t1 -g> s2;
/^s[0-9]/ -g> t1;
```

The wildcard `*` is shorthand for `/.*/`

```
* -g> t1;
```

## Pushdown automota

`fsm-paths` supports pushdown automota, i.e. a finite-state machine with
a stack and transitions that push/pop the stack.

The following transitions to `s1` via `f` when `a` is top of the stack. 
Upon the transition, it pushes `b` and `c` to the stack.

Note that the stack is popped on every transition, even ones that don't use the
stack value e.g. `s1 -f> s2`.

```
(s0) -[f:a]b,c> s1;
```

### Empty stack

`_` matches the empty stack.

```
# The automaton terminates at the "success" state for string "aba"
(s0) -[a:Z]a> s1;
s1 -b> s0;
s0 -[a:_]> success;
```

Following convention, `Z` denotes the initial stack state.

## Examples

The following example matches the language a<sup>n</sup>b<sup>n</sup>

```js
const { inline } = require("fsm-paths/index.js");

const machine = inline`
(s0) -[a:a]a,a> s0;
s0 -[a:Z]Z,a> s0;
s0 -[b:a]> s1;
s0 -b> s0;
s1 -b> s1;
`;

machine.consume("aabb").stack // ['Z']
machine.reset();
machine.consume("aab").stack // ['Z', 'a']
machine.reset();

machine.consume("aabb").stackIsInitial({ reset: true }); // true
```

See below for the automaton for this example. 

<img src="https://i.ibb.co/0tbRWfj/Screenshot-2022-09-22-at-20-13-47.png"/>

### Build to JS

The machine can be written to a JS file

```js
// A.js
const { build } = require("fsm-paths/index.js");
build("(s0) -f> s1", { emitFile: "./machine.js" });

// B.js
const machine = require("./machine.js");
machine.dispatch("f");
```