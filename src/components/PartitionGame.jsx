
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ThreeSatGame.css';
import './PartitionGame.css';
import example from "../assets/partition-example.png";


function generatePartitionProblem(
  minItems = 5,
  maxItems = 8,
  minValue = 1,
  maxValue = 20
) {
  const size = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
  let mask;

  do {
    mask = Array.from({ length: size }, () => Math.random() < 0.5);
  } while (mask.every(m => !m) || mask.every(m => m));

  const maskIndices = mask.map((m, i) => (m ? i : -1)).filter(i => i >= 0);
  const compIndices = mask.map((m, i) => (!m ? i : -1)).filter(i => i >= 0);

  let values;
  while (true) {

    const xs = maskIndices.map(
      () => Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
    );
    const sumX = xs.reduce((a, b) => a + b, 0);

    let ys = [];
    const c = compIndices.length;
    if (c === 1) {
      if (sumX < minValue || sumX > maxValue) continue;
      ys = [sumX];
    } else {

      ys = compIndices.slice(0, c - 1).map(
        () => Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
      );
      const sumY = ys.reduce((a, b) => a + b, 0);
      const last = sumX - sumY;
      if (last < minValue || last > maxValue) continue;
      ys.push(last);
    }

    values = Array(size);
    maskIndices.forEach((idx, i) => (values[idx] = xs[i]));
    compIndices.forEach((idx, i) => (values[idx] = ys[i]));

    
    break;
  }
  return { values, mask };
}

const TIMER = 30;

export default function PartitionGame({ onBack }) {
  const initProblem = useMemo(() => generatePartitionProblem(), []);
  const [problem, setProblem] = useState(initProblem);
  const { values, mask } = problem;
  const totalSum = values.reduce((a, b) => a + b, 0);
    const halfSum = totalSum / 2;

  const [moved, setMoved] = useState(() => Array(values.length).fill(false));
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('partitionHighScore');
    return saved !== null ? Number(saved) : 0;
  });
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('partitionHighScore', highScore);
  }, [highScore]);

  const topSum = values.reduce(
    (sum, v, i) => sum + (moved[i] ? 0 : v),
    0
  );
  const bottomSum = values.reduce(
    (sum, v, i) => sum + (moved[i] ? v : 0),
    0
  );


  
  useEffect(() => {
    setMoved(Array(values.length).fill(false));
    setTimeLeft(TIMER);
    setGameOver(false);
  }, [values]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(h => Math.max(h, score));
    }
  }, [timeLeft, score]);


  useEffect(() => {
    if (gameOver) return;
    if (topSum === bottomSum) {
      setScore(s => s + 1);
      setTimeout(() => setProblem(generatePartitionProblem()), 500);
    }
  }, [topSum, bottomSum, gameOver]);

  const handleToggle = i => {
    if (gameOver || showHelp) return;
    setMoved(m => {
      const next = [...m];
      next[i] = !next[i];
      return next;
    });
  };

  const handleRetry = () => {
    setScore(0);
    setProblem(generatePartitionProblem());
  };

  return (
    <div className="three-sat-container">
      {onBack && <button className="back-button" onClick={onBack}>Main Menu</button>}
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>
      {!gameOver && <h1 className="header">Partition Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}

      {!gameOver && (
        <div className="scoreboard">
          Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
        </div>
      )}

      {!gameOver && (
        <div className="stats">
     Time Left: <span className="mono">{timeLeft}s</span>
        </div>
      )}

            {!gameOver && (
        <div
          className="slot-container with-sums"
          style={{ width: `${values.length * 4.5 + 4}rem` }} 
        >
          {values.map((v, i) => (
            <button
              key={i}
              className={`var-button slot${moved[i] ? ' moved' : ''}`}
              style={{ left: `${i * 4.5}rem` }}
              onClick={() => handleToggle(i)}
            >
              {v}
            </button>
          ))}

          {/* sum labels */}
          <div className="sum-label top-sum">Sum: {topSum}</div>
          <div className="sum-label bottom-sum">Sum: {bottomSum}</div>
        </div>
      )}


            {gameOver && (
        <div className="game-over">
          <div>
            <div>Correct partition (each row having a sum of {halfSum}): </div>
            <div
              className="slot-container with-sums"
              style={{ width: `${values.length * 4.5 + 4}rem` }}
            >
              {values.map((v, i) => (
                <button
                  key={i}
                  className={`var-button slot${mask[i] ? ' moved' : ''}`}
                  style={{ left: `${i * 4.5}rem` }}
                  disabled
                >
                  {v}
                </button>
              ))}

            </div>
          </div>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      )}


      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <h2>What is the Partition Problem?</h2>
            <p>Your goal is to partition the numbers into two groups with equal sum. Click on numbers to move them between up and down.</p>
                        <img
                          src={example}
                          alt="Partition example"
                          style={{
                            display: 'block',      
                            margin: '1rem auto',  
                            maxWidth: '70%',      
                            height: 'auto'       
                          }}
                        />
                        <p>For instance, the above example splits the numbers into two rows, where each row sums to 38.</p>
            <button onClick={() => setShowHelp(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}
