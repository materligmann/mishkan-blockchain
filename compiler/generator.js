class Generator {
    constructor() {
      this.variableIndex = 0;
      this.variableMap = {};
    }
  
    generate(ast) {
      const bytecode = { initialization: [] };
      let functionIndex = 0;
  
      for (const statement of ast.body) {
        if (statement.type === 'VariableDeclaration') {
          const variableKey = this.getVariableKey(statement.name);
          bytecode.initialization.push({ opcode: 'PUSH', value: statement.value });
          bytecode.initialization.push({ opcode: 'STORE', value: variableKey });
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
                functionBody.push({ opcode: 'LOAD', value: variableKey });
              }
            }
  
            if (bodyStatement.type === 'AssignmentExpression') {
              functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value });
              const variableKey = this.getVariableKey(bodyStatement.name);
              functionBody.push({ opcode: 'STORE', value: variableKey });
            }
          }
  
          bytecode[functionIndex++] = {
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