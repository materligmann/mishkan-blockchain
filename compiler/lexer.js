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
        let num = "";
        while (this.isDigit(ch)) {
          num += ch;
          ch = this.input[++this.current];
        }
        this.tokens.push({ type: "NUMBER", value: num });
        continue;
      }

      if (this.isAlpha(ch)) {
        let ident = "";
        while (this.isAlpha(ch) || this.isDigit(ch)) {
          ident += ch;
          ch = this.input[++this.current];
        }
        this.tokens.push({ type: "IDENTIFIER", value: ident });
        continue;
      }

      switch (ch) {
        case "{":
          this.tokens.push({ type: "LBRACE" });
          break;
        case "}":
          this.tokens.push({ type: "RBRACE" });
          break;
        case "(":
          this.tokens.push({ type: "LPAREN" });
          break;
        case ")":
          this.tokens.push({ type: "RPAREN" });
          break;
        case "=":
          if (this.input[this.current + 1] === "=") {
            this.tokens.push({ type: "EQUAL" });
            this.current++;
          } else if (this.input[this.current + 1] === ">") {
            this.tokens.push({ type: "M_ARROW" });
            this.current++;
          } else {
            this.tokens.push({ type: "ASSIGN" });
          }
          break;
        case "!":
          if (this.input[this.current + 1] === "=") {
            this.tokens.push({ type: "NOT_EQUAL" });
            this.current++;
          } else {
            throw new Error(`Unknown character: ${ch}`);
          }
          break;
        case ":":
          this.tokens.push({ type: "COLON" });
          break;
        case ",":
          this.tokens.push({ type: "COMMA" });
          break;
        case "+":
          this.tokens.push({ type: "ADD" });
          break;
        case "-":
          if (this.input[this.current + 1] === ">") {
            this.tokens.push({ type: "F_ARROW" });
            this.current++;
          } else {
            this.tokens.push({ type: "SUBTRACT" });
          }
          break;
        case "*":
          this.tokens.push({ type: "MULTIPLY" });
          break;
        case "/":
          this.tokens.push({ type: "DIVIDE" });
          break;
        case "%":
          this.tokens.push({ type: "MODULO" });
          break;
        case "[":
          this.tokens.push({ type: "LBRACKET" });
          break;
        case "]":
          this.tokens.push({ type: "RBRACKET" });
          break;
        case ">":
          if (this.input[this.current + 1] === "=") {
            this.tokens.push({ type: "GREATER_THAN_EQUAL" });
            this.current++;
          } else {
            this.tokens.push({ type: "GREATER_THAN" });
          }
          break;
        case "<":
          if (this.input[this.current + 1] === "=") {
            this.tokens.push({ type: "LESS_THAN_EQUAL" });
            this.current++;
          } else {
            this.tokens.push({ type: "LESS_THAN" });
          }
          break;
        case "&":
          if (this.input[this.current + 1] === "&") {
            this.tokens.push({ type: "AND" });
            this.current++;
          } else {
            throw new Error(`Unknown character: ${ch}`);
          }
          break;
        case "|":
          if (this.input[this.current + 1] === "|") {
            this.tokens.push({ type: "OR" });
            this.current++;
          } else {
            throw new Error(`Unknown character: ${ch}`);
          }
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
