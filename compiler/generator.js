const crypto = require("crypto");
class Generator {
  constructor() {
    this.variableIndexStorage = 0;
    this.variableIndexMemory = 0;
    this.variableMapStorage = {};
    this.variableMapMemory = {};
    this.variableMapStorageType = {};
  }

  generate(ast) {
    const bytecode = { initialization: [], functions: {} };
    let functionIndex = 0;

    for (const statement of ast.body) {
      if (statement.type === "VariableDeclaration") {
        const variableKey = this.getVariableKeyStorage(statement.name);
        this.setVariableTypeStorage(statement.name, statement.valueType);
        console.log("VariableDeclaration");
        if (statement.valueType == "Int") {
          console.log("Int");
          bytecode.initialization.push({
            opcode: "PUSH",
            value: this.to256BitWord(variableKey),
          });
          bytecode.initialization.push({
            opcode: "PUSH",
            value: this.to256BitWord(parseInt(statement.value.value, 10)),
          });
          bytecode.initialization.push({ opcode: "SSTORE" });
        } else if (statement.valueType == "String") {
          const stringArray = this.encodeString(statement.value.value);
          const hash = this.hash(this.to256BitWord(variableKey));
          for (let i = 0; i < stringArray.length; i++) {
            if (i === 0) {
              bytecode.initialization.push({
                opcode: "PUSH",
                value: this.to256BitWord(variableKey),
              });
              bytecode.initialization.push({
                opcode: "PUSH",
                value: this.to256BitWord(stringArray[i]),
              });
              bytecode.initialization.push({ opcode: "SSTORE" });
            } else {
              const increment =
                this.from256BitWord(this.to256BitWord(i, "bigint"), "bigint") -
                this.from256BitWord(this.to256BitWord(1, "bigint"), "bigint");
              let location;
              if (
                increment ===
                this.from256BitWord(this.to256BitWord(0), "bigint")
              ) {
                location = hash;
              } else {
                location = this.to256BitWord(
                  this.from256BitWord(hash, "bigint") +
                    this.from256BitWord(this.to256BitWord(increment), "bigint"),
                  "bigint"
                );
              }
              bytecode.initialization.push({
                opcode: "PUSH",
                value: location,
              });
              bytecode.initialization.push({
                opcode: "PUSH",
                value: stringArray[i],
              });
              bytecode.initialization.push({ opcode: "SSTORE" });
            }
          }
        }
      }

      if (statement.type === "MappingDeclaration") {
        const variableKey = this.getVariableKeyStorage(statement.name);
      }

      if (statement.type === "FunctionDeclaration") {
        this.variableIndexMemory = 0;
        this.variableMapMemory = {};
        const functionBody = [];
        this.generateStatement(statement.body, functionBody);
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

  generateStatement(body, functionBody) {
    for (const bodyStatement of body) {
      if (bodyStatement.type === "ReturnStatement") {
        this.generateReturnStatement(bodyStatement, functionBody);
      }

      if (bodyStatement.type === "AssignmentExpression") {
        this.generateAssignmentExpression(bodyStatement, functionBody);
      }

      if (bodyStatement.type === "IfStatement") {
        this.generateIfStatement(bodyStatement, functionBody);
      }

      if (bodyStatement.type === "VariableExpression") {
        this.generateVariableExpression(bodyStatement, functionBody);
      }

      if (bodyStatement.type === "ForLoop") {
        this.generateForLoopStatement(bodyStatement, functionBody);
      }
    }
  }

  generateForLoopStatement(statement, functionBody) {
    const variableExpressionStatement = statement.variableExpression;
    const conditionExpression = statement.condition;
    const assignmentExpressionStatement = statement.assignmentExpression;
    const forLoopBody = statement.body;

    this.generateVariableExpression(variableExpressionStatement, functionBody);

    const jumpToConditionIndex = functionBody.length;
    functionBody.push({ opcode: "PUSH", value: null });

    const postfixConditionExpression = this.infixToPostfix(
      conditionExpression.values,
      conditionExpression.operators
    );
    this.generateExpression(postfixConditionExpression, functionBody);

    functionBody.push({ opcode: "JUMPI" });

    this.generateStatement(forLoopBody, functionBody);

    this.generateAssignmentExpression(
      assignmentExpressionStatement,
      functionBody
    );

    functionBody.push({
      opcode: "PUSH",
      value: this.to256BitWord(jumpToConditionIndex),
    });
    functionBody.push({ opcode: "JUMP" });
    const jumpToEndLoopIndex = functionBody.length;
    functionBody[jumpToConditionIndex].value =
      this.to256BitWord(jumpToEndLoopIndex);
  }

  generateVariableExpression(statement, functionBody) {
    const name = statement.name;
    const expression = statement.expression;
    const variableKey = this.getVariableKeyMemory(name);
    functionBody.push({
      opcode: "PUSH",
      value: this.to256BitWord(variableKey),
    });
    let postfixExpression = this.infixToPostfix(
      expression.values,
      expression.operators
    );
    this.generateExpression(postfixExpression, functionBody);
    functionBody.push({ opcode: "MSTORE" });
  }

  generateAssignmentExpression(statement, functionBody) {
    const leftAssign = statement.assignLeft;
    const rightAssign = statement.assignRight;
    if (leftAssign.values[0].keys.length > 0) {
      const outerSlot = this.getVariableKeyStorage(
        leftAssign.values[0].token.value
      );
      functionBody.push({
        opcode: "PUSH",
        value: this.to256BitWord(outerSlot),
      });
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
      if (leftAssign.values[0].token.value in this.variableMapStorage) {
        const variableKey = this.getVariableKeyStorage(
          leftAssign.values[0].token.value
        );
        functionBody.push({
          opcode: "PUSH",
          value: this.to256BitWord(variableKey),
        });
      } else if (leftAssign.values[0].token.value in this.variableMapMemory) {
        const variableKey = this.getVariableKeyMemory(
          leftAssign.values[0].token.value
        );
        functionBody.push({
          opcode: "PUSH",
          value: this.to256BitWord(variableKey),
        });
      }
    }
    let postfixExpression = this.infixToPostfix(
      rightAssign.values,
      rightAssign.operators
    );
    this.generateExpression(postfixExpression, functionBody);

    if (leftAssign.values[0].token.value in this.variableMapStorage) {
      functionBody.push({ opcode: "SSTORE" });
    } else if (leftAssign.values[0].token.value in this.variableMapMemory) {
      functionBody.push({ opcode: "MSTORE" });
    }
  }

  generateReturnStatement(statement, functionBody) {
    let values = statement.expression.values;
    let operators = statement.expression.operators;
    let postfixExpression = this.infixToPostfix(values, operators);
    this.generateExpression(postfixExpression, functionBody);
    const lVariableKey = this.getVariableKeyMemory("l");
    functionBody.push({
      opcode: "PUSH",
      value: this.to256BitWord(lVariableKey),
    });
    functionBody.push({ opcode: "MLOAD" });
    functionBody.push({ opcode: "RETURN" });
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
    let isString = false;
    for (const token of postfixExpression) {
      if (this.isOperator(token)) {
        functionBody.push({ opcode: token.toUpperCase() });
      } else {
        if (token.keys.length > 0) {
          const outerSlot = this.getVariableKeyStorage(token.token.value);
          functionBody.push({
            opcode: "PUSH",
            value: this.to256BitWord(outerSlot),
          });
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
            if (token.token.value in this.variableMapStorage) {
              if (this.variableMapStorageType[token.token.value] === "String") {
                // INITIALIAZING LOOP
                isString = true;
                const iVariableKey = this.getVariableKeyMemory("i");
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(iVariableKey),
                });
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(0),
                });
                functionBody.push({ opcode: "MSTORE" });

                const variableKey = this.getVariableKeyStorage(
                  token.token.value
                );
                const lVariableKey = this.getVariableKeyMemory("l");
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(lVariableKey),
                });

                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(variableKey),
                });
                functionBody.push({ opcode: "SLOAD" });

                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(32),
                });
                functionBody.push({ opcode: "DIVIDE" });
                functionBody.push({ opcode: "MSTORE" });

                // PUSHING TARGET
                const conditionJumpIndex = functionBody.length;
                functionBody.push({ opcode: "PUSH", value: null });

                // GETTING SIZE OF STRING

                
                functionBody.push({ opcode: "PUSH", value: this.to256BitWord(lVariableKey) });

                functionBody.push({ opcode: "MLOAD" });

                // LOOP CONDITION;
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(iVariableKey),
                });
                functionBody.push({ opcode: "MLOAD" });
                functionBody.push({ opcode: "GREATER_THAN" });
                functionBody.push({ opcode: "JUMPI" });

                // BODY

                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(iVariableKey),
                });
                functionBody.push({ opcode: "MLOAD" });

                functionBody.push({
                  opcode: "PUSH",
                  value: variableKey,
                });
                functionBody.push({ opcode: "HASH256" });

                const secondConditionJumpIndex = functionBody.length;
                functionBody.push({ opcode: "PUSH", value: null });

                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(0),
                });
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(iVariableKey),
                });
                functionBody.push({ opcode: "MLOAD" });
                functionBody.push({ opcode: "NOT_EQUAL" });
                functionBody.push({ opcode: "JUMPI" });

                functionBody.push({ opcode: "ADD" });

                const increment = functionBody.length;
                functionBody[secondConditionJumpIndex].value =
                  this.to256BitWord(increment);

                functionBody.push({ opcode: "SLOAD" });

                // END BODY
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(iVariableKey),
                });
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(iVariableKey),
                });
                functionBody.push({ opcode: "MLOAD" });
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(1),
                });
                functionBody.push({ opcode: "ADD" });
                functionBody.push({ opcode: "MSTORE" });
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(conditionJumpIndex),
                });
                functionBody.push({ opcode: "JUMP" });
                functionBody[conditionJumpIndex].value = this.to256BitWord(
                  functionBody.length
                );
              } else if (
                this.variableMapStorageType[token.token.value] === "Int"
              ) {
                const outerSlot = this.getVariableKeyStorage(token.token.value);
                functionBody.push({
                  opcode: "PUSH",
                  value: this.to256BitWord(outerSlot),
                });
                functionBody.push({ opcode: "SLOAD" });
              }
            } else if (token.token.value in this.variableMapMemory) {
              const outerSlot = this.getVariableKeyMemory(token.token.value);
              functionBody.push({
                opcode: "PUSH",
                value: this.to256BitWord(outerSlot),
              });
              functionBody.push({ opcode: "MLOAD" });
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
    if (isString === false) {
      const lVariableKey = this.getVariableKeyMemory("l");
      functionBody.push({
        opcode: "PUSH",
        value: this.to256BitWord(lVariableKey),
      });
      functionBody.push({
        opcode: "PUSH",
        value: this.to256BitWord(1),
      });
      functionBody.push({ opcode: "MSTORE" });
    }
  }

  generateIfStatement(statement, functionBody) {
    // Generate the condition expression
    const conditionValues = statement.condition.values;
    const conditionOperators = statement.condition.operators;

    const jumpToElseIndex = functionBody.length;
    functionBody.push({ opcode: "PUSH", value: null });

    const conditionPostfix = this.infixToPostfix(
      conditionValues,
      conditionOperators
    );
    this.generateExpression(conditionPostfix, functionBody);

    functionBody.push({ opcode: "JUMPI" });

    this.generateStatement(statement.ifBody, functionBody);

    const jumpToEndIfIndex = functionBody.length;
    functionBody.push({ opcode: "PUSH", value: null });
    functionBody.push({ opcode: "JUMP" });

    const elseJumpDestination = functionBody.length;
    functionBody[jumpToElseIndex].value =
      this.to256BitWord(elseJumpDestination);

    if (statement.elseBody) {
      this.generateStatement(statement.elseBody, functionBody);
    }

    const endIfJumpDestination = functionBody.length;
    functionBody[jumpToEndIfIndex].value =
      this.to256BitWord(endIfJumpDestination);
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
  hash(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  getVariableKeyStorage(variableName) {
    if (!(variableName in this.variableMapStorage)) {
      this.variableMapStorage[variableName] = this.variableIndexStorage++;
    }
    return this.variableMapStorage[variableName];
  }

  getVariableKeyMemory(variableName) {
    if (!(variableName in this.variableMapMemory)) {
      this.variableMapMemory[variableName] = this.variableIndexMemory++;
    }
    return this.variableMapMemory[variableName];
  }

  setVariableTypeStorage(variableName, type) {
    this.variableMapStorageType[variableName] = type;
  }

  padTo32Bytes(hexString) {
    // Remove '0x' prefix if present
    if (hexString.startsWith("0x")) {
      hexString = hexString.slice(2);
    }
    // Pad with trailing zeros to make it a multiple of 32 bytes (64 hex characters)
    const paddingLength = Math.ceil(hexString.length / 64) * 64;
    return hexString.padEnd(paddingLength, "0");
  }

  toHexString(input) {
    // Convert string to hex
    return Buffer.from(input, "utf8").toString("hex");
  }

  fromHexString(hexString) {
    // Convert hex to string
    return Buffer.from(hexString, "hex").toString("utf8");
  }

  encodeString(inputString) {
    const stringHex = this.toHexString(inputString);
    const stringLength = stringHex.length / 2; // Length in bytes

    // Pad the string so that it can be properly segmented into 32-byte chunks
    const paddedStringHex = this.padTo32Bytes(stringHex);

    // Split the padded string into 32-byte chunks
    const chunks = [];
    for (let i = 0; i < paddedStringHex.length; i += 64) {
      // 64 hex characters = 32 bytes
      chunks.push("0x" + paddedStringHex.slice(i, i + 64));
    }

    // Prepend the length of the string (in bytes) to the chunks array
    return [stringLength, ...chunks];
  }

  decodeString(chunks) {
    // Remove the length of the string from the chunks array
    const stringLength = chunks.shift();

    // Concatenate the chunks into a single string
    const paddedStringHex = chunks.join("").slice(2); // Remove '0x' prefix
    const stringHex = paddedStringHex.slice(0, stringLength * 2); // Length in bytes

    // Convert the hex string to a regular string
    return this.fromHexString(stringHex);
  }

  from256BitWord(value, type) {
    if (typeof value !== "string" || value.length !== 64) {
      throw new Error("Invalid 256-bit word");
    }

    let trimmedValue = value.replace(/^0+/, "") || "0";

    if (type === "boolean") {
      return trimmedValue === "1";
    }

    if (type === "number" || type === "bigint") {
      let numValue = BigInt("0x" + trimmedValue);
      if (
        numValue >=
        BigInt(
          "0x8000000000000000000000000000000000000000000000000000000000000000"
        )
      ) {
        numValue -= BigInt(
          "0x10000000000000000000000000000000000000000000000000000000000000000"
        );
      }
      return type === "number" ? Number(numValue) : numValue;
    }

    // Handle string case
    let str = "";
    for (let i = 0; i < trimmedValue.length; i += 2) {
      str += String.fromCharCode(
        parseInt(trimmedValue.substring(i, i + 2), 16)
      );
    }
    return str;
  }

  to256BitWord(value) {
    if (typeof value === "boolean") {
      return value ? "1".padStart(64, "0") : "0".padStart(64, "0");
    } else if (typeof value === "number" || typeof value === "bigint") {
      const bigIntValue = BigInt(value);
      let hexValue;
      if (bigIntValue < 0) {
        hexValue = (
          bigIntValue +
          BigInt(
            "0x10000000000000000000000000000000000000000000000000000000000000000"
          )
        ).toString(16);
      } else {
        hexValue = bigIntValue.toString(16);
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
