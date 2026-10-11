import './new-site-banner.css';

export default function NewSiteBanner() {
  const hostname = window.location.hostname.toLowerCase();
  if (!['abovealphasolutions.com', 'www.abovealphasolutions.com'].includes(hostname)) return null;

  return (
    <aside className="new-site-banner" aria-label="New site announcement">
      <span>Our new site is ready.</span>
      <a href="https://alphanova48.in/">Visit alphanova48.in <span aria-hidden="true">↗</span></a>
    </aside>
  );
}
