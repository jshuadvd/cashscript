import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import * as util from 'util';
import { Ast } from './ast/AST';
import { CashScriptLexer } from './grammar/CashScriptLexer';
import { CashScriptParser } from './grammar/CashScriptParser';
import AstBuilder from './ast/AstBuilder';
import OutputSourceCodeTraversal from './print/OutputSourceCodeTraversal';
import SymbolTableTraversal from './semantic/SymbolTableTraversal';
import TypeCheckTraversal from './semantic/TypeCheckTraversal';
import GenerateIrTraversal from './generation/GenerateIrTraversal';
import GenerateTargetTraversal from './generation/GenerateTargetTraversal';
import { OpOrData, Script } from './generation/Script';

export function parseCode(code: string): Ast {
  const inputStream = new ANTLRInputStream(code);
  const lexer = new CashScriptLexer(inputStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new CashScriptParser(tokenStream);
  const ast = new AstBuilder(parser.sourceFile()).build() as Ast;
  return ast;
}

export function printAstAsCode(ast: Ast): void {
  const traversal = new OutputSourceCodeTraversal();
  ast.accept(traversal);
  console.log(traversal.output);
}

export function printAst(ast: Ast): void {
  console.log(util.inspect(ast, false, null, true));
}

export function encodeBool(b: boolean): Buffer {
  return b ? encodeInt(1) : encodeInt(0);
}

export function encodeInt(i: number): Buffer {
  return Script.encodeNumber(i);
}

export function encodeString(s: string): Buffer {
  return Buffer.from(s, 'utf8');
}

export function compileToTargetCode(code: string): OpOrData[] {
  const ast = parseCode(code);
  ast.accept(new SymbolTableTraversal());
  ast.accept(new TypeCheckTraversal());
  const irTraversal = new GenerateIrTraversal();
  ast.accept(irTraversal);
  const ir = irTraversal.output;
  const target = new GenerateTargetTraversal(ir).traverse();
  return target;
}

export function printTargetCode(target: OpOrData[]) {
  console.log(Script.toASM(Script.encode(target)));
}
