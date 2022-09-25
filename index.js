const { build, inline } = require("./generator/build.js");
const fs = require("fs");

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

// main();

module.exports = { build, inline };
