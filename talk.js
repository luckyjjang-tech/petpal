/* 펫팔 대화 기능 — 자리만 만들어 둔 파일 (지금은 꺼져 있음)
   ─────────────────────────────────────────────────────────────
   지금 앱은 대화 기능 없이 짧은 반응(말풍선)만 합니다. 형님이 "대화 기능을
   켜자"고 정하시면, 이 파일 하나와 app.js의 스위치 하나만 바꾸면 됩니다.

   ▶ 켜는 방법 (2단계)
     1) 아래 PETPAL_TALK 함수 안에서 원하는 AI 서비스(예: OpenAI, Google Gemini)를
        부르고, 아이가 할 짧은 대답을 문자열로 돌려주게 한다.
        ※ API 키는 절대 이 저장소에 올리지 않는다. (공개 저장소입니다)
     2) app.js 맨 위 CONFIG.talk.enabled 를 true 로 바꾼다.

   ▶ 지켜야 할 것
     · 아이는 유창하게 말하지 않는다. 한두 마디, 아기 동물처럼. (예: "냐옹?", "꼬리 살랑")
     · 이름을 아직 배우기 전(calls < callsToLearn)에는 대화도 알아듣지 못한 척한다.
     · 벌·죽음·떠남 이야기는 넣지 않는다.
*/

window.PETPAL_TALK = null;

/* 예시 (그대로는 동작하지 않습니다 — 키가 없기 때문입니다)

window.PETPAL_TALK = async function (text) {
  // text: 사용자가 입력한 말
  var res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + '여기에-키를-넣지-말고-서버에서-불러오기'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '너는 갓 태어난 새끼 강아지다. 한두 마디로만 짧게 반응한다.' },
        { role: 'user', content: text }
      ]
    })
  });
  var data = await res.json();
  return data.choices[0].message.content.slice(0, 40);
};

※ 브라우저에서 키를 그대로 쓰면 누구나 볼 수 있으므로, 실제 서비스에서는
   작은 서버(Cloudflare Workers 등)를 두고 그 서버가 키를 갖게 한다.
*/
