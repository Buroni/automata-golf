function ParseError(msg) {
    throw `FSM parse error: ${msg}`;
}

function BuildError(msg) {
    throw `FSM build error: ${msg}`;
}

ParseError.prototype = Error.prototype;
BuildError.prototype = Error.prototype;

function isMetaProperty(property) {
    return property.startsWith("@@");
}

module.exports = { BuildError, ParseError, isMetaProperty };
