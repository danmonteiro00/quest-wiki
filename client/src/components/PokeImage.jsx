import { useState } from 'react';

// Recebe as URLs em ordem de preferencia e passa para a proxima quando uma falha.
export function PokeImage({ sources = [], alt, className, width, height, eager = false, onLoadSource }) {
  const [failed, setFailed] = useState({ key: null, count: 0 });
  const key = sources.join('|');
  const index = failed.key === key ? failed.count : 0;

  if (index >= sources.length) {
    return <span className={`image-missing ${className ?? ''}`} style={{ width, height }} role="img" aria-label={alt}>?</span>;
  }

  return (
    <img
      src={sources[index]}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => onLoadSource?.(sources[index])}
      onError={() => setFailed({ key, count: index + 1 })}
    />
  );
}
