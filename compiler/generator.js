class Generator {
  constructor() {
    this.variableIndex = 0;
    this.variableMap = {};
  }

  generate(ast) {
    const bytecode = { initialization: [], functions: {} };
    let functionIndex = 0;

    for (const statement of ast.body) {
      if (statement.type === "VariableDeclaration") {
        const variableKey = this.getVariableKey(statement.name);
        bytecode.initialization.push({ opcode: "PUSH", value: this.to256BitWord(variableKey) });
        bytecode.initialization.push({
          opcode: "PUSH",
          value: this.to256BitWord(statement.value),
        });
        bytecode.initialization.push({ opcode: "SSTORE" });
      }

      if (statement.type === "MappingDeclaration") {
        const variableKey = this.getVariableKey(statement.name);
      }

      if (statement.type === "FunctionDeclaration") {
        const functionBody = [];

        for (const bodyStatement of statement.body) {
          if (bodyStatement.type === "ReturnStatement") {
            this.generateReturnStatement(bodyStatement, functionBody);
          }

          if (bodyStatement.type === "AssignmentExpression") {
            this.generateAssignmentExpression(bodyStatement, functionBody);
          }

          if (bodyStatement.type === "IfStatement") {
            this.generateIfStatement(bodyStatement, functionBody);
          }
        }
        bytecode.functions[functionIndex++] = {
          params: statement.params.map((param) => {
            return this.to256BitWord(param.name);
          }),
          body: functionBody,
        };
      }
    }

    return bytecode;
  }

  generateAssignmentExpression(statement, functionBody) {
    const leftAssign = statement.assignLeft;
    const rightAssign = statement.assignRight;
    if (leftAssign.values[0].keys.length > 0) {
      const outerSlot = this.getVariableKey(leftAssign.values[0].token.value);
      functionBody.push({ opcode: "PUSH", value: this.to256BitWord(outerSlot) });
      for (let i = 0; i < leftAssign.values[0].keys.length; i++) {
        let key = leftAssign.values[0].keys[i];
        functionBody.push({
          opcode: "PUSH_PARAM",
          value: this.to256BitWord(key),
        });
        functionBody.push({ opcode: "ADD" });
        functionBody.push({ opcode: "HASH256" });
      }
    } else {
      const variableKey = this.getVariableKey(leftAssign.values[0].token.value);
      functionBody.push({ opcode: "PUSH", value: this.to256BitWord(variableKey) });
    }
    let postfixExpression = this.infixToPostfix(rightAssign.values, rightAssign.operators);
    this.generateExpression(postfixExpression, functionBody);
    functionBody.push({ opcode: "SSTORE" });
  }

  generateReturnStatement(statement, functionBody) {
    let values = statement.expression.values;
    let operators = statement.expression.operators;
    let postfixExpression = this.infixToPostfix(values, operators);
    this.generateExpression(postfixExpression, functionBody);
  }

  infixToPostfix(values, operators) {
    const precedence = {
      EQUAL: 1,
      NOT_EQUAL: 1,
      LESS_THAN: 1,
      GREATER_THAN: 1,
      LESS_THAN_EQUAL: 1,
      GREATER_THAN_EQUAL: 1,
      ADD: 2,
      SUBTRACT: 2,
      MULTIPLY: 3,
      DIVIDE: 3,
      MODULO: 3,
      AND: 4,
      OR: 4,
    };

    let output = [];
    let operatorStack = [];

    let valuesIndex = 0;
    let operatorsIndex = 0;

    while (valuesIndex < values.length || operatorsIndex < operators.length) {
      if (valuesIndex < values.length) {
        output.push(values[valuesIndex++]);
      }

      if (operatorsIndex < operators.length) {
        let currentOperator = operators[operatorsIndex].type;

        while (
          operatorStack.length &&
          precedence[currentOperator] <=
            precedence[operatorStack[operatorStack.length - 1].type]
        ) {
          output.push(operatorStack.pop().type);
        }

        operatorStack.push(operators[operatorsIndex]);
        operatorsIndex++;
      }
    }

    while (operatorStack.length) {
      output.push(operatorStack.pop().type);
    }

    return output;
  }

  generateExpression(postfixExpression, functionBody) {
    for (const token of postfixExpression) {
      if (this.isOperator(token)) {
        functionBody.push({ opcode: token.toUpperCase() });
      } else {
        if (token.keys.length > 0) {
          const outerSlot = this.getVariableKey(token.token.value);
          functionBody.push({ opcode: "PUSH", value: this.to256BitWord(outerSlot) });
          for (let i = 0; i < token.keys.length; i++) {
            let key = token.keys[i];
            functionBody.push({
              opcode: "PUSH_PARAM",
              value: this.to256BitWord(key),
            });
            functionBody.push({ opcode: "ADD" });
            functionBody.push({ opcode: "HASH256" });
          }
          functionBody.push({ opcode: "SLOAD" });
        } else {
          if (token.token.type === "IDENTIFIER") {
            if (token.token.value in this.variableMap) {
              const outerSlot = this.getVariableKey(token.token.value);
              functionBody.push({ opcode: "PUSH", value: this.to256BitWord(outerSlot) });
              functionBody.push({ opcode: "SLOAD" });
            } else {
              functionBody.push({
                opcode: "PUSH_PARAM",
                value: this.to256BitWord(token.token.value),
              });
            }
          } else {
            functionBody.push({
              opcode: "PUSH",
              value: this.to256BitWord(parseInt(token.token.value, 10)),
            });
          }
        }
      }
    }
  }

  generateIfStatement(statement, functionBody) {
    // Generate the condition expression
    const conditionValues = statement.condition.values;
    const conditionOperators = statement.condition.operators;
    const conditionPostfix = this.infixToPostfix(conditionValues, conditionOperators);
    this.generateExpression(conditionPostfix, functionBody);

    const jumpToElseIndex = functionBody.length;
    functionBody.push({ opcode: "PUSH", value: null });
    functionBody.push({ opcode: "JUMPI" });

    for (const bodyStatement of statement.ifBody) {
      if (bodyStatement.type === "ReturnStatement") {
        this.generateReturnStatement(bodyStatement, functionBody);
      }

      if (bodyStatement.type === "AssignmentExpression") {
        this.generateAssignmentExpression(bodyStatement, functionBody);
      }

      if (bodyStatement.type === "IfStatement") {
        this.generateIfStatement(bodyStatement, functionBody);
      }
    }

    const jumpToEndIfIndex = functionBody.length;
    functionBody.push({ opcode: "PUSH", value: null });
    functionBody.push({ opcode: "JUMP" });

    const elseJumpDestination = functionBody.length;
    functionBody[jumpToElseIndex].value = this.to256BitWord(elseJumpDestination);

    if (statement.elseBody) {
      for (const bodyStatement of statement.elseBody) {
        if (bodyStatement.type === "ReturnStatement") {
          this.generateReturnStatement(bodyStatement, functionBody);
        }

        if (bodyStatement.type === "AssignmentExpression") {
          this.generateAssignmentExpression(bodyStatement, functionBody);
        }

        if (bodyStatement.type === "IfStatement") {
          this.generateIfStatement(bodyStatement, functionBody);
        }
      }
    }

    const endIfJumpDestination = functionBody.length;
    functionBody[jumpToEndIfIndex].value = this.to256BitWord(endIfJumpDestination);
  }

  isOperator(token) {
    return [
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
    ].includes(token);
  }

  getVariableKey(variableName) {
    if (!(variableName in this.variableMap)) {
      this.variableMap[variableName] = this.variableIndex++;
    }
    return this.variableMap[variableName];
  }

  to256BitWord(value) {
    if (typeof value === "boolean") {
      return value ? "1".padStart(64, "0") : "0".padStart(64, "0");
    } else if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new Error("Number is not a safe integer.");
      }
      let hexValue;
      if (value < 0) {
        hexValue = (BigInt(value) + BigInt("0x10000000000000000000000000000000000000000000000000000000000000000")).toString(16);
      } else {
        hexValue = value.toString(16);
      }
      return hexValue.padStart(64, "0");
    } else if (typeof value === "string") {
      let hex = "";
      for (let i = 0; i < value.length; i++) {
        hex += value.charCodeAt(i).toString(16).padStart(2, "0");
      }
      return hex.padStart(64, "0");
    } else {
      throw new Error("Unsupported type for to256BitWord");
    }
  }
}

function replacer(key, value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value;
}

module.exports = Generator;
