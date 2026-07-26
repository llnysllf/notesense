import { Link } from "raviger";

type RouteNotFoundProps = {
  path: string;
};

/** A recoverable app-level 404 for a valid shell but unknown destination. */
export default function RouteNotFound({ path }: RouteNotFoundProps) {
  return (
    <section className="practice-panel route-not-found" aria-labelledby="route-not-found-title">
      <p className="eyebrow">Page not found</p>
      <h2 id="route-not-found-title">That destination does not exist</h2>
      <p>
        <code>{path}</code> is not a NoteSense page. Your practice data has not changed.
      </p>
      <Link className="primary-button" href="/practice/reading">
        Go to practice
      </Link>
    </section>
  );
}
