class Generator {
  constructor() {
    this.variableIndex = 0;
    this.variableMap = {};
  }

  generate(ast) {
    const bytecode = { initialization: [], functions: {} };
    let functionIndex = 0;

    for (const statement of ast.body) {
      if (statement.type === 'VariableDeclaration') {
        const variableKey = this.getVariableKey(statement.name);
        bytecode.initialization.push({ opcode: 'PUSH', value: variableKey });
        bytecode.initialization.push({ opcode: 'PUSH', value: this.to256BitWord(statement.value) });
        bytecode.initialization.push({ opcode: 'STORE' });
      }

      if (statement.type === 'MappingDeclaration') {
        const variableKey = this.getVariableKey(statement.name);
      }

      if (statement.type === 'FunctionDeclaration') {
        const functionBody = [];

        for (const bodyStatement of statement.body) {
          if (bodyStatement.type === 'ReturnStatement') {
            if (bodyStatement.value.type === 'BinaryExpression') {
              functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(bodyStatement.value.left) });
              functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(bodyStatement.value.right) });
              functionBody.push({ opcode: bodyStatement.value.operator.toUpperCase() });
            } else {
              const variableKey = this.getVariableKey(bodyStatement.value);
              functionBody.push({ opcode: 'PUSH', value: variableKey });
              functionBody.push({ opcode: 'LOAD' });
            }
          }

          if (bodyStatement.type === 'AssignmentExpression') {
            const variableKey = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: 'PUSH', value: variableKey });
            console.log(bodyStatement.valueToken);
            if (bodyStatement.valueToken.type === "IDENTIFIER") {
              console.log("PUSHING IDENTIFIER");
              functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(bodyStatement.valueToken.value) });
            } else {
              console.log("PUSHING VALUE");
              functionBody.push({ opcode: 'PUSH', value: this.to256BitWord(parseInt(bodyStatement.valueToken.value, 10)) });
            }
            functionBody.push({ opcode: 'STORE' });
          }

          if (bodyStatement.type === 'BinaryAssignmentExpression') {
            const variableKey = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: 'PUSH', value: variableKey });
            if (bodyStatement.leftToken.type === "IDENTIFIER") {
              functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(bodyStatement.leftToken.value) });
            } else {
              functionBody.push({ opcode: 'PUSH', value: this.to256BitWord(parseInt(bodyStatement.leftToken.value, 10)) });
            }
            if (bodyStatement.rightToken.type === "IDENTIFIER") {
              functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(bodyStatement.rightToken.value) });
            } else {
              functionBody.push({ opcode: 'PUSH', value: this.to256BitWord(parseInt(bodyStatement.rightToken.value, 10)) });
            }
            functionBody.push({ opcode: bodyStatement.operator.toUpperCase() }); // Perform the binary operation
            functionBody.push({ opcode: 'STORE' }); // Store the result back into the variable
          }

          if (bodyStatement.type === 'MappingAssignmentExpression') { 
            let keys = bodyStatement.keys; 
            let value = bodyStatement.value;
            const outerSlot = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: 'PUSH', value: outerSlot });
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(key) });
                functionBody.push({ opcode: 'ADD' });
                functionBody.push({ opcode: 'HASH256' });
            }
        
            functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(value) });
            functionBody.push({ opcode: 'STORE' });
        }
        
        

        if (bodyStatement.type === 'MappingLoadExpression') {
          let keys = bodyStatement.keys;
          const outerSlot = this.getVariableKey(bodyStatement.name);
          functionBody.push({ opcode: 'PUSH', value: outerSlot });
          for (let i = 0; i < keys.length; i++) {
              let key = keys[i];
              functionBody.push({ opcode: 'PUSH_PARAM', value: this.to256BitWord(key) });
              functionBody.push({ opcode: 'ADD' });
              functionBody.push({ opcode: 'HASH256' });
          }
      
          functionBody.push({ opcode: 'LOAD' });
      }
        }

        bytecode.functions[functionIndex++] = {
          params: statement.params.map(param => {
            return this.to256BitWord(param.name)
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
    console.log("to256BitWord", value);
    if (typeof value === 'boolean') {
      return value ? '1'.padStart(64, '0') : '0'.padStart(64, '0');
    } else if (typeof value === 'number') {
      return value.toString().padStart(64, '0');
    } else if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        return value.slice(2).padStart(64, '0');
      } else {
        let hex = '';
        for (let i = 0; i < value.length; i++) {
          hex += value.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return hex.padStart(64, '0');
      }
    } else {
      throw new Error(`Unsupported type for to256BitWord: ${typeof value}`);
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
