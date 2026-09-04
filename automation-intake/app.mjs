const DESTINATION_EMAIL = "siriusa.paper@gmail.com";
const BASE_SUBJECT = "自動化候補のご相談";
const QUESTION_LABELS = Object.freeze([
  ["q1", "特に時間を減らしたい工程"],
  ["q2", "その作業の頻度と、およその所要時間"],
  ["q3", "現在使っているツールや管理方法"],
  ["q4", "必ず人が確認・承認したい部分"],
  ["q5", "最初に小さく試すなら対象にしたい作業"],
]);

export function cleanMultiline(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/g, ""))
    .join("\n")
    .trim();
}

export function cleanSingleLine(value, maximumCodePoints = 60) {
  return Array.from(
    String(value ?? "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
    .slice(0, maximumCodePoints)
    .join("");
}

export function collectAnswers(source) {
  const answers = {
    company: cleanSingleLine(source.company, 100),
    name: cleanSingleLine(source.name, 100),
    other: cleanMultiline(source.other),
  };
  for (const [key] of QUESTION_LABELS) {
    answers[key] = cleanMultiline(source[key]);
  }
  return answers;
}

export function hasAnyAnswer(answers) {
  return Object.values(answers).some((value) => value.length > 0);
}

export function buildSubject(answers) {
  return answers.company
    ? `${BASE_SUBJECT} — ${cleanSingleLine(answers.company)}`
    : BASE_SUBJECT;
}

export function formatAnswer(answers) {
  const lines = ["自動化候補のご相談"];

  if (answers.company) lines.push(`会社名／事業名：${answers.company}`);
  if (answers.name) lines.push(`お名前：${answers.name}`);

  const answeredQuestions = QUESTION_LABELS.filter(([key]) => answers[key]);
  if (answeredQuestions.length > 0) {
    lines.push("");
    for (const [key, label] of answeredQuestions) {
      const questionNumber = Number(key.slice(1));
      lines.push(`${questionNumber}. ${label}`, answers[key], "");
    }
    if (lines.at(-1) === "") lines.pop();
  }

  if (answers.other) {
    lines.push("", "その他、先に伝えておきたい条件", answers.other);
  }

  lines.push(
    "",
    "この回答は保存しないアンケート上で整形され、フォームから送信・保存されていません。",
  );
  return lines.join("\n");
}

export function buildMailtoUrl(answers) {
  const subject = encodeURIComponent(buildSubject(answers));
  const body = encodeURIComponent(formatAnswer(answers).replace(/\n/g, "\r\n"));
  return `mailto:${DESTINATION_EMAIL}?subject=${subject}&body=${body}`;
}

function formSource(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function setStatus(status, message, state = "") {
  status.textContent = message;
  if (state) status.dataset.state = state;
  else delete status.dataset.state;
}

function renderAnswer(resultPanel, resultField, answer) {
  resultField.value = answer;
  resultPanel.hidden = false;
}

function legacyCopy(text, resultField) {
  resultField.focus();
  resultField.select();
  return document.execCommand("copy");
}

export async function copyText(text, resultField) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }
  if (!legacyCopy(text, resultField)) {
    throw new Error("copy unavailable");
  }
}

export function initializeIntake(documentRoot = document) {
  const form = documentRoot.querySelector("#intake-form");
  const openMailButton = documentRoot.querySelector("#open-mail");
  const copyButton = documentRoot.querySelector("#copy-answer");
  const mailtoLauncher = documentRoot.querySelector("#mailto-launcher");
  const status = documentRoot.querySelector("#status");
  const resultPanel = documentRoot.querySelector("#result-panel");
  const resultField = documentRoot.querySelector("#formatted-answer");
  let mailLaunchLocked = false;

  function prepare() {
    const answers = collectAnswers(formSource(form));
    if (!hasAnyAnswer(answers)) {
      resultPanel.hidden = true;
      resultField.value = "";
      setStatus(status, "少なくとも一つ、分かる項目を入力してください。", "error");
      form.querySelector("input, textarea")?.focus();
      return null;
    }

    const formatted = formatAnswer(answers);
    renderAnswer(resultPanel, resultField, formatted);
    return { answers, formatted };
  }

  openMailButton.addEventListener("click", () => {
    if (mailLaunchLocked) return;
    const prepared = prepare();
    if (!prepared) return;

    mailLaunchLocked = true;
    openMailButton.disabled = true;
    mailtoLauncher.href = buildMailtoUrl(prepared.answers);
    setStatus(
      status,
      "メール下書きを開きます。開かない場合は、下の回答をコピーしてください。",
      "success",
    );
    mailtoLauncher.click();

    window.setTimeout(() => {
      mailLaunchLocked = false;
      openMailButton.disabled = false;
    }, 1200);
  });

  copyButton.addEventListener("click", async () => {
    const prepared = prepare();
    if (!prepared) return;

    copyButton.disabled = true;
    try {
      await copyText(prepared.formatted, resultField);
      setStatus(status, "回答をコピーしました。普段のメールに貼り付けて送れます。", "success");
    } catch {
      resultField.focus();
      resultField.select();
      setStatus(status, "自動コピーが使えませんでした。選択済みの回答を手動でコピーしてください。", "error");
    } finally {
      copyButton.disabled = false;
    }
  });

  form.addEventListener("submit", (event) => event.preventDefault());
}

if (typeof document !== "undefined") {
  initializeIntake(document);
}

export { BASE_SUBJECT, DESTINATION_EMAIL, QUESTION_LABELS };
