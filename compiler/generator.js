class Generator {
    generate(ast) {
      const bytecode = { initialization: [] };
      let functionIndex = 0;
  
      for (const statement of ast.body) {
        if (statement.type === 'VariableDeclaration') {
          bytecode.initialization.push({ opcode: 'PUSH', value: statement.value });
          bytecode.initialization.push({ opcode: 'STORE', value: statement.name });
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
                functionBody.push({ opcode: 'LOAD', value: bodyStatement.value });
              }
            }
  
            if (bodyStatement.type === 'AssignmentExpression') {
              functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value });
              functionBody.push({ opcode: 'STORE', value: bodyStatement.name });
            }
          }
  
          bytecode[functionIndex++] = {
            params: statement.params.map(param => param.name),
            body: functionBody
          };
        }
      }
  
      return bytecode;
    }
  }
  
  
  
module.exports = Generator;
  