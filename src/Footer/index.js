const GithubSvg = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>GitHub</title>
    <path d="M7.95 0C3.578 0 0 3.578 0 7.95c0 3.479 2.286 6.46 5.466 7.553.397.1.497-.199.497-.397v-1.392c-2.187.497-2.683-.994-2.683-.994-.398-.894-.895-1.192-.895-1.192-.696-.497.1-.497.1-.497.795.1 1.192.795 1.192.795.696 1.292 1.888.894 2.286.696.1-.497.298-.895.497-1.093-1.79-.2-3.578-.895-3.578-3.976 0-.894.298-1.59.795-2.087-.1-.198-.397-.993.1-2.086 0 0 .695-.2 2.186.795a6.408 6.408 0 0 1 1.987-.299c.696 0 1.392.1 1.988.299 1.49-.994 2.186-.795 2.186-.795.398 1.093.199 1.888.1 2.086.496.597.795 1.292.795 2.087 0 3.081-1.889 3.677-3.677 3.876.298.398.596.895.596 1.59v2.187c0 .198.1.496.596.397C13.714 14.41 16 11.43 16 7.95 15.9 3.578 12.323 0 7.95 0z" />
  </svg>
);

const Footer = () => {
  const renderBrand = () => (
    <div className="brand">
      <a href="/">
        <img src="images/logo.svg" alt="Neon" width="32" height="32" />
      </a>
    </div>
  );

  const renderCopyright = () => {
    const currentYear = new Date().getFullYear();
    return (
      <div className="footer-copyright">
        &copy; {currentYear} Zipcall, all rights reserved
      </div>
    );
  };

  const renderSocials = () => (
    <div className="footer-social">
      <div>
        <a
          target="_blank"
          href="https://github.com/ianramzy/decentralized-video-chat"
        >
          <GithubSvg />
        </a>
      </div>
    </div>
  );

  const renderNav = () => {
    const links = [
      {
        text: "Made with ❤️ by Ian Ramzy",
        href: "https://ianramzy.com",
      },
      //   {
      //     text: 'Contact',
      //     href: '#'
      //   },
      //   {
      //     text: 'About Us',
      //     href: '#'
      //   },
      //   {
      //     text: "FAQ's",
      //     href: '#'
      //   },
      //   {
      //     text: 'Support',
      //     href: '#'
      //   },
    ];

    return (
      <nav className="footer-nav">
        <ul className="list-reset">
          {links.map(({ href, text }) => (
            <li>
              <a target="_blank" href={href}>
                {text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  };

  return (
    <footer className="site-footer center-content-mobile">
      <div className="container">
        <div className="site-footer-inner">
          <div className="footer-top space-between text-xxs">
            {renderBrand()}
            {renderSocials()}
          </div>
          <div className="footer-bottom space-between text-xxs invert-order-desktop">
            {renderNav()}
            {renderCopyright()}
          </div>
        </div>
      </div>
    </footer>
  );
};

const domContainer = document.getElementById("react-footer-container");
ReactDOM.render(<Footer />, domContainer);
