export function Webring() {
  return (
    <nav className="webring" aria-label="UWaterloo CS webring">
      <a
        href="https://cs.uwatering.com/#https://dundeezhang.com?nav=prev"
        aria-label="Previous site in UWaterloo CS webring"
        title="Previous site"
      >
        previous
      </a>
      <a
        className="webring-home"
        href="https://cs.uwatering.com/#https://dundeezhang.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="UWaterloo CS webring home"
        title="UWaterloo CS webring"
      >
        webring
      </a>
      <a
        href="https://cs.uwatering.com/#https://dundeezhang.com?nav=next"
        aria-label="Next site in UWaterloo CS webring"
        title="Next site"
      >
        next
      </a>
    </nav>
  );
}
