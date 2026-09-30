export interface AssetSource {
  src: string;
  srcSet: string;
}

export function pngAsset(path: string): AssetSource {
  const src = `/assets/png/default/${path}`;
  return { src, srcSet: `${src} 1x, /assets/png/retina/${path} 2x` };
}
