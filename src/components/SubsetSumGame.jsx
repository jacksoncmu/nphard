// SubsetSumGame.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ThreeSatGame.css';  // reuse existing styles

// Utility to generate a random subset-sum problem with a guaranteed solution
function generateProblem(
  minItems = 4,
  maxItems = 7,
  minValue = 1,
  maxValue = 20
) {
  const size = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
  const values = Array.from({ length: size }, () =>
    Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
  );
  // pick a random non-empty subset to ensure solvable
  const subsetMask = Array.from({ length: size }, () => false);
  let count = 0;
  while (count === 0) {
    for (let i = 0; i < size; i++) {
      subsetMask[i] = Math.random() < 0.5;
    }
    count = subsetMask.filter(Boolean).length;
  }
  const target = values.reduce((sum, v, i) => sum + (subsetMask[i] ? v : 0), 0);
  return { values, target };
}

const TIMER = 30;

export default function SubsetSumGame({ onBack }) {
  const init = useMemo(() => generateProblem(), []);
  const [problem, setProblem] = useState(init);
  const [selected, setSelected] = useState(Array(init.values.length).fill(false));
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('subsetSumHighScore');
    return saved !== null ? Number(saved) : 0;
  });
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  // persist high score
  useEffect(() => {
    localStorage.setItem('subsetSumHighScore', highScore);
  }, [highScore]);

  // reset selection and time on new problem
  useEffect(() => {
    setSelected(Array(problem.values.length).fill(false));
    setTimeLeft(TIMER);
  }, [problem]);

  // timer logic
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  // handle timeout
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(h => Math.max(h, score));
    }
  }, [timeLeft, score]);

  // check for correct sum: increment only once per solve
  useEffect(() => {
    if (gameOver) return;
    const sum = problem.values.reduce(
      (acc, v, i) => acc + (selected[i] ? v : 0),
      0
    );
    if (sum === problem.target) {
      setScore(s => s + 1);
      // advance to next problem after a brief pause
      setTimeout(() => {
        const next = generateProblem();
        setProblem(next);
        setGameOver(false);
      }, 500);
    }
  }, [selected, problem, gameOver]);

  const handleToggle = i => {
    if (gameOver || showHelp) return;
    setSelected(s => {
      const next = [...s];
      next[i] = !next[i];
      return next;
    });
  };

  const handleRetry = () => {
    setScore(0);
    setTimeLeft(TIMER);
    const next = generateProblem();
    setProblem(next);
    setGameOver(false);
  };

  return (
    <div className="three-sat-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>
      {!gameOver && <h1 className="header">Subset Sum Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>
      {!gameOver && (
        <div className="stats">
          Target: <span className="mono">{problem.target}</span> | Time Left: <span className="mono">{timeLeft}s</span>
        </div>
      )}
      <div className="variables">
        {problem.values.map((v, i) => (
          <button
            key={i}
            className={`var-button ${selected[i] ? 'selected' : ''}`}
            onClick={() => handleToggle(i)}
          >
            {v}
          </button>
        ))}
      </div>
      {gameOver && (
        <div className="game-over">
          <div>Your last selection:</div>
          <div className="variables">
            {problem.values.map((v, i) => (
              <button
                key={i}
                className={`var-button ${selected[i] ? 'selected' : ''}`}
                disabled
              >
                {v}
              </button>
            ))}
          </div>
          <div>Target was: <span className="mono">{problem.target}</span></div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      )}
      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <h2>What is Subset Sum?</h2>
            <p>
              Given a list of numbers, your goal is to select a subset that sums exactly to the target value.
              Click on numbers to toggle them on or off. If the sum of selected numbers equals the target before time runs out,
              you advance to the next round!
            </p>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
