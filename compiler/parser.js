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
    const valueType = this.consume("IDENTIFIER").value; // type, but we ignore it for now
    this.consume("ASSIGN");
    const value = this.consume(this.peek().type);
    return {
      type: "VariableDeclaration",
      name,
      value,
      valueType
    };
  }

  parseMappingDeclaration() {
    console.log("parseMappingDeclaration");
    this.consume("IDENTIFIER"); // 'mapping'
    this.consume("LPAREN");
    let keyTypes = [];
    keyTypes.push(this.consume("IDENTIFIER").value);
    this.consume("M_ARROW");
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
    this.consume("M_ARROW");
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
    console.log("function name", name);
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
    if (this.peek().type === "F_ARROW") {
      this.consume("F_ARROW");
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
    this.consume("COLON");
    this.consume("IDENTIFIER"); // type, but we ignore it for now
    return { name };
  }

  parseFunctionBody() {
    console.log("parseFunctionBody");
    const token = this.peek();
    if (token.type === "IDENTIFIER") {
      if (token.value == "return") {
        return this.parseReturnStatement();
      } else if (token.value == "if") {
        return this.parseIfStatement();
      } else if (token.value == "var") {
        return this.parseVariableExpression();
      } else if (token.value == "for") {
        return this.parseForLoop();
      } else {
        return this.parseAssignmentExpression();
      }
    }
    throw new Error(`Unexpected token in function body: ${token.type}`);
  }

  parseForLoop() {
    console.log("parseForLoop");
    this.consume("IDENTIFIER"); // 'for'
    let variableExpression = this.parseVariableExpression();
    this.consume("SEMI_COLON");
    let condition = this.parseExpression();
    this.consume("SEMI_COLON");
    let assignmentExpression = this.parseAssignmentExpression();
    this.consume("LBRACE");
    let body = [];
    while (this.peek().type !== "RBRACE") {
      body.push(this.parseFunctionBody());
    }
    this.consume("RBRACE");
    return {
      type: "ForLoop",
      variableExpression,
      condition,
      assignmentExpression,
      body,
    };
  }

  parseVariableExpression() {
    console.log("parseVariableExpression");
    this.consume("IDENTIFIER"); // 'var'
    const name = this.consume("IDENTIFIER").value;
    this.consume("ASSIGN");
    const expression = this.parseExpression();
    return {
      type: "VariableExpression",
      name,
      expression,
    }
  }

  parseAssignmentExpression() {
    console.log("parseAssignmentExpression");
    const assignLeft = this.parseExpression();
    this.consume("ASSIGN");
    const assignRight = this.parseExpression();
    return {
      type: "AssignmentExpression",
      assignLeft,
      assignRight,
    } 
  }


  parseReturnStatement() {
    console.log("parseReturnStatement");
    this.consume("IDENTIFIER"); // 'return'
    const expression = this.parseExpression();
    return {
      type: "ReturnStatement",
      expression,
    };
  }

  parseIfStatement() {
    console.log("parseIfStatement");
    this.consume("IDENTIFIER"); // 'if'
    const condition = this.parseExpression();

    this.consume("LBRACE");
    const ifBody = [];
    while (this.peek().type !== "RBRACE") {
      ifBody.push(this.parseFunctionBody());
    }
    this.consume("RBRACE");

    let elseBody = null;
    if (this.peek().type === "IDENTIFIER" && this.peek().value === "else") {
      this.consume("IDENTIFIER"); // 'else'
      this.consume("LBRACE");
      elseBody = [];
      while (this.peek().type !== "RBRACE") {
        elseBody.push(this.parseFunctionBody());
      }
      this.consume("RBRACE");
    }

    return {
      type: "IfStatement",
      condition,
      ifBody,
      elseBody,
    };
  }

  parseExpression() {
    console.log("parseExpression");
    let values = [];
    let operators = [];

    values = this.parseTerm(values);
    while (
      [
        "ADD",
        "SUBTRACT",
        "MULTIPLY",
        "DIVIDE",
        "MODULO",
        "AND",
        "OR",
        "EQUAL",
        "NOT_EQUAL",
        "GREATER_THAN",
        "LESS_THAN",
        "GREATER_THAN_EQUAL",
        "LESS_THAN_EQUAL",
      ].includes(this.peek().type)
    ) {
      console.log("parseTerm")
      operators.push(this.consume(this.peek().type));
      values = this.parseTerm(values);
    }

    return {
      type: "Expression",
      values,
      operators,
    };
  }

  parseTerm(terms) {
    console.log("parseTerm");
    let keys = [];
    const token = this.consume(this.peek().type); 
    if (this.peek().type === "LBRACKET") {
      keys = this.parseNestedMappingAssignment(keys);
    }
    terms.push({ token, keys });
    return terms;
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

function replacer(key, value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value;
}

module.exports = Parser;

