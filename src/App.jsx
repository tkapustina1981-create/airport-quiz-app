import { useState, useEffect } from "react";
import { roles, quizzes } from "./quizData";

const BOT_TOKEN = "8729123239:AAEu0_Gt1BJlTRo9Mc3VfyG5B56fTNwIGfU";
const CHAT_ID = "257422754";

async function sendToTelegram(name, roleLabel, scorePct, correctCount, total, wrong) {
  const passed = scorePct >= 75;
  const emoji = scorePct >= 90 ? "🏆" : scorePct >= 75 ? "✅" : "❌";
  const wrongList = wrong.length > 0
    ? "\n\n📚 Ошибки:\n" + wrong.map((w, i) => `${i+1}. ${w.q.q}`).join("\n")
    : "";
  const text = `${emoji} Результат аттестации\n\n👤 ${name}\n📋 Должность: ${roleLabel}\n📊 Результат: ${Math.round(scorePct)}% (${correctCount}/${total})\n${passed ? "✅ Пройдено" : "❌ Не пройдено"}${scorePct >= 90 ? "\n🎉 Бонус +500 ₽" : ""}${wrongList}\n\n🕐 ${new Date().toLocaleString("ru-RU", {timeZone: "Europe/Moscow"})}`;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({chat_id: CHAT_ID, text, parse_mode: "HTML"})
    });
  } catch(e) {}
}



const COLORS = {
  purple: "#6A1B9A",
  purpleLight: "#9C27B0",
  purpleFade: "#F3E5F5",
  orange: "#E87C1E",
  orangeLight: "#FFF3E0",
  gray: "#F5F5F5",
  darkGray: "#374151",
  midGray: "#6B7280",
  lightBorder: "#E5E7EB",
  green: "#16A34A",
  greenBg: "#F0FDF4",
  red: "#DC2626",
  redBg: "#FEF2F2",
  yellow: "#D97706",
  yellowBg: "#FFFBEB",
};

function ScoreBadge({ score, passing }) {
  const pct = Math.round(score);
  let color, bg, label;
  if (pct >= 90) { color = COLORS.green; bg = COLORS.greenBg; label = "Отлично"; }
  else if (pct >= passing) { color = COLORS.purple; bg = COLORS.purpleFade; label = "Хорошо"; }
  else if (pct >= 60) { color = COLORS.yellow; bg = COLORS.yellowBg; label = "Удовлетворительно"; }
  else { color = COLORS.red; bg = COLORS.redBg; label = "Неудовлетворительно"; }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: bg, border: `1.5px solid ${color}`, borderRadius: 12, padding: "6px 16px" }}>
      <span style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

function RoleCard({ role, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 10, padding: "24px 16px", background: hovered ? role.color : "#fff",
        border: `2px solid ${hovered ? role.color : COLORS.lightBorder}`,
        borderRadius: 16, cursor: "pointer", transition: "all 0.18s ease",
        boxShadow: hovered ? `0 8px 24px ${role.color}33` : "0 2px 8px #0000000d",
        transform: hovered ? "translateY(-3px)" : "none",
        minHeight: 120,
      }}
    >
      <span style={{ fontSize: 36 }}>{role.icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: hovered ? "#fff" : COLORS.darkGray, textAlign: "center", lineHeight: 1.3 }}>
        {role.label}
      </span>
    </button>
  );
}

function ProgressBar({ current, total, color }) {
  const pct = (current / total) * 100;
  return (
    <div style={{ background: "#E5E7EB", borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.4s ease", borderRadius: 99 }} />
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home"); // home | quiz | result
  const [selectedRole, setSelectedRole] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [showNameScreen, setShowNameScreen] = useState(false);

  const quiz = selectedRole ? quizzes[selectedRole.id] : null;
  const question = quiz ? quiz.questions[current] : null;
  const role = selectedRole;

  function startQuiz(role) {
    setSelectedRole(role);
    setShowNameScreen(true);
    setNameInput("");
    setScreen("name");
  }

  function beginQuiz() {
    if (!nameInput.trim()) return;
    setName(nameInput.trim());
    setCurrent(0);
    setAnswers([]);
    setChosen(null);
    setConfirmed(false);
    setScreen("quiz");
  }

  function selectAnswer(idx) {
    if (confirmed) return;
    setChosen(idx);
  }

  function confirm() {
    if (chosen === null) return;
    setConfirmed(true);
    setTimeout(() => {
      const newAnswers = [...answers, { chosen, correct: quiz.questions[current].answer }];
      if (current + 1 < quiz.questions.length) {
        setAnswers(newAnswers);
        setCurrent(current + 1);
        setChosen(null);
        setConfirmed(false);
      } else {
        setAnswers(newAnswers);
        setScreen("result");
        const pct = (newAnswers.filter(a=>a.chosen===a.correct).length / quiz.questions.length) * 100;
        const wrong = newAnswers.map((a,i)=>({...a,q:quiz.questions[i]})).filter(a=>a.chosen!==a.correct);
        sendToTelegram(name || nameInput, role.label, pct, newAnswers.filter(a=>a.chosen===a.correct).length, quiz.questions.length, wrong);
      }
    }, 900);
  }

  function restart() {
    setScreen("home");
    setSelectedRole(null);
    setCurrent(0);
    setAnswers([]);
    setChosen(null);
    setConfirmed(false);
    setName("");
  }

  function retake() {
    setCurrent(0);
    setAnswers([]);
    setChosen(null);
    setConfirmed(false);
    setScreen("quiz");
  }

  // Result calculations
  const correctCount = answers.filter(a => a.chosen === a.correct).length;
  const scorePct = quiz ? (correctCount / quiz.questions.length) * 100 : 0;
  const passed = scorePct >= (quiz?.passingScore || 75);

  if (screen === "home") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3E5F5 0%, #fff 50%, #FFF3E0 100%)", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: COLORS.purple, borderRadius: 99, padding: "8px 20px", marginBottom: 20 }}>
              <span style={{ fontSize: 18 }}>✈️</span>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>Аэропорт · Папа'с Бар · Briski Coffee · Кафе Ель</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: COLORS.darkGray, margin: "0 0 12px", lineHeight: 1.2 }}>
              Ежемесячная аттестация
            </h1>
            <p style={{ color: COLORS.midGray, fontSize: 16, margin: 0, lineHeight: 1.6 }}>
              Выбери свою должность и пройди квиз по должностной инструкции.<br />
              20 вопросов · 5–7 минут · результат сразу
            </p>
          </div>

          {/* Role grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14, marginBottom: 40 }}>
            {roles.map(r => (
              <RoleCard key={r.id} role={r} onClick={() => startQuiz(r)} />
            ))}
          </div>

          {/* Info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { pct: "90–100%", label: "Отлично", sub: "Бонус +500 ₽", color: COLORS.green, bg: COLORS.greenBg },
              { pct: "75–89%", label: "Хорошо", sub: "Без бонуса", color: COLORS.purple, bg: COLORS.purpleFade },
              { pct: "< 60%", label: "Неудовлетворительно", sub: "Пересдача + обучение", color: COLORS.red, bg: COLORS.redBg },
            ].map((c, i) => (
              <div key={i} style={{ background: c.bg, border: `1.5px solid ${c.color}22`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.pct}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: COLORS.midGray }}>{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "name") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3E5F5 0%, #fff 100%)", fontFamily: "'Segoe UI', Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", boxShadow: "0 12px 40px #6A1B9A22", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{selectedRole?.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.darkGray, marginBottom: 6 }}>Квиз: {selectedRole?.label}</h2>
          <p style={{ color: COLORS.midGray, fontSize: 14, marginBottom: 28 }}>Введи своё имя для сохранения результата</p>
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && beginQuiz()}
            placeholder="Имя Фамилия"
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 16px", fontSize: 16,
              border: `2px solid ${nameInput ? COLORS.purple : COLORS.lightBorder}`, borderRadius: 10,
              outline: "none", marginBottom: 16, transition: "border 0.2s", fontFamily: "inherit",
            }}
          />
          <button
            onClick={beginQuiz}
            disabled={!nameInput.trim()}
            style={{
              width: "100%", padding: "14px", background: nameInput.trim() ? COLORS.purple : "#D1D5DB",
              color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700,
              cursor: nameInput.trim() ? "pointer" : "not-allowed", fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            Начать квиз →
          </button>
          <button onClick={restart} style={{ background: "none", border: "none", color: COLORS.midGray, fontSize: 13, cursor: "pointer", marginTop: 12, fontFamily: "inherit" }}>
            ← Назад
          </button>
        </div>
      </div>
    );
  }

  if (screen === "quiz" && question) {
    const isCorrect = confirmed && chosen === question.answer;
    const isWrong = confirmed && chosen !== question.answer;

    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        {/* Top bar */}
        <div style={{ background: role.color, padding: "16px 20px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{role.icon}</span>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{role.label}</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 600 }}>
                {current + 1} / {quiz.questions.length}
              </span>
            </div>
            <ProgressBar current={current + (confirmed ? 1 : 0)} total={quiz.questions.length} color="rgba(255,255,255,0.85)" />
            {name && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 6 }}>Сотрудник: {name}</div>}
          </div>
        </div>

        {/* Question */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 24px", boxShadow: "0 2px 16px #0000000d", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: role.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Вопрос {current + 1}
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.darkGray, margin: 0, lineHeight: 1.5 }}>
              {question.q}
            </p>
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {question.options.map((opt, i) => {
              let bg = "#fff", border = COLORS.lightBorder, textColor = COLORS.darkGray;
              if (chosen === i && !confirmed) { bg = `${role.color}12`; border = role.color; textColor = role.color; }
              if (confirmed && i === question.answer) { bg = COLORS.greenBg; border = COLORS.green; textColor = COLORS.green; }
              if (confirmed && chosen === i && i !== question.answer) { bg = COLORS.redBg; border = COLORS.red; textColor = COLORS.red; }

              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                    background: bg, border: `2px solid ${border}`, borderRadius: 12,
                    cursor: confirmed ? "default" : "pointer", textAlign: "left",
                    transition: "all 0.15s ease", fontFamily: "inherit",
                  }}
                >
                  <span style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
                    background: (confirmed && i === question.answer) ? COLORS.green : (confirmed && chosen === i && i !== question.answer) ? COLORS.red : (chosen === i ? role.color : "#E5E7EB"),
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                  }}>
                    {confirmed && i === question.answer ? "✓" : confirmed && chosen === i && i !== question.answer ? "✗" : String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 500, color: textColor, lineHeight: 1.4 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Confirm button */}
          {!confirmed ? (
            <button
              onClick={confirm}
              disabled={chosen === null}
              style={{
                width: "100%", padding: "15px", background: chosen !== null ? role.color : "#D1D5DB",
                color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700,
                cursor: chosen !== null ? "pointer" : "not-allowed", fontFamily: "inherit",
                transition: "background 0.2s",
              }}
            >
              Подтвердить ответ
            </button>
          ) : (
            <div style={{ textAlign: "center", padding: "12px", color: isCorrect ? COLORS.green : COLORS.red, fontWeight: 700, fontSize: 15 }}>
              {isCorrect ? "✓ Верно! Переходим к следующему..." : `✗ Неверно. Правильный ответ: ${String.fromCharCode(65 + question.answer)}`}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "result") {
    const wrongQuestions = answers
      .map((a, i) => ({ ...a, q: quiz.questions[i] }))
      .filter(a => a.chosen !== a.correct);

    let resultColor, resultBg, resultMsg, bonusMsg;
    if (scorePct >= 90) {
      resultColor = COLORS.green; resultBg = COLORS.greenBg;
      resultMsg = "Отличный результат!"; bonusMsg = "🎉 Бонус +500 ₽ к зарплате";
    } else if (scorePct >= (quiz.passingScore || 75)) {
      resultColor = COLORS.purple; resultBg = COLORS.purpleFade;
      resultMsg = "Хороший результат"; bonusMsg = "✅ Аттестация пройдена";
    } else if (scorePct >= 60) {
      resultColor = COLORS.yellow; resultBg = COLORS.yellowBg;
      resultMsg = "Удовлетворительно"; bonusMsg = "⚠️ Повторное прохождение через неделю";
    } else {
      resultColor = COLORS.red; resultBg = COLORS.redBg;
      resultMsg = "Неудовлетворительно"; bonusMsg = "❌ Обязательное обучение + пересдача";
    }

    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #F3E5F5 0%, #fff 100%)", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px" }}>
          {/* Header */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 4px 24px #0000001a", marginBottom: 20, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{role.icon}</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.darkGray, marginBottom: 4 }}>
              {quiz.title} — Результат
            </h2>
            {name && <div style={{ color: COLORS.midGray, fontSize: 14, marginBottom: 20 }}>{name}</div>}

            {/* Big score */}
            <div style={{ background: resultBg, border: `2px solid ${resultColor}33`, borderRadius: 16, padding: "24px", marginBottom: 20 }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: resultColor, lineHeight: 1 }}>
                {Math.round(scorePct)}%
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: resultColor, marginTop: 4 }}>{resultMsg}</div>
              <div style={{ fontSize: 20, marginTop: 10 }}>{bonusMsg}</div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              <div style={{ background: COLORS.greenBg, borderRadius: 12, padding: "14px 10px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.green }}>{correctCount}</div>
                <div style={{ fontSize: 12, color: COLORS.midGray }}>Верных</div>
              </div>
              <div style={{ background: COLORS.redBg, borderRadius: 12, padding: "14px 10px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.red }}>{quiz.questions.length - correctCount}</div>
                <div style={{ fontSize: 12, color: COLORS.midGray }}>Ошибок</div>
              </div>
              <div style={{ background: COLORS.purpleFade, borderRadius: 12, padding: "14px 10px" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.purple }}>{quiz.questions.length}</div>
                <div style={{ fontSize: 12, color: COLORS.midGray }}>Всего</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={retake}
                style={{ flex: 1, padding: "13px", background: role.color, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                Пройти заново
              </button>
              <button
                onClick={restart}
                style={{ flex: 1, padding: "13px", background: "#F3F4F6", color: COLORS.darkGray, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                ← На главную
              </button>
            </div>
          </div>

          {/* Errors breakdown */}
          {wrongQuestions.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "24px 24px", boxShadow: "0 4px 24px #0000001a" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: COLORS.darkGray, marginBottom: 16, marginTop: 0 }}>
                📚 Вопросы с ошибками — повтори материал
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {wrongQuestions.map((item, i) => (
                  <div key={i} style={{ background: COLORS.redBg, borderRadius: 12, padding: "14px 16px", borderLeft: `4px solid ${COLORS.red}` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.darkGray, marginBottom: 6 }}>{item.q.q}</div>
                    <div style={{ fontSize: 13, color: COLORS.red, marginBottom: 2 }}>
                      ✗ Твой ответ: {item.q.options[item.chosen]}
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.green, fontWeight: 600 }}>
                      ✓ Правильно: {item.q.options[item.correct]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
