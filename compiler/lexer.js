class Lexer {
    constructor(input) {
      this.input = input;
      this.tokens = [];
      this.current = 0;
    }
  
    isWhitespace(ch) {
      return /\s/.test(ch);
    }
  
    isDigit(ch) {
      return /\d/.test(ch);
    }
  
    isAlpha(ch) {
      return /[a-zA-Z]/.test(ch);
    }
  
    tokenize() {
      while (this.current < this.input.length) {
        let ch = this.input[this.current];
  
        if (this.isWhitespace(ch)) {
          this.current++;
          continue;
        }
  
        if (this.isDigit(ch)) {
          let num = '';
          while (this.isDigit(ch)) {
            num += ch;
            ch = this.input[++this.current];
          }
          this.tokens.push({ type: 'NUMBER', value: num });
          continue;
        }
  
        if (this.isAlpha(ch)) {
          let ident = '';
          while (this.isAlpha(ch)) {
            ident += ch;
            ch = this.input[++this.current];
          }
          this.tokens.push({ type: 'IDENTIFIER', value: ident });
          continue;
        }
  
        switch (ch) {
          case '{':
            this.tokens.push({ type: 'LBRACE' });
            break;
          case '}':
            this.tokens.push({ type: 'RBRACE' });
            break;
          case '(':
            this.tokens.push({ type: 'LPAREN' });
            break;
          case ')':
            this.tokens.push({ type: 'RPAREN' });
            break;
          case '=':
            this.tokens.push({ type: 'EQUAL' });
            break;
          case ':':
            this.tokens.push({ type: 'COLON' });
            break;
          case ',':
            this.tokens.push({ type: 'COMMA' });
            break;
          case '+':
            this.tokens.push({ type: 'PLUS' });
            break;
          case '-':
            if (this.input[this.current + 1] === '>') {
              this.tokens.push({ type: 'ARROW' });
              this.current++;
            } else {
              this.tokens.push({ type: 'MINUS' });
            }
            break;
          case '*':
            this.tokens.push({ type: 'MULTIPLY' });
            break;
          case '/':
            this.tokens.push({ type: 'DIVIDE' });
            break;
          case '%':
            this.tokens.push({ type: 'MODULO' });
            break;
          default:
            throw new Error(`Unknown character: ${ch}`);
        }
  
        this.current++;
      }
  
      return this.tokens;
    }
  }
  
  

module.exports = Lexer;
