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
        bytecode.initialization.push({ opcode: 'PUSH', value: statement.value });
        bytecode.initialization.push({ opcode: 'STORE' });
      }

      if (statement.type === 'MappingDeclaration') {
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
            const variableKey = this.getVariableKey(bodyStatement.name);
            functionBody.push({ opcode: 'PUSH', value: variableKey });
            functionBody.push({ opcode: 'PUSH_PARAM', value: bodyStatement.value });
            functionBody.push({ opcode: 'STORE' });
          }

          if (bodyStatement.type === 'MappingAssignmentExpression') { 
            let keys = bodyStatement.keys; 
            let value = bodyStatement.value;
            const outerSlot = this.variableMap[bodyStatement.name];
            functionBody.push({ opcode: 'PUSH', value: outerSlot });
    
            console.log("Outer slot assign " + outerSlot)
            for (let i = 0; i < keys.length; i++) {
                let key = keys[i];
                functionBody.push({ opcode: 'PUSH_PARAM', value: key });
                functionBody.push({ opcode: 'ADD' });
                functionBody.push({ opcode: 'HASH256' });
            }
        
            functionBody.push({ opcode: 'PUSH_PARAM', value: value });
            functionBody.push({ opcode: 'STORE' });
        }
        
        

        if (bodyStatement.type === 'MappingLoadExpression') {
          let keys = bodyStatement.keys; 
          console.log("variable map " + this.variableMap)
          console.log("body statement name " + bodyStatement.name)
          const outerSlot = this.variableMap[bodyStatement.name];
      
          functionBody.push({ opcode: 'PUSH', value: outerSlot });

          console.log("Outer slot load " + outerSlot)
          for (let i = 0; i < keys.length; i++) {
              let key = keys[i];
              functionBody.push({ opcode: 'PUSH_PARAM', value: key });
              functionBody.push({ opcode: 'ADD' });
              functionBody.push({ opcode: 'HASH256' });
          }
      
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
    console.log("Variable name " + variableName)
    if (!(variableName in this.variableMap)) {
      this.variableMap[variableName] = this.variableIndex++;
    }
    return this.variableMap[variableName];
  }
}

module.exports = Generator;
