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
    console.log("parse");
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
    console.log("parseStatement");
    const token = this.peek();
    console.log(`Current token: ${JSON.stringify(token)}`);

    if (token.type === 'IDENTIFIER' && token.value === 'var') {
      return this.parseVariableDeclaration();
    }

    if (token.type === 'IDENTIFIER' && token.value === 'func') {
      return this.parseFunctionDeclaration();
    }

    if (token.type === 'IDENTIFIER' && token.value === 'mapping') {
      return this.parseMappingDeclaration();
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }

  parseVariableDeclaration() {
    console.log("parseVariableDeclaration");
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

//mapping(address => uint) userBalance
/* func setBalance(key: address, value: uint) {
  userBalance[key] = value
}

func getBalance(key: address) -> uint {
  return userBalance[key]
} */

  parseMappingDeclaration() {
    console.log("parseMappingDeclaration");
    this.consume('IDENTIFIER'); // 'mapping'
    this.consume('LPAREN');
    const keyType = this.consume('IDENTIFIER').value;
    this.consume("EQUAL");
    this.consume("GREATER_THAN");
    const valueType = this.consume('IDENTIFIER').value;
    this.consume('RPAREN');
    const name = this.consume('IDENTIFIER').value;
    return {
      type: 'MappingDeclaration',
      keyType,
      valueType,
      name,
    };
  }

  parseFunctionDeclaration() {
    console.log("parseFunctionDeclaration");
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
    console.log("parseParameter");
    const name = this.consume('IDENTIFIER').value;
    this.consume('COLON');
    this.consume('IDENTIFIER'); // type, but we ignore it for now
    return { name };
  }

  parseFunctionBody() {
    console.log("parseFunctionBody");
    const token = this.peek();
    console.log(`Current token in function body: ${JSON.stringify(token)}`);

    if (token.type === 'IDENTIFIER') {
      console.log("IDENTIFIER");
      const name = this.consume('IDENTIFIER').value;

      if (name === 'return') {
        console.log("ReturnStatement");
        const left = this.consume('IDENTIFIER').value;
        const operatorToken = this.peek();
        if (['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE', 'MODULO'].includes(operatorToken.type)) {
          console.log("BinaryExpression");
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
        }
        if (this.peek().type === 'LBRACKET') {
          console.log("MappingLoadExpression");
          this.consume('LBRACKET');
          const key = this.consume('IDENTIFIER').value;
          this.consume('RBRACKET');
          return {
            type: 'MappingLoadExpression',
            name,
            key,
          };
        } else {
          console.log("SimpleReturnStatement");
          return {
            type: 'ReturnStatement',
            value: left,
          };
        }
      }

      if (this.peek().type === 'EQUAL') {
        console.log("AssignmentExpression");
        this.consume('EQUAL');
        const valueToken = this.consume(this.peek().type);

        if (this.peek().type === 'LBRACKET') {
          this.consume('LBRACKET');
          const key = this.consume('IDENTIFIER').value;
          this.consume('RBRACKET');
          return {
            type: 'MappingAssignmentExpression',
            name,
            key,
            value: valueToken.value,
          };
        } else {
          return {
            type: 'AssignmentExpression',
            name,
            value: valueToken.value,
          };
        }
      }

      if (this.peek().type === 'LBRACKET') {
        console.log("MappingAssignmentExpression");
        this.consume('LBRACKET');
        const key = this.consume('IDENTIFIER').value;
        this.consume('RBRACKET');
        this.consume('EQUAL');
        const value = this.consume('IDENTIFIER').value;
        return {
          type: 'MappingAssignmentExpression',
          name,
          key,
          value
        };
      }
    }

    throw new Error(`Unexpected token in function body: ${token.type}`);
  }
}

module.exports = Parser;
