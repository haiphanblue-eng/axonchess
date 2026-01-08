/**
 * Chess Engine - Full rules implementation with Stockfish AI
 * Supports: legal moves, check/checkmate/stalemate, castling, en passant, promotion
 * Draw detection: insufficient material, 50-move rule, threefold repetition
 * AI: Stockfish.js WebAssembly engine
 */

const ChessEngine = (function() {
  // Piece constants
  const PIECES = {
    KING: 'k', QUEEN: 'q', ROOK: 'r', BISHOP: 'b', KNIGHT: 'n', PAWN: 'p'
  };
  
  const COLORS = { WHITE: 'w', BLACK: 'b' };
  
  // Unicode pieces for display
  // Using filled pieces (♚♛♜♝♞♟) for both colors - CSS will handle the coloring
  const PIECE_UNICODE = {
    'wK': '♚', 'wQ': '♛', 'wR': '♜', 'wB': '♝', 'wN': '♞', 'wP': '♟',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
  };
  
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
  
  // Starting position FEN
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  class Chess {
    constructor(fen = STARTING_FEN) {
      this.reset();
      if (fen !== STARTING_FEN) {
        this.loadFen(fen);
      }
    }
    
    reset() {
      this.board = this.createEmptyBoard();
      this.turn = COLORS.WHITE;
      this.castling = { K: true, Q: true, k: true, q: true };
      this.enPassant = null;
      this.halfMoves = 0;
      this.fullMoves = 1;
      this.moveHistory = [];
      this.positionHistory = [];
      this.loadFen(STARTING_FEN);
    }
    
    createEmptyBoard() {
      return Array(8).fill(null).map(() => Array(8).fill(null));
    }
    
    algebraicToIndex(square) {
      if (!square || square.length !== 2) return null;
      const file = FILES.indexOf(square[0]);
      const rank = parseInt(square[1]) - 1;
      if (file === -1 || rank < 0 || rank > 7) return null;
      return { row: 7 - rank, col: file };
    }
    
    indexToAlgebraic(row, col) {
      return FILES[col] + RANKS[7 - row];
    }
    
    get(square) {
      const idx = this.algebraicToIndex(square);
      if (!idx) return null;
      return this.board[idx.row][idx.col];
    }
    
    put(piece, square) {
      const idx = this.algebraicToIndex(square);
      if (!idx) return false;
      this.board[idx.row][idx.col] = piece;
      return true;
    }
    
    remove(square) {
      const idx = this.algebraicToIndex(square);
      if (!idx) return null;
      const piece = this.board[idx.row][idx.col];
      this.board[idx.row][idx.col] = null;
      return piece;
    }
    
    loadFen(fen) {
      const parts = fen.split(' ');
      const position = parts[0];
      
      this.board = this.createEmptyBoard();
      
      let row = 0, col = 0;
      for (const char of position) {
        if (char === '/') {
          row++;
          col = 0;
        } else if (/[1-8]/.test(char)) {
          col += parseInt(char);
        } else {
          const color = char === char.toUpperCase() ? COLORS.WHITE : COLORS.BLACK;
          const type = char.toLowerCase();
          this.board[row][col] = { type, color };
          col++;
        }
      }
      
      this.turn = parts[1] === 'b' ? COLORS.BLACK : COLORS.WHITE;
      
      const castlingStr = parts[2] || 'KQkq';
      this.castling = {
        K: castlingStr.includes('K'),
        Q: castlingStr.includes('Q'),
        k: castlingStr.includes('k'),
        q: castlingStr.includes('q')
      };
      
      this.enPassant = parts[3] !== '-' ? parts[3] : null;
      this.halfMoves = parseInt(parts[4]) || 0;
      this.fullMoves = parseInt(parts[5]) || 1;
      this.positionHistory = [this.getPositionKey()];
    }
    
    fen() {
      let fen = '';
      
      for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece) {
            if (emptyCount > 0) {
              fen += emptyCount;
              emptyCount = 0;
            }
            const char = piece.color === COLORS.WHITE ? piece.type.toUpperCase() : piece.type;
            fen += char;
          } else {
            emptyCount++;
          }
        }
        if (emptyCount > 0) fen += emptyCount;
        if (row < 7) fen += '/';
      }
      
      fen += ' ' + this.turn;
      
      let castling = '';
      if (this.castling.K) castling += 'K';
      if (this.castling.Q) castling += 'Q';
      if (this.castling.k) castling += 'k';
      if (this.castling.q) castling += 'q';
      fen += ' ' + (castling || '-');
      
      fen += ' ' + (this.enPassant || '-');
      fen += ' ' + this.halfMoves + ' ' + this.fullMoves;
      
      return fen;
    }
    
    getPositionKey() {
      let key = '';
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece) {
            key += piece.color + piece.type + row + col;
          }
        }
      }
      key += this.turn;
      key += JSON.stringify(this.castling);
      key += this.enPassant || '';
      return key;
    }
    
    findKing(color) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece && piece.type === PIECES.KING && piece.color === color) {
            return { row, col };
          }
        }
      }
      return null;
    }
    
    isSquareAttacked(row, col, byColor) {
      // Knight attacks
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightMoves) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const piece = this.board[r][c];
          if (piece && piece.type === PIECES.KNIGHT && piece.color === byColor) {
            return true;
          }
        }
      }
      
      // King attacks
      const kingMoves = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1]
      ];
      for (const [dr, dc] of kingMoves) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const piece = this.board[r][c];
          if (piece && piece.type === PIECES.KING && piece.color === byColor) {
            return true;
          }
        }
      }
      
      // Pawn attacks
      const pawnDir = byColor === COLORS.WHITE ? 1 : -1;
      for (const dc of [-1, 1]) {
        const r = row + pawnDir, c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const piece = this.board[r][c];
          if (piece && piece.type === PIECES.PAWN && piece.color === byColor) {
            return true;
          }
        }
      }
      
      // Sliding pieces
      const directions = [
        { dr: -1, dc: 0, pieces: [PIECES.ROOK, PIECES.QUEEN] },
        { dr: 1, dc: 0, pieces: [PIECES.ROOK, PIECES.QUEEN] },
        { dr: 0, dc: -1, pieces: [PIECES.ROOK, PIECES.QUEEN] },
        { dr: 0, dc: 1, pieces: [PIECES.ROOK, PIECES.QUEEN] },
        { dr: -1, dc: -1, pieces: [PIECES.BISHOP, PIECES.QUEEN] },
        { dr: -1, dc: 1, pieces: [PIECES.BISHOP, PIECES.QUEEN] },
        { dr: 1, dc: -1, pieces: [PIECES.BISHOP, PIECES.QUEEN] },
        { dr: 1, dc: 1, pieces: [PIECES.BISHOP, PIECES.QUEEN] }
      ];
      
      for (const { dr, dc, pieces } of directions) {
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const piece = this.board[r][c];
          if (piece) {
            if (piece.color === byColor && pieces.includes(piece.type)) {
              return true;
            }
            break;
          }
          r += dr;
          c += dc;
        }
      }
      
      return false;
    }
    
    inCheck() {
      const king = this.findKing(this.turn);
      if (!king) return false;
      const enemyColor = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      return this.isSquareAttacked(king.row, king.col, enemyColor);
    }
    
    generatePieceMoves(row, col) {
      const piece = this.board[row][col];
      if (!piece) return [];
      
      const moves = [];
      const { type, color } = piece;
      
      const addMove = (toRow, toCol, flags = {}) => {
        if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
          const target = this.board[toRow][toCol];
          if (!target || target.color !== color) {
            moves.push({
              from: this.indexToAlgebraic(row, col),
              to: this.indexToAlgebraic(toRow, toCol),
              piece: type,
              color,
              captured: target ? target.type : null,
              ...flags
            });
          }
        }
      };
      
      switch (type) {
        case PIECES.PAWN: {
          const dir = color === COLORS.WHITE ? -1 : 1;
          const startRow = color === COLORS.WHITE ? 6 : 1;
          const promotionRow = color === COLORS.WHITE ? 0 : 7;
          
          if (!this.board[row + dir]?.[col]) {
            if (row + dir === promotionRow) {
              for (const promo of [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT]) {
                addMove(row + dir, col, { promotion: promo });
              }
            } else {
              addMove(row + dir, col);
              if (row === startRow && !this.board[row + 2 * dir][col]) {
                addMove(row + 2 * dir, col, { doublePawn: true });
              }
            }
          }
          
          for (const dc of [-1, 1]) {
            const toCol = col + dc;
            if (toCol >= 0 && toCol < 8) {
              const target = this.board[row + dir][toCol];
              if (target && target.color !== color) {
                if (row + dir === promotionRow) {
                  for (const promo of [PIECES.QUEEN, PIECES.ROOK, PIECES.BISHOP, PIECES.KNIGHT]) {
                    addMove(row + dir, toCol, { promotion: promo });
                  }
                } else {
                  addMove(row + dir, toCol);
                }
              }
              const epSquare = this.indexToAlgebraic(row + dir, toCol);
              if (this.enPassant === epSquare) {
                addMove(row + dir, toCol, { enPassant: true, captured: PIECES.PAWN });
              }
            }
          }
          break;
        }
        
        case PIECES.KNIGHT: {
          const offsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
          for (const [dr, dc] of offsets) {
            addMove(row + dr, col + dc);
          }
          break;
        }
        
        case PIECES.BISHOP: {
          const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
          for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
              const target = this.board[r][c];
              addMove(r, c);
              if (target) break;
              r += dr;
              c += dc;
            }
          }
          break;
        }
        
        case PIECES.ROOK: {
          const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
              const target = this.board[r][c];
              addMove(r, c);
              if (target) break;
              r += dr;
              c += dc;
            }
          }
          break;
        }
        
        case PIECES.QUEEN: {
          const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
          for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
              const target = this.board[r][c];
              addMove(r, c);
              if (target) break;
              r += dr;
              c += dc;
            }
          }
          break;
        }
        
        case PIECES.KING: {
          const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
          for (const [dr, dc] of directions) {
            addMove(row + dr, col + dc);
          }
          
          const enemyColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
          const kingRow = color === COLORS.WHITE ? 7 : 0;
          
          if (row === kingRow && col === 4 && !this.isSquareAttacked(row, col, enemyColor)) {
            const canKingside = color === COLORS.WHITE ? this.castling.K : this.castling.k;
            if (canKingside &&
                !this.board[row][5] && !this.board[row][6] &&
                !this.isSquareAttacked(row, 5, enemyColor) &&
                !this.isSquareAttacked(row, 6, enemyColor)) {
              moves.push({
                from: this.indexToAlgebraic(row, col),
                to: this.indexToAlgebraic(row, 6),
                piece: type,
                color,
                castling: 'k'
              });
            }
            
            const canQueenside = color === COLORS.WHITE ? this.castling.Q : this.castling.q;
            if (canQueenside &&
                !this.board[row][1] && !this.board[row][2] && !this.board[row][3] &&
                !this.isSquareAttacked(row, 2, enemyColor) &&
                !this.isSquareAttacked(row, 3, enemyColor)) {
              moves.push({
                from: this.indexToAlgebraic(row, col),
                to: this.indexToAlgebraic(row, 2),
                piece: type,
                color,
                castling: 'q'
              });
            }
          }
          break;
        }
      }
      
      return moves;
    }
    
    moves(options = {}) {
      const allMoves = [];
      const square = options.square;
      
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece && piece.color === this.turn) {
            const squareNotation = this.indexToAlgebraic(row, col);
            if (square && square !== squareNotation) continue;
            
            const pieceMoves = this.generatePieceMoves(row, col);
            for (const move of pieceMoves) {
              if (this.isLegalMove(move)) {
                allMoves.push(move);
              }
            }
          }
        }
      }
      
      return allMoves;
    }
    
    isLegalMove(move) {
      const backup = this.makeTemporaryMove(move);
      const king = this.findKing(move.color);
      const enemyColor = move.color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      const inCheck = king ? this.isSquareAttacked(king.row, king.col, enemyColor) : true;
      this.undoTemporaryMove(backup);
      return !inCheck;
    }
    
    makeTemporaryMove(move) {
      const fromIdx = this.algebraicToIndex(move.from);
      const toIdx = this.algebraicToIndex(move.to);
      
      const backup = {
        board: JSON.parse(JSON.stringify(this.board)),
        castling: { ...this.castling },
        enPassant: this.enPassant,
        halfMoves: this.halfMoves,
        turn: this.turn
      };
      
      const piece = this.board[fromIdx.row][fromIdx.col];
      this.board[toIdx.row][toIdx.col] = piece;
      this.board[fromIdx.row][fromIdx.col] = null;
      
      if (move.promotion) {
        this.board[toIdx.row][toIdx.col] = { type: move.promotion, color: piece.color };
      }
      
      if (move.enPassant) {
        const capturedRow = piece.color === COLORS.WHITE ? toIdx.row + 1 : toIdx.row - 1;
        this.board[capturedRow][toIdx.col] = null;
      }
      
      if (move.castling) {
        const rookFromCol = move.castling === 'k' ? 7 : 0;
        const rookToCol = move.castling === 'k' ? 5 : 3;
        this.board[toIdx.row][rookToCol] = this.board[toIdx.row][rookFromCol];
        this.board[toIdx.row][rookFromCol] = null;
      }
      
      return backup;
    }
    
    undoTemporaryMove(backup) {
      this.board = backup.board;
      this.castling = backup.castling;
      this.enPassant = backup.enPassant;
      this.halfMoves = backup.halfMoves;
      this.turn = backup.turn;
    }
    
    move(moveInput) {
      let move;
      
      if (typeof moveInput === 'string') {
        move = this.findMoveFromSan(moveInput);
      } else {
        const legalMoves = this.moves({ square: moveInput.from });
        move = legalMoves.find(m => 
          m.to === moveInput.to && 
          (!moveInput.promotion || m.promotion === moveInput.promotion)
        );
      }
      
      if (!move) return null;
      
      const fromIdx = this.algebraicToIndex(move.from);
      const toIdx = this.algebraicToIndex(move.to);
      const piece = this.board[fromIdx.row][fromIdx.col];
      
      const historyEntry = {
        ...move,
        san: this.moveToSan(move),
        fen_before: this.fen(),
        timestamp: Date.now()
      };
      
      if (piece.type === PIECES.PAWN || move.captured) {
        this.halfMoves = 0;
      } else {
        this.halfMoves++;
      }
      
      if (this.turn === COLORS.BLACK) {
        this.fullMoves++;
      }
      
      this.board[toIdx.row][toIdx.col] = piece;
      this.board[fromIdx.row][fromIdx.col] = null;
      
      if (move.promotion) {
        this.board[toIdx.row][toIdx.col] = { type: move.promotion, color: piece.color };
      }
      
      if (move.enPassant) {
        const capturedRow = piece.color === COLORS.WHITE ? toIdx.row + 1 : toIdx.row - 1;
        this.board[capturedRow][toIdx.col] = null;
      }
      
      if (move.castling) {
        const row = toIdx.row;
        const rookFromCol = move.castling === 'k' ? 7 : 0;
        const rookToCol = move.castling === 'k' ? 5 : 3;
        this.board[row][rookToCol] = this.board[row][rookFromCol];
        this.board[row][rookFromCol] = null;
      }
      
      if (move.doublePawn) {
        const epRow = piece.color === COLORS.WHITE ? toIdx.row + 1 : toIdx.row - 1;
        this.enPassant = this.indexToAlgebraic(epRow, toIdx.col);
      } else {
        this.enPassant = null;
      }
      
      if (piece.type === PIECES.KING) {
        if (piece.color === COLORS.WHITE) {
          this.castling.K = false;
          this.castling.Q = false;
        } else {
          this.castling.k = false;
          this.castling.q = false;
        }
      }
      if (piece.type === PIECES.ROOK) {
        if (move.from === 'a1') this.castling.Q = false;
        if (move.from === 'h1') this.castling.K = false;
        if (move.from === 'a8') this.castling.q = false;
        if (move.from === 'h8') this.castling.k = false;
      }
      if (move.to === 'a1') this.castling.Q = false;
      if (move.to === 'h1') this.castling.K = false;
      if (move.to === 'a8') this.castling.q = false;
      if (move.to === 'h8') this.castling.k = false;
      
      this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      
      this.moveHistory.push(historyEntry);
      this.positionHistory.push(this.getPositionKey());
      
      return historyEntry;
    }
    
    moveToSan(move) {
      if (move.castling === 'k') return 'O-O';
      if (move.castling === 'q') return 'O-O-O';
      
      let san = '';
      
      if (move.piece !== PIECES.PAWN) {
        san += move.piece.toUpperCase();
        
        const similarMoves = this.moves().filter(m => 
          m.piece === move.piece && m.to === move.to && m.from !== move.from
        );
        if (similarMoves.length > 0) {
          const fromIdx = this.algebraicToIndex(move.from);
          const sameFile = similarMoves.some(m => this.algebraicToIndex(m.from).col === fromIdx.col);
          const sameRank = similarMoves.some(m => this.algebraicToIndex(m.from).row === fromIdx.row);
          
          if (!sameFile) {
            san += move.from[0];
          } else if (!sameRank) {
            san += move.from[1];
          } else {
            san += move.from;
          }
        }
      }
      
      if (move.captured) {
        if (move.piece === PIECES.PAWN) {
          san += move.from[0];
        }
        san += 'x';
      }
      
      san += move.to;
      
      if (move.promotion) {
        san += '=' + move.promotion.toUpperCase();
      }
      
      const backup = this.makeTemporaryMove(move);
      this.turn = this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
      
      if (this.inCheck()) {
        if (this.isCheckmate()) {
          san += '#';
        } else {
          san += '+';
        }
      }
      
      this.undoTemporaryMove(backup);
      
      return san;
    }
    
    findMoveFromSan(san) {
      const moves = this.moves();
      for (const move of moves) {
        if (this.moveToSan(move).replace(/[+#]/g, '') === san.replace(/[+#]/g, '')) {
          return move;
        }
      }
      return null;
    }
    
    undo() {
      if (this.moveHistory.length === 0) return null;
      
      const lastMove = this.moveHistory.pop();
      this.positionHistory.pop();
      
      this.loadFen(lastMove.fen_before);
      this.moveHistory = this.moveHistory.slice();
      this.positionHistory = this.positionHistory.slice();
      
      return lastMove;
    }
    
    isCheckmate() {
      return this.inCheck() && this.moves().length === 0;
    }
    
    isStalemate() {
      return !this.inCheck() && this.moves().length === 0;
    }
    
    isDraw() {
      return this.isStalemate() || 
             this.isInsufficientMaterial() || 
             this.isFiftyMoveRule() || 
             this.isThreefoldRepetition();
    }
    
    isInsufficientMaterial() {
      const pieces = { w: [], b: [] };
      
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = this.board[row][col];
          if (piece && piece.type !== PIECES.KING) {
            pieces[piece.color].push({ type: piece.type, row, col });
          }
        }
      }
      
      const whitePieces = pieces.w;
      const blackPieces = pieces.b;
      
      if (whitePieces.length === 0 && blackPieces.length === 0) return true;
      
      if (whitePieces.length === 0 && blackPieces.length === 1) {
        if (blackPieces[0].type === PIECES.BISHOP || blackPieces[0].type === PIECES.KNIGHT) {
          return true;
        }
      }
      if (blackPieces.length === 0 && whitePieces.length === 1) {
        if (whitePieces[0].type === PIECES.BISHOP || whitePieces[0].type === PIECES.KNIGHT) {
          return true;
        }
      }
      
      if (whitePieces.length === 1 && blackPieces.length === 1) {
        if (whitePieces[0].type === PIECES.BISHOP && blackPieces[0].type === PIECES.BISHOP) {
          const wBishopColor = (whitePieces[0].row + whitePieces[0].col) % 2;
          const bBishopColor = (blackPieces[0].row + blackPieces[0].col) % 2;
          if (wBishopColor === bBishopColor) return true;
        }
      }
      
      return false;
    }
    
    isFiftyMoveRule() {
      return this.halfMoves >= 100;
    }
    
    isThreefoldRepetition() {
      const currentPosition = this.getPositionKey();
      let count = 0;
      for (const pos of this.positionHistory) {
        if (pos === currentPosition) count++;
        if (count >= 3) return true;
      }
      return false;
    }
    
    isGameOver() {
      return this.isCheckmate() || this.isDraw();
    }
    
    getResult() {
      if (this.isCheckmate()) {
        return {
          outcome: this.turn === COLORS.WHITE ? '0-1' : '1-0',
          reason: 'mate',
          winner: this.turn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE
        };
      }
      if (this.isStalemate()) {
        return { outcome: '1/2-1/2', reason: 'stalemate' };
      }
      if (this.isInsufficientMaterial()) {
        return { outcome: '1/2-1/2', reason: 'insufficient' };
      }
      if (this.isFiftyMoveRule()) {
        return { outcome: '1/2-1/2', reason: '50-move' };
      }
      if (this.isThreefoldRepetition()) {
        return { outcome: '1/2-1/2', reason: 'repetition' };
      }
      return null;
    }
    
    pgn(metadata = {}) {
      const headers = [];
      headers.push(`[Event "${metadata.event || 'Chess Game'}"]`);
      headers.push(`[Site "${metadata.site || 'Chess App'}"]`);
      headers.push(`[Date "${metadata.date || new Date().toISOString().split('T')[0]}"]`);
      headers.push(`[White "${metadata.white || 'White'}"]`);
      headers.push(`[Black "${metadata.black || 'Black'}"]`);
      
      const result = this.getResult();
      headers.push(`[Result "${result ? result.outcome : '*'}"]`);
      
      let moves = '';
      for (let i = 0; i < this.moveHistory.length; i++) {
        if (i % 2 === 0) {
          moves += (i / 2 + 1) + '. ';
        }
        moves += this.moveHistory[i].san + ' ';
      }
      
      if (result) {
        moves += result.outcome;
      }
      
      return headers.join('\n') + '\n\n' + moves.trim();
    }
    
    loadPgn(pgn) {
      this.reset();
      
      const moveText = pgn.replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '').trim();
      const moveTokens = moveText.split(/\s+/).filter(t => 
        t && !t.match(/^\d+\.+$/) && !t.match(/^(1-0|0-1|1\/2-1\/2|\*)$/)
      );
      
      for (const san of moveTokens) {
        const result = this.move(san);
        if (!result) {
          console.error('Invalid move in PGN:', san);
          break;
        }
      }
      
      return true;
    }
    
    board2D() {
      return this.board.map((row, r) => 
        row.map((piece, c) => ({
          square: this.indexToAlgebraic(r, c),
          piece: piece ? {
            type: piece.type,
            color: piece.color,
            unicode: PIECE_UNICODE[piece.color + piece.type.toUpperCase()]
          } : null,
          isLight: (r + c) % 2 === 1
        }))
      );
    }
    
    copy() {
      const chess = new Chess();
      chess.loadFen(this.fen());
      chess.moveHistory = JSON.parse(JSON.stringify(this.moveHistory));
      chess.positionHistory = [...this.positionHistory];
      return chess;
    }
  }
  
  return { Chess, PIECES, COLORS, PIECE_UNICODE, STARTING_FEN };
})();

// ===== Chess AI Engine =====
// Uses minimax with alpha-beta pruning and piece-square tables
// Reliable fallback that works offline without external dependencies
const ChessAI = (function() {
  const { PIECES, COLORS } = ChessEngine;
  
  // Piece values for evaluation
  const PIECE_VALUES = {
    [PIECES.PAWN]: 100,
    [PIECES.KNIGHT]: 320,
    [PIECES.BISHOP]: 330,
    [PIECES.ROOK]: 500,
    [PIECES.QUEEN]: 900,
    [PIECES.KING]: 20000
  };
  
  // Piece-square tables for positional evaluation
  const PST = {
    [PIECES.PAWN]: [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 25, 25, 10,  5,  5],
      [0,  0,  0, 20, 20,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-20,-20, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0]
    ],
    [PIECES.KNIGHT]: [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    [PIECES.BISHOP]: [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5, 10, 10,  5,  0,-10],
      [-10,  5,  5, 10, 10,  5,  5,-10],
      [-10,  0, 10, 10, 10, 10,  0,-10],
      [-10, 10, 10, 10, 10, 10, 10,-10],
      [-10,  5,  0,  0,  0,  0,  5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    [PIECES.ROOK]: [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [5, 10, 10, 10, 10, 10, 10,  5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [0,  0,  0,  5,  5,  0,  0,  0]
    ],
    [PIECES.QUEEN]: [
      [-20,-10,-10, -5, -5,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5,  5,  5,  5,  0,-10],
      [-5,  0,  5,  5,  5,  5,  0, -5],
      [0,  0,  5,  5,  5,  5,  0, -5],
      [-10,  5,  5,  5,  5,  5,  0,-10],
      [-10,  0,  5,  0,  0,  0,  0,-10],
      [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    [PIECES.KING]: [
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [20, 20,  0,  0,  0,  0, 20, 20],
      [20, 30, 10,  0,  0, 10, 30, 20]
    ]
  };
  
  // Level configuration - higher = stronger
  const LEVEL_CONFIG = {
    1: { depth: 1, randomness: 50 },
    2: { depth: 2, randomness: 30 },
    3: { depth: 2, randomness: 15 },
    4: { depth: 3, randomness: 10 },
    5: { depth: 3, randomness: 5 },
    6: { depth: 4, randomness: 3 },
    7: { depth: 4, randomness: 1 },
    8: { depth: 5, randomness: 0 }
  };
  
  function evaluate(chess) {
    let score = 0;
    const board = chess.board;
    
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const pieceValue = PIECE_VALUES[piece.type] || 0;
          const pst = PST[piece.type];
          const pstRow = piece.color === COLORS.WHITE ? row : 7 - row;
          const positionalValue = pst ? pst[pstRow][col] : 0;
          
          const value = pieceValue + positionalValue;
          score += piece.color === COLORS.WHITE ? value : -value;
        }
      }
    }
    
    // Bonus for mobility
    const mobility = chess.moves().length;
    score += chess.turn === COLORS.WHITE ? mobility * 2 : -mobility * 2;
    
    return score;
  }
  
  function minimax(chess, depth, alpha, beta, maximizing) {
    if (depth === 0 || chess.isGameOver()) {
      return evaluate(chess);
    }
    
    const moves = chess.moves();
    
    // Move ordering: captures first for better pruning
    moves.sort((a, b) => {
      const aScore = a.captured ? PIECE_VALUES[a.captured] || 0 : 0;
      const bScore = b.captured ? PIECE_VALUES[b.captured] || 0 : 0;
      return bScore - aScore;
    });
    
    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const chessCopy = chess.copy();
        chessCopy.move(move);
        const evalScore = minimax(chessCopy, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const chessCopy = chess.copy();
        chessCopy.move(move);
        const evalScore = minimax(chessCopy, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
  
  async function getBestMove(chess, level = 3) {
    const startTime = Date.now();
    const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[3];
    const moves = chess.moves();
    
    if (moves.length === 0) return null;
    
    // Add small delay to show "thinking" indicator
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    // Evaluate all moves
    const moveScores = [];
    const maximizing = chess.turn === COLORS.WHITE;
    
    for (const move of moves) {
      const chessCopy = chess.copy();
      chessCopy.move(move);
      const score = minimax(chessCopy, config.depth - 1, -Infinity, Infinity, !maximizing);
      moveScores.push({ move, score });
    }
    
    // Sort by score
    moveScores.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);
    
    // Add randomness for lower levels
    let selectedMove;
    if (config.randomness > 0 && Math.random() * 100 < config.randomness) {
      // Pick a random move from top 3
      const topMoves = moveScores.slice(0, Math.min(3, moveScores.length));
      selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)].move;
    } else {
      selectedMove = moveScores[0].move;
    }
    
    return {
      ...selectedMove,
      think_time_ms: Date.now() - startTime
    };
  }
  
  async function getEvaluation(chess) {
    // Return evaluation in centipawns
    return evaluate(chess);
  }
  
  function init() {
    // No async initialization needed for this engine
    return Promise.resolve(true);
  }
  
  return { getBestMove, init, getEvaluation };
})();
