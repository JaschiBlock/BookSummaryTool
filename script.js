// Local Storage Keys
const LS_KEY = "buchKapitelCounter_v6";

// Element Helper
const el = id => document.getElementById(id);

const textInput = el("textInput");
const charCount = el("charCount");
const goalSpan = el("goal");
const progressSpan = el("progress");
const goalInput = el("goalInput");
const saveGoal = el("saveGoal");

let goal = parseInt(localStorage.getItem(LS_KEY) || "1200", 10);
goalSpan.textContent = goal;
goalInput.value = goal;

// Update counter
function updateStats() {
  const text = textInput.value.replace(/\n/g, "");
  const count = text.length;
  charCount.textContent = count;

  const progress = Math.min(100, Math.round((count / goal) * 100));
  progressSpan.textContent = progress + "%";

  progressSpan.style.color =
    progress >= 100 ? "var(--ok)" :
    progress >= 70 ? "var(--warn)" :
    "var(--danger)";
}

// Event: Eingabe
textInput.addEventListener("input", updateStats);

// Event: Neues Ziel speichern
saveGoal.addEventListener("click", () => {
  goal = parseInt(goalInput.value, 10) || 0;
  goalSpan.textContent = goal;
  localStorage.setItem(LS_KEY, goal);
  updateStats();
});

// Init
updateStats();
