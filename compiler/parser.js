class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.current = 0;
    }
  
    peek() {
      return this.tokens[this.current];
    }
  
    consume(type) {
      const token = this.tokens[this.current];
      if (token.type !== type) {
        throw new Error(`Expected token type ${type}, but got ${token.type}`);
      }
      this.current++;
      return token;
    }
  
    parse() {
      const ast = {
        type: 'Contract',
        name: '',
        body: [],
      };
  
      this.consume('IDENTIFIER'); // 'contract'
      ast.name = this.consume('IDENTIFIER').value;
  
      this.consume('LBRACE');
      while (this.peek().type !== 'RBRACE') {
        ast.body.push(this.parseStatement());
      }
      this.consume('RBRACE');
  
      return ast;
    }
  
    parseStatement() {
      const token = this.peek();
  
      if (token.type === 'IDENTIFIER' && token.value === 'var') {
        return this.parseVariableDeclaration();
      }
  
      if (token.type === 'IDENTIFIER' && token.value === 'func') {
        return this.parseFunctionDeclaration();
      }
  
      throw new Error(`Unexpected token: ${token.type}`);
    }
  
    parseVariableDeclaration() {
      this.consume('IDENTIFIER'); // 'var'
      const name = this.consume('IDENTIFIER').value;
      this.consume('COLON');
      this.consume('IDENTIFIER'); // type, but we ignore it for now
      this.consume('EQUAL');
      const value = parseInt(this.consume('NUMBER').value, 10);
      return {
        type: 'VariableDeclaration',
        name,
        value,
      };
    }
  
    parseFunctionDeclaration() {
      this.consume('IDENTIFIER'); // 'func'
      const name = this.consume('IDENTIFIER').value;
      this.consume('LPAREN');
      const params = [];
      if (this.peek().type !== 'RPAREN') {
        params.push(this.parseParameter());
        while (this.peek().type === 'COMMA') {
          this.consume('COMMA');
          params.push(this.parseParameter());
        }
      }
      this.consume('RPAREN');
  
      let returnType = null;
      if (this.peek().type === 'ARROW') {
        this.consume('ARROW');
        returnType = this.consume('IDENTIFIER').value;
      }
  
      this.consume('LBRACE');
      const body = [];
      while (this.peek().type !== 'RBRACE') {
        body.push(this.parseFunctionBody());
      }
      this.consume('RBRACE');
  
      return {
        type: 'FunctionDeclaration',
        name,
        params,
        returnType,
        body,
      };
    }
  
    parseParameter() {
      const name = this.consume('IDENTIFIER').value;
      this.consume('COLON');
      this.consume('IDENTIFIER'); // type, but we ignore it for now
      return { name };
    }
  
    parseFunctionBody() {
      const token = this.peek();
  
      if (token.type === 'IDENTIFIER') {
        const name = this.consume('IDENTIFIER').value;
  
        if (name === 'return') {
          const left = this.consume('IDENTIFIER').value;
          const operatorToken = this.peek();
          if (['PLUS', 'MINUS', 'MULTIPLY', 'DIVIDE', 'MODULO'].includes(operatorToken.type)) {
            this.consume(operatorToken.type);
            const right = this.consume('IDENTIFIER').value;
            return {
              type: 'ReturnStatement',
              value: {
                type: 'BinaryExpression',
                operator: operatorToken.type.toLowerCase(),
                left,
                right,
              },
            };
          } else {
            return {
              type: 'ReturnStatement',
              value: left,
            };
          }
        }
  
        if (this.peek().type === 'EQUAL') {
          this.consume('EQUAL');
          const valueToken = this.consume(this.peek().type); // Accept both IDENTIFIER and NUMBER
          return {
            type: 'AssignmentExpression',
            name,
            value: valueToken.value,
          };
        }
      }
  
      throw new Error(`Unexpected token in function body: ${token.type}`);
    }
  }
  
  
  module.exports = Parser;
  