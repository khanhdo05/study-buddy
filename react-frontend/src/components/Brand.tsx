export function Brand({ onClick }: { onClick?: () => void }) {
  return <a className="brand" href="/" onClick={onClick ? event => { event.preventDefault(); onClick() } : undefined}>
    <span className="brand-mark">sb<span>·</span></span>study buddy
  </a>
}
