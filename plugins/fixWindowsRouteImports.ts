import type { Plugin } from 'vite';

export function fixWindowsRouteImports(): Plugin {
  return {
    name: 'fix-windows-route-imports',
    enforce: 'pre',
    resolveId(id) {
      // Defensive: strip ?update= if transform was skipped for some reason
      if (/^[A-Za-z]:\//.test(id) && id.includes('?update=')) {
        return id.split('?')[0];
      }
    },
    transform(code, id) {
      if (id.includes('__create') && id.includes('route-builder') && code.includes('?update=')) {
        // Inject eager glob so all route files are pre-loaded via Vite (no Windows paths)
        const injection = `const __allRoutes = import.meta.glob('/src/app/api/**/route.js', { eager: true });
const __getRouteKey = (p) => { const i = p.indexOf('/src/app/api/'); return i !== -1 ? p.slice(i) : null; };
`;
        // Replace: await import(/* @vite-ignore */ `${normalizedFile}?update=${Date.now()}`)
        // With:    (__allRoutes[__getRouteKey(normalizedFile)] ?? {})
        const newCode = code.replace(
          /await import\(\s*\/\* @vite-ignore \*\/\s*`\$\{normalizedFile\}\?update=\$\{Date\.now\(\)\}`\s*\)/g,
          '(__allRoutes[__getRouteKey(normalizedFile)] ?? {})'
        );
        return { code: injection + newCode, map: null };
      }
    },
  };
}
