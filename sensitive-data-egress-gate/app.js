(() => {
  'use strict';

  const translations = [...document.querySelectorAll('[data-en]')].map(element => ({
    element,
    ja: element.textContent,
    en: element.dataset.en
  }));
  const accessibleLabels = [...document.querySelectorAll('[data-en-aria-label]')].map(element => ({
    element,
    ja: element.getAttribute('aria-label'),
    en: element.dataset.enAriaLabel
  }));
  const metadata = {
    ja: {
      title: 'Sensitive Data Egress Gate｜最大被害量を設計する',
      description: '1つの認証情報が悪用されたとき、何件の機微データまで到達できるか。認証後の取得量・時間・承認・送信先を設計し、一度の事故で失える最大量を制限します。',
      ogDescription: '認証を守るだけでなく、破られた後の最大被害量を設計する。取得量・時間・承認・送信先から、全量到達の条件を整理します。',
      emailSubject: 'Sensitive Data Egress Gate の相談',
      languageStatus: '表示言語を日本語に切り替えました。'
    },
    en: {
      title: 'Sensitive Data Egress Gate | Design the Maximum Loss',
      description: 'If one credential is misused, how much sensitive data could it reach? Design volume, time, approval, and destination limits to bound the data exposed by one incident.',
      ogDescription: 'Protect credentials. Design the maximum loss if access is abused. Map full-data access conditions across volume, time, approval, and destination.',
      emailSubject: 'Sensitive Data Egress Gate enquiry',
      languageStatus: 'Page language changed to English.'
    }
  };
  const nextChecks = {
    ja: [
      ['全量までの経路を確認する', '1つの権限で取得できる範囲は何件ですか。通常の業務に必要な範囲と、全量取得の条件を分けられますか。'],
      ['繰り返し取得した場合を確認する', '1回の上限を守って取得を繰り返すと、一定時間内に合計で何件まで届きますか。'],
      ['量以外の取得許可の条件を確認する', '上限を超える業務では、誰の承認が必要ですか。送信先や待機時間の条件も定まっていますか。'],
      ['全量取得と例外経路を確認する', '大量取得の制御とは別に、全量取得の条件は定まっていますか。権限変更直後や緊急経路でも、その条件は保たれますか。'],
      ['設計と実装の一致を確認する', '複数承認・時間制約・専用経路が、例外時にも設計どおり働くかを確認していますか。確認済みの範囲と未確認事項を整理できますか。']
    ],
    en: [
      ['Map the path to full extraction', 'How many records can one credential reach? Can ordinary operational access be separated from the conditions for full extraction?'],
      ['Check what repeated requests can reach', 'If requests stay within the per-request cap, how many records can they reach in total over a defined period?'],
      ['Check the conditions beyond volume', 'When work requires more than the limit, whose approval is needed? Are destinations and waiting periods defined, too?'],
      ['Check full extraction and exception paths', 'Are full-extraction conditions defined separately from large-export controls? Do they still hold immediately after a privilege change or through an emergency path?'],
      ['Check that implementation matches design', 'Have multi-party approval, time constraints, and the dedicated route been verified under exceptional conditions? Can you separate what has been verified from what remains unknown?']
    ]
  };

  const result = document.getElementById('check-result');
  const languageButtons = [...document.querySelectorAll('[data-language]')];
  const copyButton = document.getElementById('copy-ai-prompt');
  const copyStatus = document.getElementById('ai-copy-status');
  const copyMessages = {
    ja: { success: 'コピーしました', manual: '文章を選択しました。⌘C / Ctrl+C、または選択メニューでコピーしてください。' },
    en: { success: 'Copied', manual: 'Prompt selected. Copy with ⌘C / Ctrl+C, or use the selection menu.' }
  };
  let language = 'ja';

  function copyWithSelection(prompt) {
    const details = prompt.closest('details');
    const wasOpen = details.open;
    details.open = true;
    prompt.focus({ preventScroll: true });
    prompt.select();
    prompt.setSelectionRange(0, prompt.value.length);
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      // Keep the visible selection available for a manual copy.
    }
    if (copied) {
      details.open = wasOpen;
    } else {
      prompt.scrollIntoView({ block: 'center' });
    }
    return copied;
  }

  async function copyPrompt() {
    const requestedLanguage = language;
    const prompt = document.getElementById(`ai-prompt-${requestedLanguage}`);
    let copied = false;
    let usedSelection = false;
    copyButton.disabled = true;
    copyStatus.textContent = '';
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(prompt.value);
          copied = true;
        } catch {
          // Restricted clipboard access falls back to a selectable prompt.
        }
      }
      if (!copied && language === requestedLanguage) {
        usedSelection = true;
        copied = copyWithSelection(prompt);
      }
      if (language === requestedLanguage) {
        copyStatus.textContent = copied ? copyMessages[language].success : copyMessages[language].manual;
      } else if (copied) {
        copyStatus.textContent = language === 'ja' ? '英語の文章をコピーしました。' : 'Copied the Japanese prompt.';
      }
    } finally {
      copyButton.disabled = false;
      if (usedSelection && copied) copyButton.focus({ preventScroll: true });
    }
  }

  function languageFromURL() {
    return new URL(window.location.href).searchParams.get('lang') === 'en' ? 'en' : 'ja';
  }

  function updateResult() {
    const selected = document.querySelector('input[name="egress-level"]:checked');
    if (!selected) {
      result.hidden = true;
      return;
    }
    const level = Number(selected.value);
    const [title, question] = nextChecks[language][level - 1];
    document.getElementById('result-level').textContent = language === 'ja' ? `段階 0${level} / 次に確認する条件` : `LEVEL 0${level} / WHAT TO CHECK NEXT`;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-question').textContent = question;
    result.hidden = false;
  }

  function setLanguage(nextLanguage, { updateURL = false, announce = false } = {}) {
    language = nextLanguage === 'en' ? 'en' : 'ja';
    document.documentElement.lang = language;
    copyStatus.textContent = '';
    translations.forEach(({ element, ...text }) => { element.textContent = text[language]; });
    accessibleLabels.forEach(({ element, ...labels }) => { element.setAttribute('aria-label', labels[language]); });
    languageButtons.forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.language === language)); });
    document.title = metadata[language].title;
    document.querySelector('meta[name="description"]').content = metadata[language].description;
    document.querySelector('meta[property="og:title"]').content = metadata[language].title;
    document.querySelector('meta[property="og:description"]').content = metadata[language].ogDescription;
    document.querySelectorAll('[data-contact-email]').forEach(link => {
      link.href = `mailto:siriusa.paper@gmail.com?subject=${encodeURIComponent(metadata[language].emailSubject)}`;
    });
    document.querySelectorAll('[data-sample-pdf]').forEach(link => {
      link.href = language === 'en' ? link.dataset.enHref : link.dataset.jaHref;
      link.hreflang = language;
    });
    updateResult();
    if (updateURL) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', language);
      try {
        window.history.replaceState(null, '', url);
      } catch {
        // Language switching still works when the browser disallows history changes.
      }
    }
    if (announce) {
      document.getElementById('language-status').textContent = metadata[language].languageStatus;
    }
  }

  languageButtons.forEach(button => {
    button.addEventListener('click', () => setLanguage(button.dataset.language, { updateURL: true, announce: true }));
  });
  document.querySelectorAll('input[name="egress-level"]').forEach(input => {
    input.addEventListener('change', updateResult);
  });
  window.addEventListener('popstate', () => setLanguage(languageFromURL()));
  copyButton.addEventListener('click', copyPrompt);
  setLanguage(languageFromURL());
  document.querySelector('.language-switch').hidden = false;
  copyButton.hidden = false;
})();
