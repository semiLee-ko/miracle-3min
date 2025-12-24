# LLMs 사용하기 | 앱인토스 개발자센터

Source: https://developers-apps-in-toss.toss.im/development/llms.html

## 1. 문서 URL 등록하기 (@docs)
앱인토스 문서를 AI에 연결하려면 Cursor의 Docs 인덱싱 기능을 사용하세요.

**추가할 수 있는 문서 URL:**
- `https://developers-apps-in-toss.toss.im/llms.txt`
- `https://developers-apps-in-toss.toss.im/llms-full.txt`
- `https://developers-apps-in-toss.toss.im/tutorials/examples.md`
- `https://tossmini-docs.toss.im/tds-mobile/llms-full.txt`
- `https://tossmini-docs.toss.im/tds-react-native/llms-full.txt`

## 2. 문서를 기반으로 AI 활용하기
문서를 등록하면 AI가 해당 문서를 기반으로 더 정확한 답변을 생성할 수 있어요. 특히 Cursor에서는 @docs 명령을 사용하여 지정된 문서를 우선적으로 참고하도록 요청할 수 있어요.

@docs는 언제 사용하나요?
- SDK처럼 정확한 규칙 기반 코드가 필요한 경우
- 문서 기반 의존도가 높은 기능을 사용할 때
- AI에게 “문서를 기반으로 답변해 달라”고 명확히 전달하고 싶을 때

## 3. MCP(Model Context Protocol) 서버 사용하기
Cursor는 MCP(Model Context Protocol) 를 지원해요. MCP는 IDE와 AI 모델 사이에서 프로젝트 정보를 더 구조적으로 전달하는 표준 프로토콜로, AI가 코드베이스의 맥락을 더 깊이 이해할 수 있도록 도와주는 역할을 해요.

**설치하기 (Mac/Linux/Windows via Scoop):**
```bash
# Mac
brew tap toss/tap && brew install ax

# Windows
scoop bucket add toss https://github.com/toss/scoop-bucket.git
scoop install ax
```

**Cursor에 MCP 서버 연결하기 (.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "apps-in-toss": {
      "command": "ax",
      "args": [
        "mcp",
        "start"
      ]
    }
  }
}
```
