export default function ExposureBadge({ isInternal }) {
  if (isInternal === true) {
    return <span className="badge exposure-internal">INTERNO</span>;
  }
  if (isInternal === false) {
    return <span className="badge exposure-external">EXTERNO</span>;
  }
  return <span className="badge exposure-unknown">DESCONHECIDO</span>;
}
