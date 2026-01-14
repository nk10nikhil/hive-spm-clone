import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container">
      <main className="main centered">
        <h1>404</h1>
        <p>Page not found</p>
        <Link to="/" className="link">
          Go back home
        </Link>
      </main>
    </div>
  );
}
