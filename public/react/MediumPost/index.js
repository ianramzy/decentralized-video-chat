var MediumPost = function MediumPost() {

  var state = {
    error: null,
    isLoaded: false,
    items: []
  };

  var error = state.error,
      isLoaded = state.isLoaded,
      items = state.items;

  var recentItems = [];

  for (var i = 0; i < 5; i++) {
    recentItems.push(items[i]);
  }

  if (error) {
    return React.createElement(
      "div",
      null,
      "Error: ",
      error.message
    );
  }

  if (!isLoaded) {
    return React.createElement(
      "div",
      null,
      "Loading..."
    );
  }

  return React.createElement(
    "ul",
    { style: { listStyleType: "none",
        width: "100%",
        padding: "0"
      } },
    recentItems.map(function (item) {
      return React.createElement(
        "a",
        { style: { textDecoration: "none" }, href: item.link, key: item.title },
        React.createElement(
          "li",
          { style: { marginTop: "5px" } },
          item.title
        )
      );
    })
  );
};

var domContainer = document.getElementById('react-container');
ReactDOM.render(React.createElement(MediumPost, null), domContainer);