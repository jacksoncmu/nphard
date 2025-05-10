// SubsetSumGame.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ThreeSatGame.css';  // reuse existing styles
import example from "../assets/subset-sum-example.png";

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
  const mask = Array.from({ length: size }, () => false);
  let count = 0;
  while (count === 0) {
    for (let i = 0; i < size; i++) {
      mask[i] = Math.random() < 0.5;
    }
    count = mask.filter(Boolean).length;
  }
  const target = values.reduce((sum, v, i) => sum + (mask[i] ? v : 0), 0);
  return { values, target, mask };
}

const TIMER = 30;

export default function SubsetSumGame({ onBack }) {
  const initProblem = useMemo(() => generateProblem(), []);
  const [problem, setProblem] = useState(initProblem);
  const { values, target, mask = [] } = problem;

  const [selected, setSelected] = useState(Array(values.length).fill(false));
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

  // calculate current sum
  const currentSum = values.reduce(
    (acc, v, i) => acc + (selected[i] ? v : 0),
    0
  );

  // reset selection and time on new problem
  useEffect(() => {
    setSelected(Array(values.length).fill(false));
    setTimeLeft(TIMER);
    setGameOver(false);
  }, [values]);

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
    if (currentSum === target) {
      setScore(s => s + 1);
      // advance to next problem after a brief pause
      setTimeout(() => {
        setProblem(generateProblem());
      }, 500);
    }
  }, [currentSum, gameOver, target]);

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
    setSelected(Array(values.length).fill(false));
    setTimeLeft(TIMER);
    setProblem(generateProblem());
    setGameOver(false);
  };

  return (
    <div className="three-sat-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>
      {!gameOver && <h1 className="header">Subset Sum Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      {!gameOver && (<div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>)} 
      {!gameOver && (
        <div className="stats">
          Target: <span className="mono">{target}</span> | 
          Current Sum: <span className="mono">{currentSum}</span> | 
          Time Left: <span className="mono">{timeLeft}s</span>
        </div>
      )}
      {!gameOver && (<div className="variables">
        {values.map((v, i) => (
          <button
            key={i}
            className={`var-button ${selected[i] ? 'selected' : ''}`}
            onClick={() => handleToggle(i)}
          >
            {v}
          </button>
        ))}
      </div> )}
      {gameOver && (
        <div className="game-over">
          <div>
            <div>Your last selection:</div>
            <div className="variables">
              {values.map((v, i) => (
                <button
                  key={i}
                  className={`var-button ${selected[i] ? 'selected' : ''}`}
                  disabled
                >{v}</button>
              ))}
            </div>
          </div>
          <div>
            <div>Correct selection:</div>
            <div className="variables">
              {values.map((v, i) => (
                <button
                  key={i}
                  className={`var-button ${mask[i] ? 'selected' : ''}`}
                  disabled
                >{v}</button>
              ))}
            </div>
          </div>
          <div>Original target: <span className="mono">{target}</span></div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      )}
      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <h2>What is Subset Sum?</h2>
            <p>
              Your goal is to select a subset of numbers that sums exactly to the target value.
              Click on numbers to include or exclude them in your selection.
            </p>
            <img
              src={example}
              alt="3SAT example"
              style={{
                display: 'block',      
                margin: '1rem auto',  
                maxWidth: '70%',      
                height: 'auto'       
              }}
            />
            <p>For instance, the above example would be a solution for the target value of 37, since 4+13+20=37.</p>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
