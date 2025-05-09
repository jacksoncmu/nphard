// ThreeSatGame.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './ThreeSatGame.css';
import example from "../assets/three-sat-example.png";

// Utility to generate a random 3SAT formula with a guaranteed satisfying assignment
// and _never_ one that the all‐false selection satisfies.
function generateFormula(
  numVars = Math.floor(Math.random() * 3) + 3,
  numClauses = Math.floor(Math.random() * numVars) + numVars
) {
  let assignment, clauses;

  do {
    // 1) pick a random hidden assignment
    assignment = Array.from({ length: numVars }, () => Math.random() < 0.5);

    // 2) build clauses that are guaranteed satisfied by that assignment
    clauses = [];
    const maxAttempts = numClauses * 2;
    while (clauses.length < numClauses && clauses.length < maxAttempts) {
      const vars = [];
      while (vars.length < 3) {
        const v = Math.floor(Math.random() * numVars);
        if (!vars.includes(v)) vars.push(v);
      }
      const lit = vars.map(v => ({ var: v, neg: Math.random() < 0.5 }));
      // ensure at least one literal matches the hidden assignment
      if (!lit.some(({ var: v, neg }) => assignment[v] !== neg)) {
        const idx = Math.floor(Math.random() * 3);
        const v = lit[idx].var;
        lit[idx].neg = !assignment[v];
      }
      clauses.push(lit);
    }

    // 3) check if “all‐false” would satisfy _every_ clause
    //    (if so, we reject and loop again)
  } while (
    clauses.length === numClauses &&
    clauses.every(clause =>
      clause.some(({ neg }) =>
        // literal is satisfied by false exactly when neg===true
        neg
      )
    )
  );

  return { clauses, assignment, numVars };
}

const TIMER = 3;

export default function ThreeSatGame({ onBack }) {
  const init = useMemo(() => generateFormula(), []);
  const [formula, setFormula] = useState(init);
  const [selected, setSelected] = useState(Array(init.numVars).fill(false));
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const timerRef = useRef(null);

  // reset on new formula
  useEffect(() => {
    setSelected(Array(formula.numVars).fill(false));
    setHasInteracted(false);
  }, [formula]);

  useEffect(() => setTimeLeft(TIMER), [formula]);

  // timer logic
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameOver && !showHelp) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameOver, showHelp]);

  // time up
  useEffect(() => {
    if (timeLeft <= 0) {
      clearInterval(timerRef.current);
      setGameOver(true);
      setHighScore(h => Math.max(h, score));
    }
  }, [timeLeft, score]);

  // check if all clauses are satisfied, but only once per solve
  useEffect(() => {
    if (!hasInteracted) return;

    const sat = formula.clauses.every(clause =>
      clause.some(({ var: v, neg }) => selected[v] === !neg)
    );
    if (sat) {
      setHasInteracted(false);
      setScore(s => s + 1);
      setTimeout(() => {
        const next = generateFormula();
        setFormula(next);
        setGameOver(false);
      }, 500);
    }
  }, [selected, hasInteracted, formula]);

  const handleToggle = v => {
    if (gameOver || showHelp) return;
    setSelected(s => {
      const next = [...s];
      next[v] = !next[v];
      return next;
    });
    setHasInteracted(true);
  };

  const handleRetry = () => {
    setScore(0);
    const next = generateFormula();
    setFormula(next);
    setGameOver(false);
  };

  const renderClause = (clause, idx) => {
    const isSatisfied = clause.some(({ var: v, neg }) => selected[v] === !neg);
    return (
      <div key={idx} className={`clause${isSatisfied ? ' satisfied' : ''}`}>
        (
        {clause.map(({ var: v, neg }, i) => (
          <span key={i} className="literal">
            {neg ? '¬' : ''}x{v + 1}
            {i < clause.length - 1 ? ' ∨ ' : ''}
          </span>
        ))}
        )
      </div>
    );
  };

  const renderAssignments = arr => (
    <div className="assignments">
      {arr.map((val, i) => (
        <div key={i} className={`var ${val ? 'true' : 'false'}`}>
          x{i + 1}: {val ? 'T' : 'F'}
        </div>
      ))}
    </div>
  );

  return (
    <div className="three-sat-container">
      <button className="back-button" onClick={onBack}>Main Menu</button>
      <button className="help-button" onClick={() => setShowHelp(true)}>?</button>
      {!gameOver && <h1 className="header">3SAT Challenge</h1>}
      {gameOver && <h1 className="game-over-text">Time's up!</h1>}
      <div className="scoreboard">
        Score: <span className="mono">{score}</span> | High Score: <span className="mono">{highScore}</span>
      </div>
      {!gameOver && (
        <div className="stats">Time Left: <span className="mono">{timeLeft}s</span></div>
      )}
      <div className="formula">{formula.clauses.map(renderClause)}</div>
      {!gameOver ? (
        <div className="variables">
          {selected.map((val, i) => (
            <button
              key={i}
              className={`var-button ${val ? 'selected' : ''}`}
              onClick={() => handleToggle(i)}
            >
              x{i + 1}: {val ? 'T' : 'F'}
            </button>
          ))}
        </div>
      ) : (
        <div className="game-over">
          <div>
            <div>Your assignment:</div>
            {renderAssignments(selected)}
          </div>
          <div>
            <div>Correct assignment:</div>
            {renderAssignments(formula.assignment)}
          </div>
          <button onClick={handleRetry} className="retry-button">Retry</button>
        </div>
      )}
      {showHelp && (
  <div className="help-overlay" onClick={() => setShowHelp(false)}>
    <div className="help-modal" onClick={e => e.stopPropagation()}>
      <h2>What is 3SAT?</h2>
      <p>
        3SAT is a <strong>Boolean satisfiability</strong> problem. You have a formula
        that's a conjunction (<code>∧</code>) of clauses, each clause being a disjunction
        (<code>∨</code>) of exactly three literals.
      </p>
      <p><code>AND (∧)</code>: true if and only if <em>both</em> values are true.</p>
          
      <p><code>OR (∨)</code>: true if <em>at least one</em> value is true.</p>

      <p><code>NOT (¬)</code>: inverts truth values (<code>¬true = false</code>, <code>¬false = true</code>).</p>

      <p>
        Your goal is to assign truth values (T for True, F for False) to each of the variables so that every clause evaluates to true.
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
      <p>In the above example, setting x1 as False, x2 as True, and x3 as False makes the entire statement true.</p>
      <button onClick={() => setShowHelp(false)}>Got it!</button>
    </div>
  </div>
)}

    </div>
  );
}
