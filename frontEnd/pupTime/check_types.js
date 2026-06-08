const ts = require('typescript');
const fs = require('fs');

const fileName = 'src/components/AiBottom/AiButtom.tsx';
const sourceCode = fs.readFileSync(fileName, 'utf8');

const program = ts.createProgram([fileName], {
  noEmit: true,
  jsx: ts.JsxEmit.React,
  esModuleInterop: true,
  skipLibCheck: true
});

const emitResult = program.emit();
const allDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

allDiagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    const { line, character } = ts.getLineAndCharacterOfPosition(
      diagnostic.file,
      diagnostic.start
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n'
    );
    console.log(
      `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
    );
  } else {
    console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  }
});
console.log('Done checking type errors.');
