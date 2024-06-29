const Lexer = require('./lexer');
const Parser = require('./parser');
const Generator = require('./generator');

class Compiler {

    compile(code) {
        const tokens = new Lexer(code).tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse(); 
        const generator = new Generator();
        return generator.generate(ast);
    }
}

module.exports = Compiler;