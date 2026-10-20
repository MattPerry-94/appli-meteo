/**
 * Contraste du texte (WCAG 1.4.3), calculé dans la page.
 *
 * axe-core abandonne sur les surfaces translucides (backdrop-filter, rgba) :
 * il les classe « à vérifier à la main ». Ici, le fond réel est reconstitué en
 * superposant les couleurs de fond des ancêtres (alpha compris) sur le fond
 * de la page. Les dégradés décoratifs et le flou sont ignorés : on prend la
 * couleur de base, ce qui reste une bonne approximation de surfaces unies.
 */
export type ContrastIssue = { text: string; ratio: number; required: number; color: string; background: string };

export function findLowContrastText(): ContrastIssue[] {
  type Rgba = [number, number, number, number];

  const canvas = document.createElement("canvas").getContext("2d")!;
  // Le navigateur convertit toute couleur CSS (oklch, color-mix…) en rgba via le canvas.
  const parse = (value: string): Rgba => {
    canvas.fillStyle = "#000";
    canvas.fillStyle = value;
    const normalized = canvas.fillStyle as string;
    if (normalized.startsWith("#")) {
      const hex = normalized.slice(1);
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 1];
    }
    const parts = normalized.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1];
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
  };
  const over = (top: Rgba, bottom: Rgba): Rgba => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    if (!alpha) return [0, 0, 0, 0];
    const mix = (i: number) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha;
    return [mix(0), mix(1), mix(2), alpha];
  };
  const luminance = ([r, g, b]: Rgba) => {
    const channel = (value: number) => {
      const c = value / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratioOf = (a: Rgba, b: Rgba) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  const pageBackground = over(parse(getComputedStyle(document.body).backgroundColor), [255, 255, 255, 1]);
  const backgroundBehind = (el: Element): Rgba => {
    const layers: Rgba[] = [];
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color[3] > 0) layers.push(color);
      if (color[3] >= 1) break;
    }
    return layers.reduceRight<Rgba>((below, layer) => over(layer, below), pageBackground);
  };

  const issues: ContrastIssue[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const checked = new Set<Element>();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || checked.has(el) || !node.textContent?.trim()) continue;
    checked.add(el);
    if (el.closest("svg, [aria-hidden='true'], .sr-only, option, select")) continue;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (style.visibility === "hidden" || Number(style.opacity) === 0 || !rect.width || !rect.height) continue;
    // Texte en dégradé (background-clip: text) : pas de couleur unique à mesurer.
    if (style.webkitTextFillColor && parse(style.webkitTextFillColor)[3] === 0) continue;

    // Opacité des ancêtres (texte estompé) appliquée à la couleur du texte.
    let opacity = 1;
    for (let node2: Element | null = el; node2; node2 = node2.parentElement) opacity *= Number(getComputedStyle(node2).opacity);
    const background = backgroundBehind(el);
    const raw = parse(style.color);
    const color = over([raw[0], raw[1], raw[2], raw[3] * opacity], background);

    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const required = large ? 3 : 4.5;
    const ratio = ratioOf(color, background);
    if (ratio < required - 0.01) {
      issues.push({
        text: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50),
        ratio: Math.round(ratio * 100) / 100,
        required,
        color: style.color,
        background: `rgb(${background.slice(0, 3).map(Math.round).join(" ")})`,
      });
    }
  }
  return issues;
}
