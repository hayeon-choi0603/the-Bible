const STORAGE_KEY = 'bible_translator_api_key';

document.getElementById('input').addEventListener('input', function () {
  document.getElementById('charCount').textContent = `${this.value.length} / 200`;
});

document.getElementById('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    translate();
  }
});

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('apiDropdown');
  if (!dropdown.contains(e.target) && !e.target.closest('.btn-api')) {
    dropdown.classList.remove('open');
  }
});

function toggleApi() {
  const d = document.getElementById('apiDropdown');
  d.classList.toggle('open');
  if (d.classList.contains('open')) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) document.getElementById('apiKeyInput').value = saved;
  }
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key.startsWith('AIza')) {
    showError('올바른 Gemini API 키를 입력하소서 (AIzaSy로 시작)');
    return;
  }
  localStorage.setItem(STORAGE_KEY, key);
  document.getElementById('apiDropdown').classList.remove('open');
  showError('');
}

function showError(msg) {
  const bar = document.getElementById('errorBar');
  if (msg) {
    bar.textContent = msg;
    bar.classList.add('visible');
  } else {
    bar.classList.remove('visible');
  }
}

async function translate() {
  const input = document.getElementById('input').value.trim();
  const apiKey = localStorage.getItem(STORAGE_KEY) || '';

  if (!input) { showError('번역할 내용을 입력하소서'); return; }
  if (!apiKey) {
    showError('먼저 API 키를 설정하소서 (우측 상단 🔑 버튼)');
    document.getElementById('apiDropdown').classList.add('open');
    return;
  }

  const btn = document.getElementById('translateBtn');
  const outputText = document.getElementById('outputText');
  const verseRef = document.getElementById('verseRef');

  btn.disabled = true;
  showError('');
  outputText.innerHTML = '<div class="loading-wrap"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  verseRef.textContent = '';

  const prompt = `너는 현대인의 일상적인 푸념이나 불평을 한국어 성경(개역개정) 특유의 고풍스러운 어투로 번역하는 재미있는 번역기야.

규칙:
1. 반드시 한국어 개역개정 성경체를 사용해 (~하였나이다, ~하도다, ~하리로다, ~하노라, ~하였더라 등)
2. 원래 감정/상황은 유지하되, 극적이고 웅장하게 표현해
3. 번역 결과만 1~3문장으로 출력해 (설명 없이)
4. 마지막 줄에 "[가상의 성경 책 이름 장:절]" 형식으로 출처를 지어내 (실제 성경 구절 X, 재미를 위해 창작)
5. 번역 결과와 출처를 빈 줄로 구분해

입력: "${input}"`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300 }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 400 || res.status === 401) throw new Error('API 키가 유효하지 아니하도다. 다시 확인하소서.');
      if (res.status === 429) throw new Error('잠시 기다리라. 너무 많이 구하였느니라.');
      throw new Error(err.error?.message || `오류가 임하였도다 (${res.status})`);
    }

    const data = await res.json();
    const fullText = data.candidates[0].content.parts[0].text.trim();

    const lines = fullText.split('\n').filter(l => l.trim());
    const refLine = lines[lines.length - 1];
    const isRef = /\[.+\d+:\d+\]/.test(refLine);

    if (isRef) {
      outputText.textContent = lines.slice(0, -1).join('\n');
      verseRef.textContent = refLine;
    } else {
      outputText.textContent = fullText;
      verseRef.textContent = '';
    }

  } catch (e) {
    outputText.innerHTML = '<span class="output-placeholder">번역 결과가 여기 나타나리라</span>';
    showError(e.message || '알 수 없는 오류가 임하였도다');
  } finally {
    btn.disabled = false;
  }
}
