const MediumPost = () => {

    const state = {
        error: null,
        isLoaded: false,
        items: []
      };

    const { error, isLoaded, items } = state;
    const recentItems = [];
    
    for(var i=0;i<5;i++){
      recentItems.push(items[i]);
    }

    if (error) {
        return <div>Error: {error.message}</div>;
      } 
    
    if (!isLoaded) {
      return <div>Loading...</div>;
    } 

  return (
        <ul style={{ listStyleType: "none",
        width: "100%",
        padding:"0",
        }}>
          {recentItems.map(item => (
            <a style={{textDecoration: "none"}} href={item.link} key={item.title}>
            <li style={{  marginTop: "5px",}}>
            {item.title}
            </li>
            </a>
          ))}
        </ul>
      );
  }

  const domContainer = document.getElementById('react-container');
  ReactDOM.render(<MediumPost/>, domContainer);