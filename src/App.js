import React, { useState } from 'react';
import './App.css';
import VertexCoverGame from './components/VertexCoverGame';
import IndependentSetGame from './components/IndependentSetGame';
import CliqueGame from './components/CliqueGame';
import ThreeColorGame from './components/ThreeColorGame';
import HamiltonianCycleGame from './components/HamCycleGame';
import TravelingSalesmanGame from './components/TravelingSalesmanGame';
import ThreeSatGame from './components/ThreeSatGame';
import SubsetSumGame from './components/SubsetSumGame';
import PartitionGame from './components/PartitionGame';

const games = [
  {
    id: 'vertex-cover',
    name: 'Vertex Cover',
    component: VertexCoverGame,
    image: require('./assets/vertex-cover.png'),
  },
  {
    id: 'independent-set',
    name: 'Independent Set',
    component: IndependentSetGame,
    image: require('./assets/independent-set.png'),
  }
  ,
  {
    id: 'clique-game',
    name: 'Clique Problem',
    component: CliqueGame,
    image: require('./assets/clique-game.png'),
  }
  ,
  {
    id: 'three-color-game',
    name: '3-Colorability',
    component: ThreeColorGame,
    image: require('./assets/three-color.png'),
  },
  {
    id: 'ham-cycle-game',
    name: 'Hamiltonian Cycle',
    component: HamiltonianCycleGame,
    image: require('./assets/ham-cycle.png'),
  },
  {
    id: 'traveling-salesman-game',
    name: 'Traveling Salesman',
    component: TravelingSalesmanGame,
    image: require('./assets/tsp-game.png'),
  },
  {
    id: 'three-sat-game',
    name: '3-Satisfiability',
    component: ThreeSatGame,
    image: require('./assets/three-sat.png'),
  },
  {
    id: 'subset-sum-game',
    name: 'Subset Sum',
    component: SubsetSumGame,
    image: require('./assets/subset-sum.png'),
  }
  ,
  {
    id: 'partition-game',
    name: 'Partition Problem',
    component: PartitionGame,
    image: require('./assets/partition.png'),
  }
  
  
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

  const handleSelect = id => {
    setCurrent(id);
    window.scrollTo(0, 0);
  };

  const selectedGame = games.find(g => g.id === current);

  if (!selectedGame) {
    return <MainMenu onSelect={handleSelect} />;
  }

  const GameComponent = selectedGame.component;
  return <GameComponent onBack={() => {
    setCurrent(null);
    window.scrollTo(0, 0);
  }} />;
}


export default App;
