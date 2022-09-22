# automata-golf

A domain-specific language (DSL) for creating finite-state machines and pushdown automota. 
Mostly for fun.

In `automata-golf`, a machine is defined by a series of path statements. 
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

`automata-golf` supports pushdown automota, i.e. a finite-state machine with
a stack and transitions that push/pop the stack.

The following transitions to `s1` via `f` when `a` is top of the stack. 
Upon the transition, it pushes `b` and `c` to the stack.

```
(s0) -[f:a]b,c> s1;
```

Note that the stack is popped on every transition, even ones that don't use the
stack value e.g. `s1 -f> s2`.


### Initial and empty stack

Following convention, the stack initiates as `[Z]` where `Z`
is the initial stack symbol.

`_` matches the empty stack.

```
# The automaton terminates at the "success" state for string "aba"
(s0) -[a:Z]a> s1;
s1 -b> s0;
s0 -[a:_]> success;
```

## Examples

### Self-driving robot

This self-driving robot can only go backwards and forwards, and switches direction when it detects a collision.

```
const machine = inline`
(off) <push> forward <collide> backward -push> off;
`;

machine.consume(["push", "collide", "collide"]).state; // forward
```

### a<sup>n</sup>b<sup>n</sup>

The following example matches the language a<sup>n</sup>b<sup>n</sup>

```js
const { inline } = require("automata-golf/index.js");

const machine = inline`
(s0) -[a:a]a,a> s0 -[a:Z]Z,a> s0 -[b:a]> s1;
`;

machine.consume("aabb").stack // ['Z']
machine.reset();
machine.consume("aab").stack // ['Z', 'a']
machine.reset();

machine.consume("aabb").stackIsInitial({ reset: true }); // true
```

See below for the automaton for this example. 

<img src="https://i.ibb.co/ChgHrtB/Screenshot-2022-09-22-at-23-24-32.png"/>

> Note: Any transition used in the machine definition is valid from any state.
If a specific transition exists but isn't defined at a given state,
the stack is simply popped. 
> 
>This is why we don't need to explicitly define 
> `s0 -b> s0` and `s1 -b> s1` in the above automaton.

## Build to JS

The machine can be written to a JS file

```js
// A.js
const { build } = require("automata-golf/index.js");
build("(s0) -f> s1", { emitFile: "./machine.js" });

// B.js
const machine = require("./machine.js");
machine.dispatch("f");
```
