'use strict';

import * as coordinates from './squareCoordinates.js';
import {redSquares, squareCoordinates} from "./squareCoordinates.js";
const logArea = document.getElementById('log-area');
const YELLOW_START = 26;
const YELLOW_FINISH = 24;
const RED_START = 0;
const RED_FINISH = squareCoordinates.length - 2;
const GREEN_START = 13;
const BLUE_START = 39;

const redPieceElements = [
  document.getElementById('red-1'),
  document.getElementById('red-2'),
  document.getElementById('red-3'),
  document.getElementById('red-4'),
];

const yellowPieceElements = [
  document.getElementById('yellow-1'),
  document.getElementById('yellow-2'),
  document.getElementById('yellow-3'),
  document.getElementById('yellow-4'),
];

const wait = ms => new Promise((resolve => {
  setTimeout(resolve, ms);
}));

const getRandom = (min, max) => Math.floor(Math.random() * (max - min)) + min;

class Piece {
  constructor(squareType, coordinate, element, start, finish) {
    this.squareType = squareType;
    this.coordinate = coordinate;
    this.element = element;
    this.start = start;
    this.finish = finish
    this.clicked = false;
    this.element.onclick = () => {
      this.clicked = true;
    };
  }

  setCoordinates(squareType, coordinate) {
    this.squareType = squareType;
    this.coordinate = coordinate;
  }

  setPosition(pos) {
    this.element.style.left = pos.left + 'px';
    this.element.style.bottom = pos.bottom + 'px';
  }
}

class Logger {
  constructor(element) {
    this.element = element;
    this.element.value = '';
  }

  log(message) {
    this.element.value += message + '\n';
    this.element.scrollTop = this.element.scrollHeight;
  }
}

class GameState {
  constructor() {
    this.positions = {
      red: {
        pos: [
          new Piece('home', 0, redPieceElements[0], RED_START, RED_FINISH),
          new Piece('home', 1, redPieceElements[1], RED_START, RED_FINISH),
          new Piece('home', 2, redPieceElements[2], RED_START, RED_FINISH),
          new Piece('home', 3, redPieceElements[3], RED_START, RED_FINISH),
        ],

        colored: coordinates.redSquares,
        home: coordinates.redHome,
      },

      yellow: {
        pos: [
          new Piece('home', 0, yellowPieceElements[0], YELLOW_START, YELLOW_FINISH),
          new Piece('home', 1, yellowPieceElements[1], YELLOW_START, YELLOW_FINISH),
          new Piece('home', 2, yellowPieceElements[2], YELLOW_START, YELLOW_FINISH),
          new Piece('home', 3, yellowPieceElements[3], YELLOW_START, YELLOW_FINISH),
        ],

        colored: coordinates.yellowSquares,
        home: coordinates.yellowHome,
      },
    }

    this.currentTurn = 'RED';
  }

  render() {
    for (const color in this.positions) {
      const { pos, colored, home } = this.positions[color];
      pos.forEach(piece => {
        if (piece.squareType === 'home') {
          piece.setPosition(home[piece.coordinate]);
        } else if (piece.squareType === 'white') {
          const pieceCoordinate = {};
          Object.assign(pieceCoordinate, squareCoordinates[piece.coordinate]);
          const oppositePieces = color === 'red' ? this.positions.yellow.pos : this.positions.red.pos;

          oppositePieces.forEach(p => {
            if (p.squareType === 'white' && p.coordinate === piece.coordinate) {
              if (color === 'yellow') {
                pieceCoordinate.left -= 20;
              } else {
                pieceCoordinate.left += 20;
              }
            }
          });
          piece.setPosition(pieceCoordinate);
        } else if (piece.squareType === 'colored') {
          piece.setPosition(colored[piece.coordinate]);
        } else if (piece.squareType === 'final') {
          piece.element.style.display = 'none';
        }
      });
    }
  }
}

const getClickedPiece = async pieces => {
  let isNotChosen = true;
  let chosenPiece;

  while (isNotChosen) {
    pieces.forEach(piece => {
      if (piece.clicked) {
        isNotChosen = false;
        chosenPiece = piece;
      }
    });
    await wait(50);
  }

  chosenPiece.clicked = false;
  return chosenPiece;
};

const getFreePieces = (pieces, diceRoll) => {
  const result = [];
  pieces.forEach(piece => {
    if (piece.squareType === 'home' && diceRoll === 6) {
      result.push(piece);
    } else if (piece.squareType === 'white') {
      result.push(piece);
    } else if (piece.squareType === 'colored') {
      if (diceRoll + piece.coordinate <= coordinates.redSquares.length) {
        result.push(piece);
      }
    }
  });

  return result;
};

const calculateMove = (piece, diceRoll, player, pieces, enemyPieces) => {
  let isOver = false;
  let msg;

  if (piece.squareType === 'home') {
    piece.setCoordinates('white', piece.start);
  } else if (piece.squareType === 'white') {
    const coordinate = piece.coordinate + diceRoll;
    if (piece.coordinate <= piece.finish && coordinate > piece.finish) {
      const res = coordinate - piece.finish - 1;
      if (res === redSquares.length) {
        piece.setCoordinates('final', 0);
        const finalCount = pieces.filter(p => p.squareType === 'final').length;
        msg = `${player} scored ${finalCount}/4 pieces!`;
        if (finalCount === 4) isOver = true;
      } else {
        piece.setCoordinates('colored', res);
      }
    } else {
      let result;
      if (coordinate >= squareCoordinates.length) {
        result = coordinate - squareCoordinates.length;
        piece.setCoordinates('white', result);
      } else {
        result = piece.coordinate + diceRoll;
        piece.setCoordinates('white', result);
      }

      const safeZones = [ RED_START, YELLOW_START, BLUE_START, GREEN_START ];

      enemyPieces.forEach((enemy, index) => {
        if (enemy.squareType === 'white' && enemy.coordinate === result && !safeZones.includes(result)) {
          enemy.setCoordinates('home', index);
        }
      });
    }
  } else if (piece.squareType === 'colored') {
    if (diceRoll + piece.coordinate === coordinates.redSquares.length) {
      piece.setCoordinates('final', 0);
      const finalCount = pieces.filter(p => p.squareType === 'final').length;
      msg = `${player} scored ${finalCount}/4 pieces!`;
      if (finalCount === 4) isOver = true;
    } else {
      piece.setCoordinates('colored', piece.coordinate + diceRoll);
    }
  }
  return { isOver, msg };
}

const playerTurn = async gameState => {
  const redPieces = gameState.positions.red.pos;
  const diceRoll = getRandom(1, 7);
  const extraTurn = diceRoll === 6;
  logger.log('Player rolled ' + diceRoll);

  const ableToMove = getFreePieces(redPieces, diceRoll);

  if (ableToMove.length === 0) {
    return { isOver: false, extraTurn };
  }

  let piece;
  if (ableToMove.length === 1) {
    piece = ableToMove[0];
  } else {
    while (true) {
      piece = await getClickedPiece(redPieces);
      if (ableToMove.includes(piece)) break;
    }
  }

  const { isOver, msg } = calculateMove(piece, diceRoll, 'Player',
    redPieces, gameState.positions.yellow.pos);
  if (msg) logger.log(msg);

  return { isOver, extraTurn };
};

const botTurn = gameState => {
  const yellowPieces = gameState.positions.yellow.pos;
  const diceRoll = getRandom(1, 7);
  const extraTurn = diceRoll === 6;
  logger.log('Computer rolled ' + diceRoll);

  const ableToMove = getFreePieces(yellowPieces, diceRoll);

  if (ableToMove.length === 0) {
    return { isOver: false, extraTurn };
  }
  const piece = ableToMove[getRandom(0, ableToMove.length)];

  const { isOver, msg } = calculateMove(piece, diceRoll, 'Computer',
    yellowPieces, gameState.positions.red.pos);
  if (msg) logger.log(msg);

  return { isOver, extraTurn };
};

const game = new GameState();
const logger = new Logger(logArea);
game.render();

(async () => {
  while (true) {
    if (game.currentTurn === 'RED') {
      const { isOver, extraTurn } = await playerTurn(game);
      game.render();

      if (isOver) {
        logger.log('Player won!');
        break;
      }

      if (!extraTurn) {
        game.currentTurn = 'YELLOW';
      }
    } else {
      const { isOver, extraTurn } = await botTurn(game);
      game.render();

      if (isOver) {
        logger.log('Computer won!');
        break;
      }

      if (!extraTurn) {
        game.currentTurn = 'RED';
      }
    }
    await wait(1000);
  }
})();
