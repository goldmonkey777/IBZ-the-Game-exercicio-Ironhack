// Player movement and Sant Antoni mini-game

const player = document.getElementById("player");
let x = 48; // %
let y = 52; // %
const speed = 1.2;

document.addEventListener("keydown", (e) => {
  if (!player) return;

  if (e.key === "ArrowUp") y -= speed;
  if (e.key === "ArrowDown") y += speed;
  if (e.key === "ArrowLeft") x -= speed;
  if (e.key === "ArrowRight") x += speed;

  // clamp 0..100
  x = Math.max(0, Math.min(100, x));
  y = Math.max(0, Math.min(100, y));

  player.style.left = `${x}%`;
  player.style.top = `${y}%`;
});

// Sant Antoni mini-game
const zones = document.querySelectorAll(".zone");

zones.forEach((z) => {
  z.addEventListener("click", () => {
    const zone = z.dataset.zone;
    if (zone === "sunset") {
      startSantAntoniMiniGame();
    } else {
      alert(`You entered the zone: ${zone}`);
    }
  });
});

function startSantAntoniMiniGame() {
  alert("Mini-game: Stay in Sant Antoni for 5 seconds to earn points!");
  let seconds = 5;
  const interval = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      console.log(`${seconds} seconds left...`);
    } else {
      clearInterval(interval);
      alert("Congratulations! You completed the Sant Antoni mini-game!");
    }
  }, 1000);
}

// test
console.log("we need to return a formatted full name when receiving both arguments")
console.log( formatFullName("john", "doe") === "Doe, John" )
console.log( formatFullName("John", "doe") === "Doe, John" )
console.log( formatFullName("JOHN", "DOE") === "Doe, John" )

console.log("if the name includes whitespaces, remove them")
console.log( formatFullName(" john ", "doe") === "Doe, John" )
console.log( formatFullName("  john  ", " DOE ") === "Doe, John" )

console.log("if the user has only first name or last name, format properly")
console.log( formatFullName("john") === "John" )
console.log( formatFullName("", "DOE") === "Doe" )
console.log( formatFullName(undefined, "DOE") === "Doe" )

console.log("if we don't get any names, return null")
console.log( formatFullName() === null )
console.log( formatFullName("", "") === null )
