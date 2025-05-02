import React, { useState } from 'react';
import './App.css';
import VertexCoverGame from './components/VertexCoverGame';

// Data for each game
const games = [
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  }
  // add more games here
];

function MainMenu({ onSelect }) {
  return (
    <div className="main-menu">
      <h1 className="menu-title">Play NP-hard Problems</h1>
      <div className="menu-grid">
        {games.map(game => (
          <button
            key={game.id}
            className="menu-button"
            onClick={() => onSelect(game.id)}
          >
            <img src={game.image} alt={game.name} className="menu-image" />
            <span className="menu-label">{game.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [current, setCurrent] = useState(null);
  const selectedGame = games.find(g => g.id === current);

  if (!selectedGame) {
    return <MainMenu onSelect={setCurrent} />;
  }

  const GameComponent = selectedGame.component;
  // Pass onBack to allow returning to menu
  return <GameComponent onBack={() => setCurrent(null)} />;
}

export default App;
