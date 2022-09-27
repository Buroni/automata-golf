# automata-golf

A domain-specific language (DSL) for creating non-deterministic finite-state machines and pushdown automota. 
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

```js
const { inline } = require("./automata-golf/index.js");

const machine = inline`
.s0 -0> s0 -1> s0 -1> (s1);
`;

machine.consume("10110").inAcceptState(); // false
machine.consume("1011").inAcceptState(); // true
```

### a<sup>n</sup>b<sup>n</sup>

The following accepts the format a<sup>n</sup>b<sup>n</sup>

<img width="804" alt="Screenshot 2022-09-27 at 23 40 50" src="https://user-images.githubusercontent.com/3934417/192653399-ec6f8f2f-35c0-4642-b26e-a3b1c5d0e677.png">

```js
const { inline } = require("./automata-golf/index.js");

const machine = inline`
.q0 -[a,_]a> q0;
q0 -_> (q1);
q1 -[b,a]> q1;
`;

machine.consume("aaabbb").inAcceptState(); // true
machine.consume("abb").inAcceptState(); // false
```

### Odd-length palindromes

The following accepts all odd-length palindromes in the language `{a, b}`

<img width="766" alt="Screenshot 2022-09-27 at 23 59 36" src="https://user-images.githubusercontent.com/3934417/192653414-59a8a6cc-11fc-4c25-8509-d61d185487ba.png">


```js
const { inline } = require("../index.js");

const machine = inline`
.q0 -[_]$> q1;

q1 -[a]a> q1;
q1 -[b]b> q1;

q1 -a> q2;
q1 -b> q2;

q2 -[a,a]> q2;
q2 -[b,b]> q2;

q2 -[_,$]> (q3);
`;

console.log(machine.consume("abbba").inAcceptState()); // true
console.log(machine.consume("abb").inAcceptState()); // false
```

Note the program can be golfed to 

```
.q0 -[_]Z> q1 -[a]a> q1 -[b]b> q1 -a> q2;
q1 -b> q2 -[a,a]> q2 -[b,b]> q2 -[_,Z]> (q3);
```

## Build to JS

The machine can be written to a JS file

```js
// A.js
const { build } = require("automata-golf/index.js");
build("(s0) -f> s1", { emitFile: "./machine.js" });

// B.js
const machine = require("./machine.js");
machine.consume("f");
```

### Target

Set `target` to `'browser'` to generate a machine that can be run in a browser 
environment:

```js
build("(s0) -f> s1", { emitFile: "./machine.js", target: "browser" });
```
