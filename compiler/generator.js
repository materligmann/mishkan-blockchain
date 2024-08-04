class Generator {
  constructor() {
    this.variableIndex = 0;
    this.variableMap = {};
  }

  generate2(ast) {
    const bytecode = { initialization: [], functions: {} };
    let functionIndex = 0;

    for (const statement of ast.body) {
      if (statement.type === "VariableDeclaration") {
        const variableKey = this.getVariableKey(statement.name);
        bytecode.initialization.push({ opcode: "PUSH", value: variableKey });
        bytecode.initialization.push({
          opcode: "PUSH",
          value: this.to256BitWord(statement.value),
        });
        bytecode.initialization.push({ opcode: "STORE" });
      }

      if (statement.type === "MappingDeclaration") {
        const variableKey = this.getVariableKey(statement.name);
      }

      if (statement.type === "FunctionDeclaration") {
        const functionBody = [];

        for (const bodyStatement of statement.body) {
          if (bodyStatement.type === "ReturnStatement") {
            let values = bodyStatement.expression.values;
            let operators = bodyStatement.expression.operators;
            let postfixExpression = this.infixToPostfix(values, operators);
            this.generateReturnOpCodes(postfixExpression, functionBody);
          }

          if (bodyStatement.type === "AssignmentExpression") {
            const leftAssign = bodyStatement.assignLeft;
            const rightAssign = bodyStatement.assignRight;
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
              const variableKey = this.getVariableKey(
                leftAssign.values[0].token.value
              );
              functionBody.push({ opcode: "PUSH", value: variableKey });
            }
            let postfixExpression = this.infixToPostfix(
              rightAssign.values,
              rightAssign.operators
            );
            this.generateReturnOpCodes(postfixExpression, functionBody);
            functionBody.push({ opcode: "STORE" });
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

  infixToPostfix(values, operators) {
    // Precedence table for operators
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

    // Loop through values and operators to convert infix to postfix
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

  generateReturnOpCodes(postfixExpression, functionBody) {
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
          functionBody.push({ opcode: "LOAD" });
        } else {
          if (token.token.type === "IDENTIFIER") {
            console.log('Token Value' + token.token.value);
            if (token.token.value in this.variableMap) {
              const outerSlot = this.getVariableKey(token.token.value);
              functionBody.push({ opcode: "PUSH", value: outerSlot });
              functionBody.push({ opcode: "LOAD" });
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

  generate(ast) {
    const bytecode = { initialization: [], functions: {} };
    let functionIndex = 0;

    for (const statement of ast.body) {
      if (statement.type === "VariableDeclaration") {
        const variableKey = this.getVariableKey(statement.name);
        bytecode.initialization.push({ opcode: "PUSH", value: variableKey });
        bytecode.initialization.push({
          opcode: "PUSH",
          value: this.to256BitWord(statement.value),
        });
        bytecode.initialization.push({ opcode: "STORE" });
      }

      if (statement.type === "MappingDeclaration") {
        const variableKey = this.getVariableKey(statement.name);
      }

      if (statement.type === "FunctionDeclaration") {
        const functionBody = [];

        for (const bodyStatement of statement.body) {
          if (bodyStatement.type === "ReturnStatement") {
            if (bodyStatement.value.type === "BinaryExpression") {
              functionBody.push({
                opcode: "PUSH_PARAM",
                value: this.to256BitWord(bodyStatement.value.left),
              });
              functionBody.push({
                opcode: "PUSH_PARAM",
                value: this.to256BitWord(bodyStatement.value.right),
              });
              functionBody.push({
                opcode: bodyStatement.value.operator.toUpperCase(),
              });
            } else {
              const variableKey = this.getVariableKey(bodyStatement.value);
              functionBody.push({ opcode: "PUSH", value: variableKey });
              functionBody.push({ opcode: "LOAD" });
            }
          }

          if (bodyStatement.type === "AssignmentExpression") {
            const variableKey = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: "PUSH", value: variableKey });
            console.log(bodyStatement.valueToken);
            if (bodyStatement.valueToken.type === "IDENTIFIER") {
              console.log("PUSHING IDENTIFIER");
              functionBody.push({
                opcode: "PUSH_PARAM",
                value: this.to256BitWord(bodyStatement.valueToken.value),
              });
            } else {
              console.log("PUSHING VALUE");
              functionBody.push({
                opcode: "PUSH",
                value: this.to256BitWord(
                  parseInt(bodyStatement.valueToken.value, 10)
                ),
              });
            }
            functionBody.push({ opcode: "STORE" });
          }

          if (bodyStatement.type === "BinaryAssignmentExpression") {
            const variableKey = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: "PUSH", value: variableKey });
            if (bodyStatement.leftToken.type === "IDENTIFIER") {
              if (bodyStatement.leftToken.value in this.variableMap) {
                const outerSlot = this.getVariableKey(
                  bodyStatement.leftToken.value
                );
                functionBody.push({ opcode: "PUSH", value: outerSlot });
                functionBody.push({ opcode: "LOAD" });
              } else {
                functionBody.push({
                  opcode: "PUSH_PARAM",
                  value: this.to256BitWord(bodyStatement.leftToken.value),
                });
              }
            } else {
              functionBody.push({
                opcode: "PUSH",
                value: this.to256BitWord(
                  parseInt(bodyStatement.leftToken.value, 10)
                ),
              });
            }
            if (bodyStatement.rightToken.type === "IDENTIFIER") {
              if (bodyStatement.rightToken.value in this.variableMap) {
                const outerSlot = this.getVariableKey(
                  bodyStatement.leftToken.value
                );
                functionBody.push({ opcode: "PUSH", value: outerSlot });
                functionBody.push({ opcode: "LOAD" });
              } else {
                functionBody.push({
                  opcode: "PUSH_PARAM",
                  value: this.to256BitWord(bodyStatement.rightToken.value),
                });
              }
            } else {
              functionBody.push({
                opcode: "PUSH",
                value: this.to256BitWord(
                  parseInt(bodyStatement.rightToken.value, 10)
                ),
              });
            }
            functionBody.push({ opcode: bodyStatement.operator.toUpperCase() }); // Perform the binary operation
            functionBody.push({ opcode: "STORE" }); // Store the result back into the variable
          }

          if (bodyStatement.type === "MappingAssignmentExpression") {
            let keys = bodyStatement.keys;
            let value = bodyStatement.value;
            const outerSlot = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: "PUSH", value: outerSlot });
            for (let i = 0; i < keys.length; i++) {
              let key = keys[i];
              functionBody.push({
                opcode: "PUSH_PARAM",
                value: this.to256BitWord(key),
              });
              functionBody.push({ opcode: "ADD" });
              functionBody.push({ opcode: "HASH256" });
            }

            functionBody.push({
              opcode: "PUSH_PARAM",
              value: this.to256BitWord(value),
            });
            functionBody.push({ opcode: "STORE" });
          }

          if (bodyStatement.type === "MappingLoadExpression") {
            let keys = bodyStatement.keys;
            const outerSlot = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: "PUSH", value: outerSlot });
            for (let i = 0; i < keys.length; i++) {
              let key = keys[i];
              functionBody.push({
                opcode: "PUSH_PARAM",
                value: this.to256BitWord(key),
              });
              functionBody.push({ opcode: "ADD" });
              functionBody.push({ opcode: "HASH256" });
            }

            functionBody.push({ opcode: "LOAD" });
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
