# automata-golf

A domain-specific language (DSL) written in javascript, for creating non-deterministic finite-state machines and pushdown automota.
Mostly for fun.

In `automata-golf`, a machine is defined by a series of path statements.
There's no need to explicitly define states or transitions.

The example below shows a machine with an initial state `s0`, which transitions
via `f` to and from the accepted state `s1` .

```
# 1,2, and 3 are all equivalent:

# 1
.s0 -f> (s1) -f> s0;

# 2
.s0 <f> (s1);

# 3
s1 -f> .s0;
s0 <f- (s1);
```

Starting states are prefixed with `.`; Success states are wrapped in `(` `)`.

## Pattern matching

Regex is supported for pattern matching

```
.s0 -f> s1 <f- s2;

/^s[0-9]/ -g> t1;
```

## Stacking transitions

Multiple transitions from the same state can be stacked up:

```
.s0 -f> -g> -h> s1;
```

## Pushdown automota

`automata-golf` supports pushdown automota, i.e. a finite-state machine with
a stack and transitions that push/pop the stack.

The following transitions to `s1` via `f` when `a` is top of the stack.
Upon the transition, it pushes `b` to the stack.

```
.s0 -[f,a]b> s1;
```

### Epsilon transitions

Epsilon is represented by `_`. For example the following transitions to `s1`
and pushes `$` to the stack without consuming any input or popping the stack.

```
.s0 -[_,_]$> (s1);

# or equivalently:

.s0 -[_]$> (s1);
```

> Epsilons can usually be omitted, for example `-f>` is short for `-[f,_]_>`.

## Examples

### Odd binary numbers

The following program accepts all binary numbers ending in `1`

<img width="652" alt="Screenshot 2022-10-05 at 13 03 54" src="https://user-images.githubusercontent.com/3934417/194056331-904cd9c1-2e07-4738-b7ad-8af2b036f2e0.png">

```js
const { build } = require("./automata-golf/index.js");

const machine = build(`
.s0 -0> -1> s0 -1> (s1);
`);

machine.consume("10110").inAcceptState(); // false
machine.consume("1011").inAcceptState(); // true
```

### Self-driving robot

The following finite-state machine creates a robot that can be turned on and off,
and switches direction when it collides.

```
const { build } = require("./automata-golf/index.js");

const { machine } = build(`
.off <push> forward <collide> backward -push> off;
`);

machine.consume(["push", "collide"]).state // forward
```

### a<sup>n</sup>b<sup>n</sup>

The following accepts the format a<sup>n</sup>b<sup>n</sup>

<img width="766" alt="Screenshot 2022-10-05 at 13 06 17" src="https://user-images.githubusercontent.com/3934417/194056550-83fc87dd-36cc-4a25-a2f7-267f8fd51a0e.png">

```js
const { build } = require("./automata-golf/index.js");

const machine = build(`
.s0 -[a,_]a> s0;
s0 -_> (s1);
s1 -[b,a]> s1;
`);

machine.consume("aaabbb").inAcceptState(); // true
machine.consume("abb").inAcceptState(); // false
```

### Odd-length palindromes

The following accepts all odd-length palindromes in the language `{a, b}`

<img width="938" alt="Screenshot 2022-10-05 at 13 05 36" src="https://user-images.githubusercontent.com/3934417/194056474-be0fc879-2b26-4bcb-b27e-7defbd0d4983.png">

```js
const { build } = require("../index.js");

const machine = build(`
.s0 -[_]$> s1;

s1 -[a]a> -[b]b> s1;

s1 -a> -b> s2;

s2 -[a,a]> -[b,b]> s2;

s2 -[_,$]> (s3);
`);

console.log(machine.consume("abbba").inAcceptState()); // true
console.log(machine.consume("abb").inAcceptState()); // false
```

Note the program can be golfed to

```
.s0 -[_]Z> s1 -[a]a> -[b]b> s1 -a> -b> s2 -[a,a]> -[b,b]> s2 -[_,Z]> (s3);
```

## Build to JS

The machine can be written to a JS file

```js
// A.js
const { build } = require("automata-golf/index.js");
build(".s0 -f> (s1)", { emitFile: "./machine.js" });

// B.js
const machine = require("./machine.js");
machine.consume("f");
```

### Target

Set `target` to `'browser'` to generate a machine that can be run in a browser
environment:

```js
build(".s0 -f> (s1)", { emitFile: "./machine.js", target: "browser" });
```
