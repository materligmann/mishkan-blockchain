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
        bytecode.initialization.push({ opcode: 'PUSH', value: statement.value });
        bytecode.initialization.push({ opcode: 'PUSH', value: variableKey });
        bytecode.initialization.push({ opcode: 'STORE' });
      }

      if (statement.type === 'MappingDeclaration') {
        // Mappings do not need initialization
      }

      if (statement.type === 'FunctionDeclaration') {
        const functionBody = [];

        for (const bodyStatement of statement.body) {
          if (bodyStatement.type === 'ReturnStatement') {
            if (bodyStatement.value.type === 'BinaryExpression') {
              functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value.left });
              functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value.right });
              functionBody.push({ opcode: bodyStatement.value.operator.toUpperCase() });
            } else {
              const variableKey = this.getVariableKey(bodyStatement.value);
              functionBody.push({ opcode: 'PUSH', value: variableKey });
              functionBody.push({ opcode: 'LOAD' });
            }
          }

          if (bodyStatement.type === 'AssignmentExpression') {
            functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value });
            const variableKey = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: 'PUSH', value: variableKey });
            functionBody.push({ opcode: 'STORE' });
          }

          if (bodyStatement.type === 'MappingAssignmentExpression') {
            functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value });
            functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.key });
            functionBody.push({ opcode: 'HASH256' });
            functionBody.push({ opcode: 'STORE' });
          }

          if (bodyStatement.type === 'MappingLoadExpression') {
            functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.key });
            functionBody.push({ opcode: 'HASH256' });
            functionBody.push({ opcode: 'LOAD' });
          }
        }

        bytecode.functions[functionIndex++] = {
          params: statement.params.map(param => param.name),
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
}

module.exports = Generator;
