/**
 * Chess App - Main Application
 * Mobile-first chess app with AI, local play, and game management
 */

const App = (function() {
  const { Chess, COLORS, PIECE_UNICODE } = ChessEngine;
  
  // App State
  let currentScreen = 'home';
  let gameState = null;
  let gameConfig = {
    side: 'w', // 'w', 'b', 'random'
    opponentType: 'AI', // 'AI', 'LOCAL'
    aiLevel: 3,
    timeControl: null, // null, { initial: ms, increment: ms }
    showHints: true
  };
  let selectedSquare = null;
  let legalMoves = [];
  let isDragging = false;
  let draggedPiece = null;
  let savedGames = [];
  let reviewState = null;
  let clockInterval = null;
  let settings = {
    showCoordinates: true,
    flipBoard: false,
    soundEnabled: true,
    theme: 'wood'
  };
  
  // Initialize app
  function init() {
    loadSavedGames();
    loadSettings();
    // Ensure flipBoard starts as false for consistent behavior
    settings.flipBoard = false;
    renderScreen('home');
  }
  
  // ===== Screen Rendering =====
  
  function renderScreen(screen, data = {}) {
    currentScreen = screen;
    const app = document.getElementById('app');
    
    switch (screen) {
      case 'home':
        app.innerHTML = renderHomeScreen();
        break;
      case 'newGame':
        app.innerHTML = renderNewGameScreen();
        break;
      case 'game':
        app.innerHTML = renderGameScreen();
        initGameBoard();
        break;
      case 'review':
        app.innerHTML = renderReviewScreen();
        initReviewBoard();
        break;
      case 'saved':
        app.innerHTML = renderSavedScreen();
        break;
      case 'settings':
        app.innerHTML = renderSettingsScreen();
        break;
    }
  }
  
  // ===== Home Screen =====
  
  function renderHomeScreen() {
    return `
      <div class="screen home-screen">
        <div class="home-logo">♞</div>
        <h1 class="home-title">Axon Chess Master</h1>
        <p class="home-subtitle">Play, Learn, Improve</p>
        
        <div class="home-menu">
          <button class="menu-btn primary" onclick="App.showNewGame()">
            <span class="icon">▶</span>
            <span>New Game</span>
            <span class="arrow">›</span>
          </button>
          
          ${gameState ? `
            <button class="menu-btn" onclick="App.continueGame()">
              <span class="icon">↺</span>
              <span>Continue Game</span>
              <span class="arrow">›</span>
            </button>
          ` : ''}
          
          <div class="menu-divider"></div>
          
          <button class="menu-btn" onclick="App.showSaved()">
            <span class="icon">📁</span>
            <span>Saved Games</span>
            <span class="arrow">›</span>
          </button>
          
          <button class="menu-btn" onclick="App.showSettings()">
            <span class="icon">⚙</span>
            <span>Settings</span>
            <span class="arrow">›</span>
          </button>
        </div>
      </div>
    `;
  }
  
  // ===== New Game Config Screen =====
  
  function renderNewGameScreen() {
    return `
      <div class="screen config-screen">
        <div class="screen-header">
          <button class="back-btn" onclick="App.goHome()">←</button>
          <h1 class="screen-title">New Game</h1>
        </div>
        
        <div class="config-section">
          <div class="config-label">Play As</div>
          <div class="config-options">
            <button class="config-option ${gameConfig.side === 'w' ? 'selected' : ''}" 
                    onclick="App.setConfig('side', 'w')">
              <div class="icon">♔</div>
              <div class="label">White</div>
            </button>
            <button class="config-option ${gameConfig.side === 'b' ? 'selected' : ''}"
                    onclick="App.setConfig('side', 'b')">
              <div class="icon">♚</div>
              <div class="label">Black</div>
            </button>
            <button class="config-option ${gameConfig.side === 'random' ? 'selected' : ''}"
                    onclick="App.setConfig('side', 'random')">
              <div class="icon">🎲</div>
              <div class="label">Random</div>
            </button>
          </div>
        </div>
        
        <div class="config-section">
          <div class="config-label">Opponent</div>
          <div class="config-options">
            <button class="config-option ${gameConfig.opponentType === 'AI' ? 'selected' : ''}"
                    onclick="App.setConfig('opponentType', 'AI')">
              <div class="icon">🤖</div>
              <div class="label">vs AI</div>
            </button>
            <button class="config-option ${gameConfig.opponentType === 'LOCAL' ? 'selected' : ''}"
                    onclick="App.setConfig('opponentType', 'LOCAL')">
              <div class="icon">👥</div>
              <div class="label">Local</div>
              <div class="sublabel">Pass & Play</div>
            </button>
          </div>
        </div>
        
        ${gameConfig.opponentType === 'AI' ? `
          <div class="config-section">
            <div class="config-label">AI Difficulty</div>
            <div class="difficulty-slider">
              <div class="difficulty-header">
                <span>Level</span>
                <span class="difficulty-value">${gameConfig.aiLevel}</span>
              </div>
              <input type="range" min="1" max="8" value="${gameConfig.aiLevel}"
                     oninput="App.setConfig('aiLevel', parseInt(this.value))">
            </div>
          </div>
        ` : ''}
        
        <div class="config-section">
          <div class="config-label">Time Control</div>
          <div class="time-options">
            <button class="time-option ${!gameConfig.timeControl ? 'selected' : ''}"
                    onclick="App.setTimeControl(null)">
              <div class="time">∞</div>
              <div class="name">No Limit</div>
            </button>
            <button class="time-option ${gameConfig.timeControl?.initial === 180000 ? 'selected' : ''}"
                    onclick="App.setTimeControl({initial: 180000, increment: 0})">
              <div class="time">3+0</div>
              <div class="name">Blitz</div>
            </button>
            <button class="time-option ${gameConfig.timeControl?.initial === 300000 ? 'selected' : ''}"
                    onclick="App.setTimeControl({initial: 300000, increment: 0})">
              <div class="time">5+0</div>
              <div class="name">Blitz</div>
            </button>
            <button class="time-option ${gameConfig.timeControl?.initial === 600000 ? 'selected' : ''}"
                    onclick="App.setTimeControl({initial: 600000, increment: 0})">
              <div class="time">10+0</div>
              <div class="name">Rapid</div>
            </button>
          </div>
        </div>
        
        <div class="config-section">
          <div class="toggle-row">
            <span>Show Move Hints</span>
            <div class="toggle ${gameConfig.showHints ? 'active' : ''}"
                 onclick="App.setConfig('showHints', !gameConfig.showHints)"></div>
          </div>
        </div>
        
        <button class="start-btn" onclick="App.startGame()">
          Start Game
        </button>
      </div>
    `;
  }
  
  // ===== Game Screen =====
  
  function renderGameScreen() {
    if (!gameState) return '';
    
    const { chess, playerColor, clocks, isAIThinking } = gameState;
    const isPlayerTurn = chess.turn === playerColor || gameConfig.opponentType === 'LOCAL';
    const opponent = gameConfig.opponentType === 'AI' ? `AI (Lvl ${gameConfig.aiLevel})` : 'Black';
    const player = gameConfig.opponentType === 'AI' ? 'You' : 'White';
    
    // Determine which color is on top (opponent from player's perspective)
    const topColor = playerColor === 'w' ? 'b' : 'w';
    const bottomColor = playerColor === 'w' ? 'w' : 'b';
    
    return `
      <div class="screen game-screen">
        <div class="game-header">
          <button class="icon-btn" onclick="App.goHome()">←</button>
          <div class="game-status ${isPlayerTurn ? 'your-turn' : ''}">
            ${chess.inCheck() ? '⚠ Check!' : (isPlayerTurn ? 'Your turn' : 'Opponent\'s turn')}
          </div>
          <div class="game-actions-top">
            <button class="icon-btn" onclick="App.toggleFlip()">🔄</button>
            <button class="icon-btn" onclick="App.showGameMenu()">⋮</button>
          </div>
        </div>
        
        <!-- Opponent Info -->
        <div class="player-info ${chess.turn === topColor ? 'active' : ''}">
          <div class="player-details">
            <div class="player-avatar ${topColor === 'w' ? 'white' : 'black'}">
              ${topColor === 'w' ? '♔' : '♚'}
            </div>
            <div>
              <div class="player-name">${topColor === playerColor ? player : opponent}</div>
              <div class="player-captured">${getCapturedPieces(chess, topColor === 'w' ? 'b' : 'w')}</div>
            </div>
          </div>
          ${clocks ? `<div class="clock ${clocks[topColor] < 30000 ? 'low-time' : ''}">${formatTime(clocks[topColor])}</div>` : ''}
        </div>
        
        <!-- Chess Board with Eval Bar -->
        <div class="board-container">
          <div class="eval-bar" id="eval-bar">
            <div class="eval-bar-fill" id="eval-bar-fill"></div>
            <div class="eval-bar-label" id="eval-bar-label">0.0</div>
          </div>
          <div class="chess-board" id="chess-board"></div>
        </div>
        
        ${isAIThinking ? `
          <div class="ai-thinking">
            <div class="thinking-dots"><span></span><span></span><span></span></div>
            <span>AI is thinking...</span>
          </div>
        ` : ''}
        
        <!-- Player Info -->
        <div class="player-info ${chess.turn === bottomColor ? 'active' : ''}">
          <div class="player-details">
            <div class="player-avatar ${bottomColor === 'w' ? 'white' : 'black'}">
              ${bottomColor === 'w' ? '♔' : '♚'}
            </div>
            <div>
              <div class="player-name">${bottomColor === playerColor ? player : opponent}</div>
              <div class="player-captured">${getCapturedPieces(chess, bottomColor === 'w' ? 'b' : 'w')}</div>
            </div>
          </div>
          ${clocks ? `<div class="clock ${clocks[bottomColor] < 30000 ? 'low-time' : ''}">${formatTime(clocks[bottomColor])}</div>` : ''}
        </div>
        
        <!-- Move List -->
        <div class="move-list-container">
          <div class="move-list" id="move-list">
            ${renderMoveList(chess.moveHistory)}
          </div>
        </div>
        
        <!-- Bottom Actions -->
        <div class="game-actions-bottom">
          ${gameConfig.opponentType === 'LOCAL' ? `
            <button class="action-btn" onclick="App.undoMove()" ${chess.moveHistory.length === 0 ? 'disabled' : ''}>
              <span class="icon">↶</span>
              <span>Undo</span>
            </button>
          ` : ''}
          <button class="action-btn" onclick="App.offerDraw()">
            <span class="icon">🤝</span>
            <span>Draw</span>
          </button>
          <button class="action-btn danger" onclick="App.resign()">
            <span class="icon">🏳</span>
            <span>Resign</span>
          </button>
          <button class="action-btn" onclick="App.saveCurrentGame()">
            <span class="icon">💾</span>
            <span>Save</span>
          </button>
        </div>
      </div>
    `;
  }
  
  function initGameBoard() {
    renderBoard();
    setupBoardEvents();
    startClocks();
    updateEvalBar(); // Initial evaluation
  }
  
  function renderBoard() {
    const board = document.getElementById('chess-board');
    if (!board || !gameState) return;
    
    const { chess, playerColor, lastMove } = gameState;
    const board2D = chess.board2D();
    // Board orientation: player's pieces should be at the BOTTOM
    // Without flip: white at bottom (row 7), black at top (row 0)
    // With flip: black at bottom (row 0), white at top (row 7)
    // So: flip when player is BLACK, don't flip when player is WHITE
    const defaultFlip = playerColor === 'b';
    const flipBoard = settings.flipBoard ? !defaultFlip : defaultFlip;
    const kingInCheck = chess.inCheck() ? chess.findKing(chess.turn) : null;
    
    let html = '';
    
    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const row = flipBoard ? 7 - displayRow : displayRow;
        const col = flipBoard ? 7 - displayCol : displayCol;
        const cell = board2D[row][col];
        const square = cell.square;
        
        let classes = ['square', cell.isLight ? 'light' : 'dark'];
        
        // Highlight selected square
        if (selectedSquare === square) {
          classes.push('selected');
        }
        
        // Highlight last move
        if (lastMove && (lastMove.from === square || lastMove.to === square)) {
          classes.push('last-move');
        }
        
        // Highlight king in check
        if (kingInCheck && row === kingInCheck.row && col === kingInCheck.col) {
          classes.push('check');
        }
        
        // Highlight legal moves
        const isLegalMove = legalMoves.some(m => m.to === square);
        if (isLegalMove && gameConfig.showHints) {
          classes.push(cell.piece ? 'legal-capture' : 'legal-move');
        }
        
        html += `<div class="${classes.join(' ')}" data-square="${square}">`;
        
        // Coordinates
        if (settings.showCoordinates) {
          if ((flipBoard ? displayCol === 7 : displayCol === 0)) {
            html += `<span class="coord rank">${8 - row}</span>`;
          }
          if ((flipBoard ? displayRow === 0 : displayRow === 7)) {
            html += `<span class="coord file">${String.fromCharCode(97 + col)}</span>`;
          }
        }
        
        // Piece
        if (cell.piece) {
          html += `<span class="piece" data-piece="${cell.piece.color}${cell.piece.type}" draggable="true">
            ${cell.piece.unicode}
          </span>`;
        }
        
        html += '</div>';
      }
    }
    
    board.innerHTML = html;
  }
  
  function setupBoardEvents() {
    const board = document.getElementById('chess-board');
    if (!board) return;
    
    // Touch/Click events for squares
    board.addEventListener('click', handleSquareClick);
    board.addEventListener('touchend', handleSquareTouch);
    
    // Drag events
    board.addEventListener('dragstart', handleDragStart);
    board.addEventListener('dragover', handleDragOver);
    board.addEventListener('drop', handleDrop);
    board.addEventListener('dragend', handleDragEnd);
  }
  
  function handleSquareClick(e) {
    const squareEl = e.target.closest('.square');
    if (!squareEl) return;
    
    const square = squareEl.dataset.square;
    handleSquareSelect(square);
  }
  
  function handleSquareTouch(e) {
    if (isDragging) return;
    const squareEl = e.target.closest('.square');
    if (!squareEl) return;
    
    const square = squareEl.dataset.square;
    handleSquareSelect(square);
  }
  
  function handleSquareSelect(square) {
    if (!gameState || gameState.result) return;
    
    const { chess, playerColor } = gameState;
    const piece = chess.get(square);
    const isPlayerTurn = chess.turn === playerColor || gameConfig.opponentType === 'LOCAL';
    
    if (!isPlayerTurn && gameConfig.opponentType === 'AI') return;
    
    // If a square is already selected
    if (selectedSquare) {
      // Check if this is a legal move
      const move = legalMoves.find(m => m.to === square);
      if (move) {
        makeMove(move);
        return;
      }
    }
    
    // Select new square if it has a piece of current player
    if (piece && piece.color === chess.turn) {
      selectedSquare = square;
      legalMoves = chess.moves({ square });
      renderBoard();
    } else {
      // Deselect
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
    }
  }
  
  function handleDragStart(e) {
    const pieceEl = e.target.closest('.piece');
    if (!pieceEl) return;
    
    const squareEl = pieceEl.closest('.square');
    const square = squareEl.dataset.square;
    
    if (!gameState) return;
    const { chess, playerColor } = gameState;
    const piece = chess.get(square);
    const isPlayerTurn = chess.turn === playerColor || gameConfig.opponentType === 'LOCAL';
    
    if (!isPlayerTurn && gameConfig.opponentType === 'AI') {
      e.preventDefault();
      return;
    }
    
    if (!piece || piece.color !== chess.turn) {
      e.preventDefault();
      return;
    }
    
    isDragging = true;
    selectedSquare = square;
    legalMoves = chess.moves({ square });
    
    e.dataTransfer.setData('text/plain', square);
    e.dataTransfer.effectAllowed = 'move';
    
    setTimeout(() => renderBoard(), 0);
  }
  
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  
  function handleDrop(e) {
    e.preventDefault();
    const squareEl = e.target.closest('.square');
    if (!squareEl) return;
    
    const toSquare = squareEl.dataset.square;
    const fromSquare = e.dataTransfer.getData('text/plain');
    
    const move = legalMoves.find(m => m.from === fromSquare && m.to === toSquare);
    if (move) {
      makeMove(move);
    } else {
      showToast('Invalid move', 'error');
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
    }
    
    isDragging = false;
  }
  
  function handleDragEnd(e) {
    isDragging = false;
    selectedSquare = null;
    legalMoves = [];
    renderBoard();
  }
  
  function makeMove(move) {
    if (!gameState) return;
    
    // Check for promotion
    if (move.promotion) {
      showPromotionDialog(move);
      return;
    }
    
    executeMoveAndUpdate(move);
  }
  
  function showPromotionDialog(move) {
    const modal = document.getElementById('promotion-modal');
    const piecesContainer = document.getElementById('promotion-pieces');
    const color = gameState.chess.turn;
    
    const pieces = ['q', 'r', 'b', 'n'];
    piecesContainer.innerHTML = pieces.map(p => `
      <div class="promotion-piece" onclick="App.selectPromotion('${p}', ${JSON.stringify(move).replace(/"/g, '&quot;')})">
        ${PIECE_UNICODE[color + p.toUpperCase()]}
      </div>
    `).join('');
    
    modal.classList.remove('hidden');
    
    // Store pending move
    gameState.pendingPromotion = move;
  }
  
  function selectPromotion(piece, move) {
    const modal = document.getElementById('promotion-modal');
    modal.classList.add('hidden');
    
    // Find the move with the selected promotion
    const promoMove = legalMoves.find(m => 
      m.from === move.from && m.to === move.to && m.promotion === piece
    );
    
    if (promoMove) {
      executeMoveAndUpdate(promoMove);
    }
  }
  
  function animatePieceMove(fromSquare, toSquare, isCapture = false) {
    return new Promise((resolve) => {
      const board = document.getElementById('chess-board');
      if (!board) {
        resolve();
        return;
      }
      
      const fromEl = board.querySelector(`[data-square="${fromSquare}"]`);
      const toEl = board.querySelector(`[data-square="${toSquare}"]`);
      const pieceEl = fromEl?.querySelector('.piece');
      
      if (!fromEl || !toEl || !pieceEl) {
        resolve();
        return;
      }
      
      // Get positions
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      
      // Calculate delta
      const deltaX = toRect.left - fromRect.left;
      const deltaY = toRect.top - fromRect.top;
      
      // If there's a capture, fade out the captured piece
      if (isCapture) {
        const capturedPiece = toEl.querySelector('.piece');
        if (capturedPiece) {
          capturedPiece.classList.add('captured-fade');
        }
      }
      
      // Apply animation class and transform
      pieceEl.classList.add('animating');
      pieceEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      
      // Wait for animation to complete
      const onTransitionEnd = () => {
        pieceEl.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      };
      
      pieceEl.addEventListener('transitionend', onTransitionEnd);
      
      // Fallback timeout in case transitionend doesn't fire
      setTimeout(resolve, 250);
    });
  }
  
  async function executeMoveAndUpdate(move) {
    const { chess } = gameState;
    
    // Check if it's a capture
    const targetPiece = chess.get(move.to);
    const isCapture = !!targetPiece;
    
    // Animate the piece movement first
    await animatePieceMove(move.from, move.to, isCapture);
    
    const result = chess.move(move);
    if (!result) {
      showToast('Invalid move', 'error');
      return;
    }
    
    gameState.lastMove = move;
    selectedSquare = null;
    legalMoves = [];
    
    // Check for game over
    if (chess.isGameOver()) {
      endGame(chess.getResult());
      return;
    }
    
    // Update display
    updateGameDisplay();
    
    // AI move
    if (gameConfig.opponentType === 'AI' && chess.turn !== gameState.playerColor) {
      setTimeout(requestAIMove, 500);
    }
  }
  
  async function requestAIMove() {
    if (!gameState || gameState.result) return;
    
    gameState.isAIThinking = true;
    updateGameDisplay();
    
    try {
      // Get best move from Stockfish (async)
      const move = await ChessAI.getBestMove(gameState.chess, gameConfig.aiLevel);
      
      if (move && gameState && !gameState.result) {
        gameState.isAIThinking = false;
        // Re-render to remove "thinking" indicator before animation
        renderBoard();
        
        // Check if it's a capture
        const targetPiece = gameState.chess.get(move.to);
        const isCapture = !!targetPiece;
        
        // Animate the AI's piece movement
        await animatePieceMove(move.from, move.to, isCapture);
        
        gameState.chess.move(move);
        gameState.lastMove = move;
        
        if (gameState.chess.isGameOver()) {
          endGame(gameState.chess.getResult());
          return;
        }
        
        updateGameDisplay();
        return;
      }
    } catch (error) {
      console.error('AI move error:', error);
    }
    
    if (gameState) {
      gameState.isAIThinking = false;
      updateGameDisplay();
    }
  }
  
  function updateGameDisplay() {
    renderBoard();
    
    // Update move list
    const moveList = document.getElementById('move-list');
    if (moveList) {
      moveList.innerHTML = renderMoveList(gameState.chess.moveHistory);
      moveList.scrollLeft = moveList.scrollWidth;
    }
    
    // Update status and player info
    const statusEl = document.querySelector('.game-status');
    if (statusEl) {
      const isPlayerTurn = gameState.chess.turn === gameState.playerColor || gameConfig.opponentType === 'LOCAL';
      statusEl.className = `game-status ${isPlayerTurn ? 'your-turn' : ''}`;
      statusEl.textContent = gameState.chess.inCheck() ? '⚠ Check!' : (isPlayerTurn ? 'Your turn' : 'Opponent\'s turn');
    }
    
    // Update active player highlight
    document.querySelectorAll('.player-info').forEach((el, i) => {
      const topColor = gameState.playerColor === 'w' ? 'b' : 'w';
      const isTop = i === 0;
      const color = isTop ? topColor : (gameState.playerColor === 'w' ? 'w' : 'b');
      el.classList.toggle('active', gameState.chess.turn === color);
    });
    
    // Update evaluation bar
    updateEvalBar();
  }
  
  async function updateEvalBar() {
    if (!gameState || gameState.result) return;
    
    const evalBar = document.getElementById('eval-bar');
    const evalBarFill = document.getElementById('eval-bar-fill');
    const evalBarLabel = document.getElementById('eval-bar-label');
    
    if (!evalBar || !evalBarFill || !evalBarLabel) return;
    
    try {
      // Get evaluation from engine (in centipawns)
      const evalCp = await ChessAI.getEvaluation(gameState.chess);
      
      // Calculate fill percentage (50% = equal, 100% = white winning, 0% = black winning)
      // Use a more responsive scaling:
      // +/- 500cp (5 pawns) = near max/min
      // Linear scaling with soft clamp
      const evalPawns = evalCp / 100;
      
      // Map evaluation to percentage: 0 pawns = 50%, +5 pawns = ~95%, -5 pawns = ~5%
      // Using tanh for smooth clamping
      const scaledEval = Math.tanh(evalPawns / 3) * 45; // Maps to roughly -45 to +45
      const fillPercent = 50 + scaledEval;
      
      // Clamp to valid range
      const clampedFill = Math.max(5, Math.min(95, fillPercent));
      
      // Update bar with animation
      evalBarFill.style.height = `${clampedFill}%`;
      
      // Update advantage class
      evalBar.classList.remove('white-winning', 'black-winning');
      if (evalCp > 50) {
        evalBar.classList.add('white-winning');
      } else if (evalCp < -50) {
        evalBar.classList.add('black-winning');
      }
      
      // Update label
      if (Math.abs(evalCp) >= 10000) {
        // Mate
        const mateIn = Math.ceil((10000 - Math.abs(evalCp)) / 10);
        evalBarLabel.textContent = evalCp > 0 ? `M${mateIn}` : `-M${mateIn}`;
      } else {
        // Show in pawns with sign
        const displayEval = Math.abs(evalCp / 100).toFixed(1);
        if (Math.abs(evalCp) < 10) {
          evalBarLabel.textContent = '0.0';
        } else {
          evalBarLabel.textContent = evalCp >= 0 ? `+${displayEval}` : `-${displayEval}`;
        }
      }
    } catch (error) {
      console.error('Eval error:', error);
    }
  }
  
  function renderMoveList(history) {
    if (!history || history.length === 0) return '<span style="color: var(--text-muted)">No moves yet</span>';
    
    let html = '';
    for (let i = 0; i < history.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = history[i];
      const blackMove = history[i + 1];
      
      html += `<div class="move-item">
        <span class="move-number">${moveNum}.</span>
        <span class="move-san white">${whiteMove.san}</span>
        ${blackMove ? `<span class="move-san black">${blackMove.san}</span>` : ''}
      </div>`;
    }
    
    return html;
  }
  
  function getCapturedPieces(chess, byColor) {
    const captured = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    
    for (const move of chess.moveHistory) {
      if (move.captured && move.color === byColor) {
        captured[move.captured]++;
      }
    }
    
    let html = '';
    const order = ['q', 'r', 'b', 'n', 'p'];
    const enemyColor = byColor === 'w' ? 'b' : 'w';
    
    for (const piece of order) {
      for (let i = 0; i < captured[piece]; i++) {
        html += PIECE_UNICODE[enemyColor + piece.toUpperCase()];
      }
    }
    
    return html || '-';
  }
  
  // ===== Clocks =====
  
  function startClocks() {
    if (!gameState || !gameState.clocks) return;
    
    stopClocks();
    
    clockInterval = setInterval(() => {
      if (!gameState || !gameState.clocks || gameState.result) {
        stopClocks();
        return;
      }
      
      const turn = gameState.chess.turn;
      gameState.clocks[turn] -= 100;
      
      if (gameState.clocks[turn] <= 0) {
        gameState.clocks[turn] = 0;
        endGame({
          outcome: turn === 'w' ? '0-1' : '1-0',
          reason: 'timeout',
          winner: turn === 'w' ? 'b' : 'w'
        });
        return;
      }
      
      // Update clock display
      document.querySelectorAll('.clock').forEach(el => {
        const text = el.textContent;
        if (text) {
          const topColor = gameState.playerColor === 'w' ? 'b' : 'w';
          const bottomColor = gameState.playerColor;
          const isTop = el.closest('.player-info') === document.querySelector('.player-info');
          const clockColor = isTop ? topColor : bottomColor;
          el.textContent = formatTime(gameState.clocks[clockColor]);
          el.classList.toggle('low-time', gameState.clocks[clockColor] < 30000);
        }
      });
    }, 100);
  }
  
  function stopClocks() {
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
  }
  
  function formatTime(ms) {
    if (!ms && ms !== 0) return '--:--';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // ===== Game Actions =====
  
  function endGame(result) {
    if (!gameState) return;
    
    gameState.result = result;
    stopClocks();
    
    // Show result modal
    const modal = document.getElementById('result-modal');
    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');
    
    let resultText, iconText, messageText;
    
    if (result.outcome === '1/2-1/2') {
      iconText = '🤝';
      resultText = 'Draw!';
      const reasons = {
        'stalemate': 'by stalemate',
        'insufficient': 'by insufficient material',
        '50-move': 'by 50-move rule',
        'repetition': 'by threefold repetition',
        'agreement': 'by agreement'
      };
      messageText = reasons[result.reason] || '';
    } else {
      const playerWon = (result.winner === gameState.playerColor) || 
                        (gameConfig.opponentType === 'LOCAL');
      
      if (gameConfig.opponentType === 'LOCAL') {
        iconText = result.winner === 'w' ? '♔' : '♚';
        resultText = result.winner === 'w' ? 'White Wins!' : 'Black Wins!';
      } else {
        iconText = playerWon ? '🏆' : '😔';
        resultText = playerWon ? 'You Win!' : 'You Lose';
      }
      
      const reasons = {
        'mate': 'by checkmate',
        'resign': 'by resignation',
        'timeout': 'on time'
      };
      messageText = reasons[result.reason] || '';
    }
    
    icon.textContent = iconText;
    title.textContent = resultText;
    message.textContent = messageText;
    modal.classList.remove('hidden');
    
    // Auto-save game
    saveGame(gameState);
  }
  
  function undoMove() {
    if (!gameState || gameConfig.opponentType !== 'LOCAL') return;
    
    const undone = gameState.chess.undo();
    if (undone) {
      gameState.lastMove = gameState.chess.moveHistory[gameState.chess.moveHistory.length - 1] || null;
      updateGameDisplay();
    }
  }
  
  function offerDraw() {
    if (!gameState || gameState.result) return;
    
    if (gameConfig.opponentType === 'LOCAL') {
      showConfirm('Offer Draw', 'Do both players agree to a draw?', () => {
        endGame({ outcome: '1/2-1/2', reason: 'agreement' });
      });
    } else {
      // For AI, randomly accept/decline based on position
      const eval_ = ChessAI.evaluate(gameState.chess);
      const aiColor = gameState.playerColor === 'w' ? 'b' : 'w';
      const aiAdvantage = aiColor === 'w' ? eval_ > 100 : eval_ < -100;
      
      if (aiAdvantage) {
        showToast('AI declined the draw offer');
      } else {
        endGame({ outcome: '1/2-1/2', reason: 'agreement' });
      }
    }
  }
  
  function resign() {
    if (!gameState || gameState.result) return;
    
    showConfirm('Resign', 'Are you sure you want to resign?', () => {
      const winner = gameConfig.opponentType === 'LOCAL' 
        ? (gameState.chess.turn === 'w' ? 'b' : 'w')
        : (gameState.playerColor === 'w' ? 'b' : 'w');
      
      endGame({
        outcome: winner === 'w' ? '1-0' : '0-1',
        reason: 'resign',
        winner
      });
    });
  }
  
  // ===== Review Screen =====
  
  function renderReviewScreen() {
    if (!reviewState) return '';
    
    const { chess, moveIndex, metadata } = reviewState;
    
    return `
      <div class="screen review-screen">
        <div class="screen-header">
          <button class="back-btn" onclick="App.goHome()">←</button>
          <h1 class="screen-title">Review Game</h1>
        </div>
        
        <div class="review-board-container">
          <div class="chess-board review-board" id="review-board"></div>
        </div>
        
        <div class="review-timeline">
          <input type="range" class="timeline-slider" min="0" max="${chess.moveHistory.length}" 
                 value="${moveIndex}" oninput="App.jumpToMove(parseInt(this.value))">
          <div class="timeline-controls">
            <button class="timeline-btn" onclick="App.jumpToMove(0)">⏮</button>
            <button class="timeline-btn" onclick="App.stepBack()">◀</button>
            <button class="timeline-btn" onclick="App.stepForward()">▶</button>
            <button class="timeline-btn" onclick="App.jumpToMove(${chess.moveHistory.length})">⏭</button>
          </div>
        </div>
        
        <div class="review-info">
          <div class="review-info-row">
            <span class="review-info-label">Move</span>
            <span>${moveIndex} / ${chess.moveHistory.length}</span>
          </div>
          <div class="review-info-row">
            <span class="review-info-label">FEN</span>
            <span style="font-size: 11px; word-break: break-all;">${reviewState.displayChess.fen()}</span>
          </div>
          ${metadata ? `
            <div class="review-info-row">
              <span class="review-info-label">Date</span>
              <span>${new Date(metadata.date).toLocaleDateString()}</span>
            </div>
          ` : ''}
        </div>
        
        <button class="export-btn" onclick="App.exportPGN()">
          Export PGN
        </button>
      </div>
    `;
  }
  
  function initReviewBoard() {
    renderReviewBoard();
  }
  
  function renderReviewBoard() {
    const board = document.getElementById('review-board');
    if (!board || !reviewState) return;
    
    const board2D = reviewState.displayChess.board2D();
    const lastMove = reviewState.moveIndex > 0 ? reviewState.chess.moveHistory[reviewState.moveIndex - 1] : null;
    
    let html = '';
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = board2D[row][col];
        const square = cell.square;
        
        let classes = ['square', cell.isLight ? 'light' : 'dark'];
        
        if (lastMove && (lastMove.from === square || lastMove.to === square)) {
          classes.push('last-move');
        }
        
        html += `<div class="${classes.join(' ')}">`;
        
        if (cell.piece) {
          html += `<span class="piece">${cell.piece.unicode}</span>`;
        }
        
        html += '</div>';
      }
    }
    
    board.innerHTML = html;
  }
  
  function jumpToMove(index) {
    if (!reviewState) return;
    
    reviewState.moveIndex = Math.max(0, Math.min(index, reviewState.chess.moveHistory.length));
    
    // Recreate position at this move
    reviewState.displayChess = new Chess();
    for (let i = 0; i < reviewState.moveIndex; i++) {
      reviewState.displayChess.move(reviewState.chess.moveHistory[i]);
    }
    
    renderReviewBoard();
    
    // Update slider
    const slider = document.querySelector('.timeline-slider');
    if (slider) slider.value = reviewState.moveIndex;
    
    // Update move counter
    const infoRows = document.querySelectorAll('.review-info-row');
    if (infoRows[0]) {
      infoRows[0].querySelector('span:last-child').textContent = 
        `${reviewState.moveIndex} / ${reviewState.chess.moveHistory.length}`;
    }
    if (infoRows[1]) {
      infoRows[1].querySelector('span:last-child').textContent = reviewState.displayChess.fen();
    }
  }
  
  function stepBack() {
    if (reviewState && reviewState.moveIndex > 0) {
      jumpToMove(reviewState.moveIndex - 1);
    }
  }
  
  function stepForward() {
    if (reviewState && reviewState.moveIndex < reviewState.chess.moveHistory.length) {
      jumpToMove(reviewState.moveIndex + 1);
    }
  }
  
  function exportPGN() {
    if (!reviewState) return;
    
    const pgn = reviewState.chess.pgn(reviewState.metadata || {});
    
    // Copy to clipboard
    navigator.clipboard.writeText(pgn).then(() => {
      showToast('PGN copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback: show in alert
      prompt('Copy the PGN:', pgn);
    });
  }
  
  // ===== Saved Games Screen =====
  
  function renderSavedScreen() {
    return `
      <div class="screen saved-screen">
        <div class="screen-header">
          <button class="back-btn" onclick="App.goHome()">←</button>
          <h1 class="screen-title">Saved Games</h1>
        </div>
        
        <div class="search-bar">
          <span>🔍</span>
          <input type="text" placeholder="Search games..." oninput="App.filterGames(this.value)">
        </div>
        
        <div class="saved-games-list" id="saved-games-list">
          ${renderSavedGamesList(savedGames)}
        </div>
      </div>
    `;
  }
  
  function renderSavedGamesList(games) {
    if (games.length === 0) {
      return `
        <div class="empty-state">
          <div class="icon">📁</div>
          <p>No saved games yet</p>
        </div>
      `;
    }
    
    return games.map((game, index) => `
      <div class="saved-game-card" onclick="App.loadSavedGame(${index})">
        <div class="game-preview">
          ${renderMiniBoard()}
        </div>
        <div class="game-info">
          <div class="game-title">${game.metadata?.white || 'White'} vs ${game.metadata?.black || 'Black'}</div>
          <div class="game-meta">
            ${new Date(game.metadata?.date || Date.now()).toLocaleDateString()}
            • ${game.moveCount || 0} moves
          </div>
          <span class="game-result-badge ${getResultClass(game.result)}">${game.result?.outcome || 'In Progress'}</span>
        </div>
        <div class="game-card-actions">
          <button class="icon-btn" onclick="event.stopPropagation(); App.deleteSavedGame(${index})">🗑</button>
        </div>
      </div>
    `).join('');
  }
  
  function renderMiniBoard() {
    let html = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const isLight = (r + c) % 2 === 1;
        html += `<div class="mini-square ${isLight ? 'light' : 'dark'}"></div>`;
      }
    }
    return html;
  }
  
  function getResultClass(result) {
    if (!result) return '';
    if (result.outcome === '1-0') return 'win';
    if (result.outcome === '0-1') return 'loss';
    return 'draw';
  }
  
  function filterGames(query) {
    const list = document.getElementById('saved-games-list');
    const filtered = savedGames.filter(g => {
      const search = query.toLowerCase();
      return (g.metadata?.white || '').toLowerCase().includes(search) ||
             (g.metadata?.black || '').toLowerCase().includes(search);
    });
    list.innerHTML = renderSavedGamesList(filtered);
  }
  
  function loadSavedGame(index) {
    const game = savedGames[index];
    if (!game) return;
    
    const chess = new Chess();
    chess.loadPgn(game.pgn);
    
    reviewState = {
      chess,
      displayChess: new Chess(),
      moveIndex: 0,
      metadata: game.metadata
    };
    
    renderScreen('review');
  }
  
  function deleteSavedGame(index) {
    showConfirm('Delete Game', 'Are you sure you want to delete this game?', () => {
      savedGames.splice(index, 1);
      saveSavedGames();
      renderScreen('saved');
    });
  }
  
  // ===== Settings Screen =====
  
  function renderSettingsScreen() {
    return `
      <div class="screen settings-screen">
        <div class="screen-header">
          <button class="back-btn" onclick="App.goHome()">←</button>
          <h1 class="screen-title">Settings</h1>
        </div>
        
        <div class="settings-group">
          <div class="settings-group-title">Display</div>
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon">📍</div>
              <span>Show Coordinates</span>
            </div>
            <div class="toggle ${settings.showCoordinates ? 'active' : ''}"
                 onclick="App.toggleSetting('showCoordinates')"></div>
          </div>
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon">🔊</div>
              <span>Sound Effects</span>
            </div>
            <div class="toggle ${settings.soundEnabled ? 'active' : ''}"
                 onclick="App.toggleSetting('soundEnabled')"></div>
          </div>
        </div>
        
        <div class="settings-group">
          <div class="settings-group-title">Data</div>
          <div class="settings-item" onclick="App.clearAllData()">
            <div class="settings-item-left">
              <div class="settings-icon">🗑</div>
              <span>Clear All Data</span>
            </div>
            <span style="color: var(--accent-red)">›</span>
          </div>
        </div>
        
        <div class="settings-group">
          <div class="settings-group-title">About</div>
          <div class="settings-item">
            <div class="settings-item-left">
              <div class="settings-icon">ℹ</div>
              <span>Version</span>
            </div>
            <span style="color: var(--text-secondary)">1.0.0</span>
          </div>
        </div>
      </div>
    `;
  }
  
  function toggleSetting(key) {
    settings[key] = !settings[key];
    saveSettings();
    renderScreen('settings');
  }
  
  function clearAllData() {
    showConfirm('Clear All Data', 'This will delete all saved games and settings. Continue?', () => {
      localStorage.removeItem('chess_saved_games');
      localStorage.removeItem('chess_settings');
      savedGames = [];
      settings = { showCoordinates: true, flipBoard: false, soundEnabled: true, theme: 'wood' };
      showToast('All data cleared', 'success');
      renderScreen('settings');
    });
  }
  
  // ===== Game Management =====
  
  function startGame() {
    // Determine player color
    let playerColor = gameConfig.side;
    if (playerColor === 'random') {
      playerColor = Math.random() < 0.5 ? 'w' : 'b';
    }
    
    // Initialize game state
    const chess = new Chess();
    
    gameState = {
      id: Date.now().toString(),
      chess,
      playerColor,
      lastMove: null,
      result: null,
      isAIThinking: false,
      clocks: gameConfig.timeControl ? {
        w: gameConfig.timeControl.initial,
        b: gameConfig.timeControl.initial
      } : null,
      metadata: {
        white: playerColor === 'w' ? 'You' : (gameConfig.opponentType === 'AI' ? `AI Lvl ${gameConfig.aiLevel}` : 'Player 2'),
        black: playerColor === 'b' ? 'You' : (gameConfig.opponentType === 'AI' ? `AI Lvl ${gameConfig.aiLevel}` : 'Player 2'),
        date: new Date().toISOString(),
        event: 'Chess App Game'
      }
    };
    
    renderScreen('game');
    
    // If player is black and playing AI, trigger AI move
    if (gameConfig.opponentType === 'AI' && playerColor === 'b') {
      setTimeout(requestAIMove, 500);
    }
  }
  
  function continueGame() {
    if (gameState) {
      renderScreen('game');
    }
  }
  
  function saveCurrentGame() {
    if (!gameState) return;
    
    saveGame(gameState);
    showToast('Game saved!', 'success');
  }
  
  function saveGame(state) {
    const gameData = {
      pgn: state.chess.pgn(state.metadata),
      metadata: state.metadata,
      result: state.result,
      moveCount: state.chess.moveHistory.length,
      savedAt: Date.now()
    };
    
    // Check if already saved (update) or new
    const existingIndex = savedGames.findIndex(g => g.metadata?.date === state.metadata?.date);
    if (existingIndex >= 0) {
      savedGames[existingIndex] = gameData;
    } else {
      savedGames.unshift(gameData);
    }
    
    saveSavedGames();
  }
  
  function reviewGame() {
    const modal = document.getElementById('result-modal');
    modal.classList.add('hidden');
    
    if (!gameState) return;
    
    reviewState = {
      chess: gameState.chess.copy(),
      displayChess: new Chess(),
      moveIndex: 0,
      metadata: gameState.metadata
    };
    
    renderScreen('review');
  }
  
  // ===== Storage =====
  
  function loadSavedGames() {
    try {
      const data = localStorage.getItem('chess_saved_games');
      savedGames = data ? JSON.parse(data) : [];
    } catch (e) {
      savedGames = [];
    }
  }
  
  function saveSavedGames() {
    try {
      localStorage.setItem('chess_saved_games', JSON.stringify(savedGames));
    } catch (e) {
      console.error('Failed to save games:', e);
    }
  }
  
  function loadSettings() {
    try {
      const data = localStorage.getItem('chess_settings');
      if (data) {
        settings = { ...settings, ...JSON.parse(data) };
      }
    } catch (e) {
      // Use defaults
    }
  }
  
  function saveSettings() {
    try {
      localStorage.setItem('chess_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }
  
  // ===== Utilities =====
  
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
  
  function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    
    document.getElementById('confirm-cancel').onclick = () => {
      modal.classList.add('hidden');
    };
    
    document.getElementById('confirm-ok').onclick = () => {
      modal.classList.add('hidden');
      onConfirm();
    };
    
    modal.classList.remove('hidden');
  }
  
  function toggleFlip() {
    settings.flipBoard = !settings.flipBoard;
    renderBoard();
  }
  
  function showGameMenu() {
    // Could show a dropdown menu - for now just toggle flip
    toggleFlip();
  }
  
  // ===== Navigation =====
  
  function goHome() {
    stopClocks();
    renderScreen('home');
  }
  
  function showNewGame() {
    renderScreen('newGame');
  }
  
  function showSaved() {
    renderScreen('saved');
  }
  
  function showSettings() {
    renderScreen('settings');
  }
  
  function setConfig(key, value) {
    gameConfig[key] = value;
    renderScreen('newGame');
  }
  
  function setTimeControl(tc) {
    gameConfig.timeControl = tc;
    renderScreen('newGame');
  }
  
  // Initialize on load
  document.addEventListener('DOMContentLoaded', init);
  
  // Public API
  return {
    init,
    goHome,
    showNewGame,
    showSaved,
    showSettings,
    setConfig,
    setTimeControl,
    startGame,
    continueGame,
    undoMove,
    offerDraw,
    resign,
    saveCurrentGame,
    reviewGame,
    toggleFlip,
    showGameMenu,
    selectPromotion,
    jumpToMove,
    stepBack,
    stepForward,
    exportPGN,
    loadSavedGame,
    deleteSavedGame,
    filterGames,
    toggleSetting,
    clearAllData
  };
})();
