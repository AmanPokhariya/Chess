const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

// Track captured pieces
let capturedByWhite = []; // black pieces captured by white
let capturedByBlack = []; // white pieces captured by black

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowindex, col: squareindex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });
                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                });

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", function (e) {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", function (e) {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSource = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSource);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });
    if (playerRole === "b") {
        boardElement.classList.add("flipped");

    } else {
        boardElement.classList.remove("flipped");
    }
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q",
    };
    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♟",
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",
    };

    const character = unicodePieces[piece.type] || "";
    // Append variation selector \uFE0E to prevent browser from rendering it as a colored emoji
    return character + "\uFE0E";
};

// Render captured pieces into the side panel
const renderCapturedPieces = () => {
    const whitePannel = document.getElementById("captured-by-white");
    const blackPanel  = document.getElementById("captured-by-black");

    if (whitePannel) {
        // White captured BLACK pieces → show black colored pieces
        whitePannel.innerHTML = capturedByWhite
            .map(p => `<span class="cap-piece" style="color:black; filter:drop-shadow(0 1px 2px rgba(255,255,255,0.4))">${getPieceUnicode({ type: p })}</span>`)
            .join("");
    }

    if (blackPanel) {
        // Black captured WHITE pieces → show white colored pieces
        blackPanel.innerHTML = capturedByBlack
            .map(p => `<span class="cap-piece" style="color:white; filter:drop-shadow(0 1px 2px rgba(0,0,0,0.9))">${getPieceUnicode({ type: p })}</span>`)
            .join("");
    }
};

socket.on("playerRole", function (role) {
    playerRole = role;
    renderBoard();
});
socket.on("spectatorRole", function () {
    playerRole = null;
    renderBoard();
})
socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
})

socket.on("move", function (move) {
    const result = chess.move(move);
    // If a piece was captured, add it to the correct graveyard
    if (result && result.captured) {
        if (result.color === "w") {
            // White made the move → captured a black piece
            capturedByWhite.push(result.captured);
        } else {
            // Black made the move → captured a white piece
            capturedByBlack.push(result.captured);
        }
        renderCapturedPieces();
    }
    renderBoard();
})

renderBoard();


