var GithubSvg = function GithubSvg() {
  return React.createElement(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      xmlns: "http://www.w3.org/2000/svg",
    },
    React.createElement("title", null, "GitHub"),
    React.createElement("path", {
      d:
        "M7.95 0C3.578 0 0 3.578 0 7.95c0 3.479 2.286 6.46 5.466 7.553.397.1.497-.199.497-.397v-1.392c-2.187.497-2.683-.994-2.683-.994-.398-.894-.895-1.192-.895-1.192-.696-.497.1-.497.1-.497.795.1 1.192.795 1.192.795.696 1.292 1.888.894 2.286.696.1-.497.298-.895.497-1.093-1.79-.2-3.578-.895-3.578-3.976 0-.894.298-1.59.795-2.087-.1-.198-.397-.993.1-2.086 0 0 .695-.2 2.186.795a6.408 6.408 0 0 1 1.987-.299c.696 0 1.392.1 1.988.299 1.49-.994 2.186-.795 2.186-.795.398 1.093.199 1.888.1 2.086.496.597.795 1.292.795 2.087 0 3.081-1.889 3.677-3.677 3.876.298.398.596.895.596 1.59v2.187c0 .198.1.496.596.397C13.714 14.41 16 11.43 16 7.95 15.9 3.578 12.323 0 7.95 0z",
    })
  );
};

var Footer = function Footer() {
  var renderBrand = function renderBrand() {
    return React.createElement(
      "div",
      { className: "brand" },
      React.createElement(
        "a",
        { href: "/" },
        React.createElement("img", {
          src: "images/logo.svg",
          alt: "Neon",
          width: "32",
          height: "32",
        })
      )
    );
  };

  var renderCopyright = function renderCopyright() {
    var currentYear = new Date().getFullYear();
    return React.createElement(
      "div",
      { className: "footer-copyright" },
      "\xA9 ",
      currentYear,
      " Zipcall, all rights reserved"
    );
  };

  var renderSocials = function renderSocials() {
    return React.createElement(
      "div",
      { className: "footer-social" },
      React.createElement(
        "div",
        null,
        React.createElement(
          "a",
          {
            target: "_blank",
            href: "https://github.com/ianramzy/decentralized-video-chat",
          },
          React.createElement(GithubSvg, null)
        )
      )
    );
  };

  var renderNav = function renderNav() {
    var links = [
      {
        text: "Made with ❤️ by Ian Ramzy",
        href: "https://ianramzy.com",
      },
    ];

    return React.createElement(
      "nav",
      { className: "footer-nav" },
      React.createElement(
        "ul",
        { className: "list-reset" },
        links.map(function (_ref) {
          var href = _ref.href,
            text = _ref.text;
          return React.createElement(
            "li",
            null,
            React.createElement("a", { target: "_blank", href: href }, text)
          );
        })
      )
    );
  };

  return React.createElement(
    "footer",
    { className: "site-footer center-content-mobile" },
    React.createElement(
      "div",
      { className: "container" },
      React.createElement(
        "div",
        { className: "site-footer-inner" },
        React.createElement(
          "div",
          { className: "footer-top space-between text-xxs" },
          renderBrand(),
          renderSocials()
        ),
        React.createElement(
          "div",
          {
            className:
              "footer-bottom space-between text-xxs invert-order-desktop",
          },
          renderNav(),
          renderCopyright()
        )
      )
    )
  );
};

var domContainer = document.getElementById("react-footer-container");
ReactDOM.render(React.createElement(Footer, null), domContainer);
