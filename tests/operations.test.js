const { build } = require("../index.js");

test("Left transition", () => {
    const { machine } = build(`s1 <f- .s0;`);
    expect(machine.consume("f").state).toBe("s1");
});

test("Two-way transition", () => {
    const { machine } = build(`s1 <f> .s0;`);
    expect(machine.consume("ff").state).toBe("s0");
});

test("Double transition", () => {
    const { machine } = build(`s1 <g- <f> .s0;`);
    expect(machine.consume("ff").state).toBe("s0");
    machine.reset();
    expect(machine.consume("f").state).toBe("s1");
    expect(machine.consume("g").state).toBe("s1");
});

test("Transitions to the success stata via epsilons", () => {
    const { machine } = build(`.s0 -_> s1 -[_,_]> s2 -[_]> s3 -[_,_]_> (s4);`);
    expect(machine.consume("").state).toBe("s4");
});

test("Adds $ to stack given input a", () => {
    const { machine } = build(`.s0 -[_]$> s1 -[a,$]b> (s2);`);
    machine.consume("a");
    expect(machine.state).toBe("s2");
    expect(machine.stack[0]).toBe("b");
    expect(machine.input.length).toBe(0);
});

test("Attempts to use an unknown transition", () => {
    const { machine } = build(`.s0 -f> s1;`);
    expect(machine.consume("g").state).toBe("s0");
});

test("No starting state", () => {
    expect(() => build(`s0 -f> s1;`)).toThrow();
});

test("Halts after exhausting possible paths", () => {
    const { machine } = build(`
        .q0 -[_]Z> q1 -[a]a> q1 -[b]b> q1 -a> q2;
        q1 -b> q2 -[a,a]> q2 -[b,b]> q2 -[_,Z]> (q3);  
    `);
    machine.consume("ab");
    expect(machine.state).toBe("q3");
    expect(machine.input.length).toBe(1);
    expect(machine.input[0]).toBe("b");
});

test("Regex", () => {
    const { machine } = build(`
        .s0 -e> s1 -f> s2;
        s2 -g> t1 -g> (t2);
        /^s[0-9]/ -foo> bar;
    `);
    expect(machine.state).toBe("s0");
    machine.consume(["e", "foo"]);
    expect(machine.state).toBe("bar");

    machine.reset();
    expect(machine.state).toBe("s0");
    machine.consume(["e", "f", "foo"]);
    expect(machine.state).toBe("bar");
});
