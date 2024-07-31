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
      type: "Contract",
      name: "",
      body: [],
    };

    this.consume("IDENTIFIER"); // 'contract'
    ast.name = this.consume("IDENTIFIER").value;

    this.consume("LBRACE");
    while (this.peek().type !== "RBRACE") {
      ast.body.push(this.parseStatement());
    }
    this.consume("RBRACE");

    return ast;
  }

  parseStatement() {
    console.log("parseStatement");
    const token = this.peek();

    if (token.type === "IDENTIFIER" && token.value === "var") {
      return this.parseVariableDeclaration();
    }

    if (token.type === "IDENTIFIER" && token.value === "func") {
      return this.parseFunctionDeclaration();
    }

    if (token.type === "IDENTIFIER" && token.value === "mapping") {
      return this.parseMappingDeclaration();
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }

  parseVariableDeclaration() {
    console.log("parseVariableDeclaration");
    this.consume("IDENTIFIER"); // 'var'
    const name = this.consume("IDENTIFIER").value;
    this.consume("COLON");
    this.consume("IDENTIFIER"); // type, but we ignore it for now
    this.consume("EQUAL");
    const value = parseInt(this.consume("NUMBER").value, 10);
    return {
      type: "VariableDeclaration",
      name,
      value,
    };
  }

  parseMappingDeclaration() {
    console.log("parseMappingDeclaration");
    this.consume("IDENTIFIER"); // 'mapping'
    this.consume("LPAREN");
    let keyTypes = [];
    keyTypes.push(this.consume("IDENTIFIER").value);
    this.consume("EQUAL");
    this.consume("GREATER_THAN");
    if (this.peek().value === "mapping") {
      keyTypes = this.parseNestedMappingDeclaration(keyTypes);
    } else {
      keyTypes.push(this.consume("IDENTIFIER").value);
    }
    this.consume("RPAREN");
    const name = this.consume("IDENTIFIER").value;
    return {
      type: "MappingDeclaration",
      keyTypes,
      name,
    };
  }

  parseNestedMappingDeclaration(keyTypes) {
    console.log("parseNestedMappingDeclaration");
    this.consume("IDENTIFIER"); // 'mapping'
    this.consume("LPAREN");
    const keyType = this.consume("IDENTIFIER").value;
    keyTypes.push(keyType);
    this.consume("EQUAL");
    this.consume("GREATER_THAN");
    if (this.peek().value === "mapping") {
      keyTypes = this.parseNestedMappingDeclaration(keyTypes);
    } else {
      keyTypes.push(this.consume("IDENTIFIER").value);
    }
    this.consume("RPAREN");
    return keyTypes;
  }

  parseFunctionDeclaration() {
    console.log("parseFunctionDeclaration");
    this.consume("IDENTIFIER"); // 'func'
    const name = this.consume("IDENTIFIER").value;
    this.consume("LPAREN");
    const params = [];
    if (this.peek().type !== "RPAREN") {
      params.push(this.parseParameter());
      while (this.peek().type === "COMMA") {
        this.consume("COMMA");
        params.push(this.parseParameter());
      }
    }
    this.consume("RPAREN");

    let returnType = null;
    if (this.peek().type === "ARROW") {
      this.consume("ARROW");
      returnType = this.consume("IDENTIFIER").value;
    }

    this.consume("LBRACE");
    const body = [];
    while (this.peek().type !== "RBRACE") {
      body.push(this.parseFunctionBody());
    }
    this.consume("RBRACE");

    return {
      type: "FunctionDeclaration",
      name,
      params,
      returnType,
      body,
    };
  }

  parseParameter() {
    console.log("parseParameter");
    const name = this.consume("IDENTIFIER").value;
    console.log("name", name);
    this.consume("COLON");
    this.consume("IDENTIFIER"); // type, but we ignore it for now
    return { name };
  }

  parseFunctionBody() {
    console.log("parseFunctionBody");
    const token = this.peek();

    if (token.type === "IDENTIFIER") {
      console.log("IDENTIFIER");
      const name = this.consume("IDENTIFIER").value;

      if (name === "return") {
        console.log("ReturnStatement");
        const left = this.consume("IDENTIFIER").value;
        const operatorToken = this.peek();
        if (
          [
            "ADD",
            "SUBTRACT",
            "MULTIPLY",
            "DIVIDE",
            "MODULO",
            "AND",
            "OR",
          ].includes(operatorToken.type)
        ) {
          console.log("BinaryExpression");
          this.consume(operatorToken.type);
          const right = this.consume("IDENTIFIER").value;
          return {
            type: "ReturnStatement",
            value: {
              type: "BinaryExpression",
              operator: operatorToken.type.toLowerCase(),
              left,
              right,
            },
          };
        }
        if (this.peek().type === "LBRACKET") {
          console.log("MappingLoadExpression");
          let keys = [];
          this.consume("LBRACKET");
          const key = this.consume("IDENTIFIER").value;
          keys.push(key);
          this.consume("RBRACKET");
          if (this.peek().type === "LBRACKET") {
            keys = this.parseNestedMappingAssignment(keys);
          }
          return {
            type: "MappingLoadExpression",
            name: left,
            keys,
          };
        } else {
          console.log("SimpleReturnStatement");
          return {
            type: "ReturnStatement",
            value: left,
          };
        }
      }

      if (this.peek().type === "EQUAL") {
        console.log("AssignmentExpression");
        this.consume("EQUAL");
        const valueToken = this.consume(this.peek().type);

        if (this.peek().type === "LBRACKET") {
          console.log("MappingAssignmentExpression");
          this.consume("LBRACKET");
          const key = this.consume("IDENTIFIER").value;
          this.consume("RBRACKET");
          return {
            type: "MappingAssignmentExpression",
            name,
            key,
            value: valueToken.value,
          };
        } else if (
          [
            "ADD",
            "SUBTRACT",
            "MULTIPLY",
            "DIVIDE",
            "MODULO",
            "AND",
            "OR",
          ].includes(this.peek().type)
        ) {
          console.log("BinaryAssignmentExpression");
          const operatorToken = this.consume(this.peek().type);
          console.log("operatorToken", operatorToken);
          const right = this.consume("IDENTIFIER").value;
          console.log("right", right);
          return {
            type: "BinaryAssignmentExpression",
            name,
            operator: operatorToken.type.toLowerCase(),
            right,
          };
        } else {
          console.log("SimpleAssignmentExpression");
          return {
            type: "AssignmentExpression",
            name,
            value: valueToken.value,
          };
        }
      }

      if (this.peek().type === "LBRACKET") {
        console.log("MappingAssignmentExpression");
        let keys = [];
        this.consume("LBRACKET");
        const key = this.consume("IDENTIFIER").value;
        keys.push(key);
        this.consume("RBRACKET");
        if (this.peek().type === "LBRACKET") {
          keys = this.parseNestedMappingAssignment(keys);
        }
        this.consume("EQUAL");
        const value = this.consume("IDENTIFIER").value;
        return {
          type: "MappingAssignmentExpression",
          name,
          keys,
          value,
        };
      }
    }

    throw new Error(`Unexpected token in function body: ${token.type}`);
  }

  parseNestedMappingAssignment(keys) {
    console.log("parseNestedMappingAssignment");
    this.consume("LBRACKET");
    const key = this.consume("IDENTIFIER").value;
    keys.push(key);
    this.consume("RBRACKET");
    if (this.peek().type === "LBRACKET") {
      keys = this.parseNestedMappingAssignment(keys);
    }
    return keys;
  }
}

module.exports = Parser;
