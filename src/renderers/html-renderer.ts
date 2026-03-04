// Wraps SVG in a standalone HTML document

export function renderHTML(svgContent: string, width: number, height: number): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Dithered Gradient</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #111; }
  svg { max-width: 100vw; max-height: 100vh; width: auto; height: auto; }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;
}
